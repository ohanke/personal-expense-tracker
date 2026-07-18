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
    },
  },
}));

const {
  THRESHOLDS,
  getAlertThresholds,
  calculateBudgetSummary,
  getAlertsToSend,
  recordAlertSent,
  handleClientMessage,
} = require('../../src/websocket/budgetAlerts');
const { prisma } = require('../../src/utils/prisma');

describe('Budget Alerts WebSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAlertThresholds', () => {
    it('should return no thresholds when below 50%', () => {
      const thresholds = getAlertThresholds(25);
      expect(thresholds).toEqual([]);
    });

    it('should return 50 when at 50%', () => {
      const thresholds = getAlertThresholds(50);
      expect(thresholds).toEqual([50]);
    });

    it('should return 50 when between 50% and 80%', () => {
      const thresholds = getAlertThresholds(65);
      expect(thresholds).toEqual([50]);
    });

    it('should return 50 and 80 when at 80%', () => {
      const thresholds = getAlertThresholds(80);
      expect(thresholds).toEqual([50, 80]);
    });

    it('should return all thresholds when at 100%', () => {
      const thresholds = getAlertThresholds(100);
      expect(thresholds).toEqual([50, 80, 100]);
    });

    it('should return all thresholds when overspent (>100%)', () => {
      const thresholds = getAlertThresholds(120);
      expect(thresholds).toEqual([50, 80, 100]);
    });
  });

  describe('calculateBudgetSummary', () => {
    it('should calculate summary with budget and transactions', async () => {
      const budget = { id: 'b1', amount: 5000 };
      const transactions = [
        { amount: 1000 },
        { amount: 1500 },
      ];

      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue(transactions);

      const result = await calculateBudgetSummary('user-1', '2026-07');

      expect(result.budgetAmount).toBe(5000);
      expect(result.spent).toBe(2500);
      expect(result.percentageUsed).toBe(50);
      expect(result.budget).toEqual(budget);
    });

    it('should return null percentageUsed when no budget', async () => {
      prisma.budget.findUnique.mockResolvedValue(null);
      prisma.transaction.findMany.mockResolvedValue([
        { amount: 1000 },
      ]);

      const result = await calculateBudgetSummary('user-1', '2026-07');

      expect(result.budgetAmount).toBe(null);
      expect(result.spent).toBe(1000);
      expect(result.percentageUsed).toBe(null);
    });

    it('should return 0 spent when no transactions', async () => {
      const budget = { id: 'b1', amount: 5000 };
      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue([]);

      const result = await calculateBudgetSummary('user-1', '2026-07');

      expect(result.spent).toBe(0);
      expect(result.percentageUsed).toBe(0);
    });

    it('should query transactions for correct month', async () => {
      prisma.budget.findUnique.mockResolvedValue(null);
      prisma.transaction.findMany.mockResolvedValue([]);

      await calculateBudgetSummary('user-1', '2026-07');

      const callArgs = prisma.transaction.findMany.mock.calls[0][0];
      expect(callArgs.where.user_id).toBe('user-1');
      expect(callArgs.where.date.gte).toBeDefined();
      expect(callArgs.where.date.lte).toBeDefined();
    });

    it('should handle overspending correctly', async () => {
      const budget = { id: 'b1', amount: 5000 };
      const transactions = [
        { amount: 3000 },
        { amount: 2500 },
      ];

      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue(transactions);

      const result = await calculateBudgetSummary('user-1', '2026-07');

      expect(result.spent).toBe(5500);
      expect(result.percentageUsed).toBe(110);
    });
  });

  describe('getAlertsToSend', () => {
    it('should return empty array when percentageUsed is null', async () => {
      const result = await getAlertsToSend('user-1', '2026-07', null);
      expect(result).toEqual([]);
    });

    it('should return empty array when no budget set', async () => {
      prisma.budget.findUnique.mockResolvedValue(null);

      const result = await getAlertsToSend('user-1', '2026-07', 60);
      expect(result).toEqual([]);
    });

    it('should return 50% alert when not previously sent', async () => {
      const budget = { id: 'b1', amount: 5000 };
      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.budgetAlert.findUnique.mockResolvedValue(null);

      const result = await getAlertsToSend('user-1', '2026-07', 60);

      expect(result).toHaveLength(1);
      expect(result[0].threshold).toBe(50);
      expect(result[0].percentageUsed).toBe(60);
    });

    it('should not return 50% alert if already sent', async () => {
      const budget = { id: 'b1', amount: 5000 };
      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.budgetAlert.findUnique.mockResolvedValue({ id: 'alert-1', threshold: 50 });

      const result = await getAlertsToSend('user-1', '2026-07', 60);

      expect(result).toHaveLength(0);
    });

    it('should return multiple alerts when multiple thresholds triggered', async () => {
      const budget = { id: 'b1', amount: 5000 };
      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.budgetAlert.findUnique.mockResolvedValue(null);

      const result = await getAlertsToSend('user-1', '2026-07', 95);

      expect(result).toHaveLength(2);
      expect(result.map(a => a.threshold)).toEqual([50, 80]);
    });

    it('should return only unsent thresholds', async () => {
      const budget = { id: 'b1', amount: 5000 };
      prisma.budget.findUnique.mockResolvedValue(budget);

      prisma.budgetAlert.findUnique
        .mockResolvedValueOnce(null) // 50% not sent
        .mockResolvedValueOnce({ id: 'alert-1', threshold: 80 }); // 80% sent

      const result = await getAlertsToSend('user-1', '2026-07', 95);

      expect(result).toHaveLength(1);
      expect(result[0].threshold).toBe(50);
    });

    it('should return 100% alert when at 100%', async () => {
      const budget = { id: 'b1', amount: 5000 };
      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.budgetAlert.findUnique.mockResolvedValue(null);

      const result = await getAlertsToSend('user-1', '2026-07', 100);

      expect(result).toHaveLength(3);
      expect(result.map(a => a.threshold)).toEqual([50, 80, 100]);
    });

    it('should enforce once-per-threshold-per-month rule', async () => {
      const budget = { id: 'b1', amount: 5000 };
      prisma.budget.findUnique.mockResolvedValue(budget);

      // Simulate 50% alert already sent
      prisma.budgetAlert.findUnique.mockImplementation(({ where }) => {
        if (where.budget_id_threshold.threshold === 50) {
          return Promise.resolve({ id: 'alert-1', threshold: 50 });
        }
        return Promise.resolve(null);
      });

      const result = await getAlertsToSend('user-1', '2026-07', 80);

      // At 80%, thresholds are [50, 80]. Since 50% alert already sent, should only return 80%
      expect(result.map(a => a.threshold)).toEqual([80]);
    });
  });

  describe('recordAlertSent', () => {
    it('should create budget alert record', async () => {
      prisma.budgetAlert.create.mockResolvedValue({
        id: 'alert-1',
        budget_id: 'b1',
        user_id: 'user-1',
        threshold: 50,
      });

      await recordAlertSent('b1', 'user-1', 50);

      expect(prisma.budgetAlert.create).toHaveBeenCalledWith({
        data: {
          budget_id: 'b1',
          user_id: 'user-1',
          threshold: 50,
        },
      });
    });
  });

  describe('handleClientMessage', () => {
    it('should handle acknowledge_alert message', async () => {
      const message = JSON.stringify({ type: 'acknowledge_alert' });
      const response = await handleClientMessage(message);

      expect(response).toEqual({
        type: 'ack_received',
        message: 'Alert acknowledged',
      });
    });

    it('should return null for unknown message type', async () => {
      const message = JSON.stringify({ type: 'unknown' });
      const response = await handleClientMessage(message);

      expect(response).toBe(null);
    });

    it('should return null for invalid JSON', async () => {
      const response = await handleClientMessage('invalid json');

      expect(response).toBe(null);
    });
  });

  describe('THRESHOLDS constant', () => {
    it('should have correct thresholds', () => {
      expect(THRESHOLDS).toEqual([50, 80, 100]);
    });
  });
});
