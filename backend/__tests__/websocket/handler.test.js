jest.mock('../../src/utils/prisma', () => ({
  prisma: {
    budget: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../src/websocket/budgetAlerts', () => ({
  calculateBudgetSummary: jest.fn(),
  getAlertsToSend: jest.fn(),
  recordAlertSent: jest.fn(),
  handleClientMessage: jest.fn(),
}));

const { setupWebSocketServer, getCurrentMonth } = require('../../src/websocket/handler');
const { calculateBudgetSummary, getAlertsToSend, handleClientMessage } = require('../../src/websocket/budgetAlerts');

describe('WebSocket Handler', () => {
  let mockServer;
  let mockSocket;
  let mockRequest;
  let upgradeHandler;
  let connectionHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      write: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn((event, handler) => {
        if (event === 'message') mockSocket.messageHandler = handler;
        if (event === 'close') mockSocket.closeHandler = handler;
        if (event === 'error') mockSocket.errorHandler = handler;
      }),
      send: jest.fn(),
      close: jest.fn(),
    };

    mockRequest = {
      headers: {
        cookie: 'connect.sid=session123; path=/',
      },
      session: {
        passport: {
          user: 'user-123',
        },
      },
    };

    mockServer = {
      on: jest.fn((event, handler) => {
        if (event === 'upgrade') upgradeHandler = handler;
      }),
    };

    // Mock WebSocket.Server globally
    const mockWss = {
      handleUpgrade: jest.fn((req, socket, head, cb) => {
        cb(mockSocket);
      }),
      on: jest.fn((event, handler) => {
        if (event === 'connection') connectionHandler = handler;
      }),
      emit: jest.fn(),
    };

    require('ws').Server = jest.fn(() => mockWss);

    setupWebSocketServer(mockServer);
  });

  describe('setupWebSocketServer', () => {
    it('should register upgrade handler', () => {
      expect(mockServer.on).toHaveBeenCalledWith('upgrade', expect.any(Function));
    });
  });

  describe('WebSocket Connection - Session Check', () => {
    it('should reject upgrade without session.sid cookie', () => {
      const reqNoSession = {
        headers: { cookie: 'other=value' },
      };

      upgradeHandler(reqNoSession, mockSocket, Buffer.from(''));

      expect(mockSocket.write).toHaveBeenCalledWith('HTTP/1.1 401 Unauthorized\r\n\r\n');
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('should reject upgrade without any cookies', () => {
      const reqNoHeaders = { headers: {} };

      upgradeHandler(reqNoHeaders, mockSocket, Buffer.from(''));

      expect(mockSocket.write).toHaveBeenCalledWith('HTTP/1.1 401 Unauthorized\r\n\r\n');
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('should allow upgrade with valid session.sid', () => {
      upgradeHandler(mockRequest, mockSocket, Buffer.from(''));
      expect(mockSocket.write).not.toHaveBeenCalled();
      expect(mockSocket.destroy).not.toHaveBeenCalled();
    });
  });

  describe('WebSocket Connection - Authorization', () => {
    it('should close connection without userId in session', async () => {
      const reqNoUser = {
        headers: { cookie: 'connect.sid=session123' },
        session: { passport: {} },
      };

      calculateBudgetSummary.mockResolvedValue({ percentageUsed: 0 });
      getAlertsToSend.mockResolvedValue([]);

      upgradeHandler(mockRequest, mockSocket, Buffer.from(''));
      connectionHandler(mockSocket, reqNoUser);

      await new Promise(r => setTimeout(r, 10));
      expect(mockSocket.close).toHaveBeenCalledWith(1008, 'Unauthorized');
    });

    it('should accept connection with valid userId', async () => {
      calculateBudgetSummary.mockResolvedValue({ percentageUsed: 45 });
      getAlertsToSend.mockResolvedValue([]);

      upgradeHandler(mockRequest, mockSocket, Buffer.from(''));
      connectionHandler(mockSocket, mockRequest);

      await new Promise(r => setTimeout(r, 10));
      expect(mockSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('Budget Alerts on Connection', () => {
    it('should fetch budget summary and send alerts on connection', async () => {
      calculateBudgetSummary.mockResolvedValue({
        percentageUsed: 82,
        budgetAmount: 1000,
      });
      getAlertsToSend.mockResolvedValue([
        {
          threshold: 80,
          percentageUsed: 82,
          budgetAmount: 1000,
        },
      ]);

      upgradeHandler(mockRequest, mockSocket, Buffer.from(''));
      connectionHandler(mockSocket, mockRequest);

      await new Promise(r => setTimeout(r, 20));

      expect(calculateBudgetSummary).toHaveBeenCalledWith('user-123', expect.any(String));
      expect(getAlertsToSend).toHaveBeenCalled();
      expect(mockSocket.send).toHaveBeenCalledWith(expect.stringContaining('budget_alert'));
    });

    it('should not send alerts if no budget set', async () => {
      calculateBudgetSummary.mockResolvedValue({
        percentageUsed: null,
      });
      getAlertsToSend.mockResolvedValue([]);

      upgradeHandler(mockRequest, mockSocket, Buffer.from(''));
      connectionHandler(mockSocket, mockRequest);

      await new Promise(r => setTimeout(r, 10));

      expect(mockSocket.send).not.toHaveBeenCalled();
    });

    it('should handle error during alert fetch gracefully', async () => {
      calculateBudgetSummary.mockRejectedValue(new Error('DB error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      upgradeHandler(mockRequest, mockSocket, Buffer.from(''));
      connectionHandler(mockSocket, mockRequest);

      await new Promise(r => setTimeout(r, 10));

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockSocket.close).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Client Messages', () => {
    it('should handle message from connected client', async () => {
      calculateBudgetSummary.mockResolvedValue({ percentageUsed: 50 });
      getAlertsToSend.mockResolvedValue([]);
      handleClientMessage.mockResolvedValue(null);

      upgradeHandler(mockRequest, mockSocket, Buffer.from(''));
      connectionHandler(mockSocket, mockRequest);

      await new Promise(r => setTimeout(r, 10));

      const messageData = JSON.stringify({ type: 'acknowledge_alert' });
      mockSocket.messageHandler(messageData);

      await new Promise(r => setTimeout(r, 5));
      expect(handleClientMessage).toHaveBeenCalled();
    });

    it('should send message data to handleClientMessage handler', async () => {
      calculateBudgetSummary.mockResolvedValue({ percentageUsed: 50 });
      getAlertsToSend.mockResolvedValue([]);
      handleClientMessage.mockResolvedValue(null);

      upgradeHandler(mockRequest, mockSocket, Buffer.from(''));
      connectionHandler(mockSocket, mockRequest);

      await new Promise(r => setTimeout(r, 10));

      const messageData = JSON.stringify({ type: 'acknowledge_alert' });
      mockSocket.messageHandler(messageData);

      await new Promise(r => setTimeout(r, 5));
      expect(handleClientMessage).toHaveBeenCalledWith(messageData);
    });
  });

  describe('Client Disconnect', () => {
    it('should handle close event', async () => {
      calculateBudgetSummary.mockResolvedValue({ percentageUsed: 50 });
      getAlertsToSend.mockResolvedValue([]);

      upgradeHandler(mockRequest, mockSocket, Buffer.from(''));
      connectionHandler(mockSocket, mockRequest);

      await new Promise(r => setTimeout(r, 10));

      mockSocket.closeHandler();
      // Should clean up without error
      expect(mockSocket.on).toHaveBeenCalled();
    });

    it('should handle error event', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      calculateBudgetSummary.mockResolvedValue({ percentageUsed: 50 });
      getAlertsToSend.mockResolvedValue([]);

      upgradeHandler(mockRequest, mockSocket, Buffer.from(''));
      connectionHandler(mockSocket, mockRequest);

      await new Promise(r => setTimeout(r, 10));

      mockSocket.errorHandler(new Error('Socket error'));
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getCurrentMonth', () => {
    it('should return current month in YYYY-MM format', () => {
      const month = getCurrentMonth();
      const regex = /^\d{4}-\d{2}$/;
      expect(month).toMatch(regex);
    });

    it('should have valid month number', () => {
      const month = getCurrentMonth();
      const parts = month.split('-');
      const monthNum = parseInt(parts[1]);
      expect(monthNum).toBeGreaterThanOrEqual(1);
      expect(monthNum).toBeLessThanOrEqual(12);
    });
  });
});
