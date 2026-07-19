const {
  getAlertThresholds,
  calculateBudgetSummary,
  getAlertsToSend,
  recordAlertSent,
  handleClientMessage,
} = require('../../src/websocket/budgetAlerts');
const { prisma } = require('../../src/utils/prisma');

jest.mock('../../src/utils/prisma', () => ({
  prisma: {
    budget: {
      findUnique: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
    budgetAlert: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(), // Dodano dla czyszczenia bazy
    },
  },
}));

describe('Budget Alerts WebSocket', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.budgetAlert.deleteMany({}); // Czyścimy bazę przed każdym testem
  });

  describe('getAlertThresholds', () => {
    it('should return no thresholds when below 50%', () => {
      expect(getAlertThresholds(25)).toEqual([]);
    });

    it('should return 50 when at 50%', () => {
      expect(getAlertThresholds(50)).toEqual([50]);
    });

    it('should return 50 and 80 when at 80%', () => {
      expect(getAlertThresholds(80)).toEqual([50, 80]);
    });

    it('should return all thresholds when at 100%', () => {
      expect(getAlertThresholds(100)).toEqual([50, 80, 100]);
    });
  });

  describe('calculateBudgetSummary', () => {
    it('should calculate summary correctly', async () => {
      const budget = { id: 'b1', amount: 5000 };
      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue([{ amount: 1000 }, { amount: 1500 }]);

      const result = await calculateBudgetSummary('user-1', '2026-07');
      expect(result.percentageUsed).toBe(50);
    });
  });

  describe('getAlertsToSend', () => {
    it('should return 50% alert when not previously sent', async () => {
      const budget = { id: 'b1', amount: 5000 };
      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.budgetAlert.findUnique.mockResolvedValue(null);

      const result = await getAlertsToSend('user-1', '2026-07', 60);
      expect(result[0].threshold).toBe(50);
    });

    it('should enforce once-per-threshold rule using mockImplementation', async () => {
      const budget = { id: 'b1', amount: 5000 };
      prisma.budget.findUnique.mockResolvedValue(budget);

      // Naprawiona obsługa mocka dla composite key
      prisma.budgetAlert.findUnique.mockImplementation(({ where }) => {
        if (where && where.budget_id_threshold && where.budget_id_threshold.threshold === 50) {
          return Promise.resolve({ id: 'alert-1', threshold: 50 });
        }
        return Promise.resolve(null);
      });

      const result = await getAlertsToSend('user-1', '2026-07', 80);
      expect(result.map(a => a.threshold)).toEqual([80]);
    });
  });

  describe('recordAlertSent', () => {
    it('should create budget alert record', async () => {
      await recordAlertSent('b1', 'user-1', 50);
      expect(prisma.budgetAlert.create).toHaveBeenCalledWith({
        data: { budget_id: 'b1', user_id: 'user-1', threshold: 50 },
      });
    });
  });

  describe('handleClientMessage', () => {
    it('should handle acknowledge_alert', async () => {
      const response = await handleClientMessage(JSON.stringify({ type: 'acknowledge_alert' }));
      expect(response.type).toBe('ack_received');
    });

    it('should return null for invalid JSON', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const response = await handleClientMessage('invalid json');
      expect(response).toBe(null);
      spy.mockRestore();
    });
  });
});