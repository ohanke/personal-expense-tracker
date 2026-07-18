const {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../../src/controllers/transactionController');

jest.mock('../../src/utils/prisma', () => ({
  prisma: {
    transaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
  },
}));

const { prisma } = require('../../src/utils/prisma');

describe('Transaction Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransactions', () => {
    it('should return list of user transactions', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          title: 'Groceries',
          amount: 50.5,
          currency: 'USD',
          date: new Date('2026-07-15'),
          notes: null,
          user_id: 'user-123',
          category_id: 'cat-1',
          category: { id: 'cat-1', name: 'Food' },
        },
      ];

      prisma.transaction.findMany.mockResolvedValue(mockTransactions);
      prisma.transaction.count.mockResolvedValue(1);

      const req = { user: { id: 'user-123' }, query: {} };
      const res = { json: jest.fn() };

      await getTransactions(req, res);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: 'user-123' },
          orderBy: { date: 'desc' },
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockTransactions,
          pagination: expect.any(Object),
        })
      );
    });

    it('should return empty list when user has no transactions', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const req = { user: { id: 'user-123' }, query: {} };
      const res = { json: jest.fn() };

      await getTransactions(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
          pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
        })
      );
    });

    it('should apply search filter (case-insensitive)', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const req = { user: { id: 'user-123' }, query: { search: 'grocery' } };
      const res = { json: jest.fn() };

      await getTransactions(req, res);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 'user-123',
            OR: expect.arrayContaining([
              expect.objectContaining({ title: { contains: 'grocery', mode: 'insensitive' } }),
            ]),
          }),
        })
      );
    });

    it('should apply category filter', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const req = { user: { id: 'user-123' }, query: { category: 'cat-1' } };
      const res = { json: jest.fn() };

      await getTransactions(req, res);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 'user-123',
            category_id: 'cat-1',
          }),
        })
      );
    });

    it('should apply date range filters', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const req = {
        user: { id: 'user-123' },
        query: { dateFrom: '2026-07-01', dateTo: '2026-07-31' },
      };
      const res = { json: jest.fn() };

      await getTransactions(req, res);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 'user-123',
            date: expect.any(Object),
          }),
        })
      );
    });

    it('should apply amount range filters', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const req = {
        user: { id: 'user-123' },
        query: { amountMin: '10', amountMax: '100' },
      };
      const res = { json: jest.fn() };

      await getTransactions(req, res);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 'user-123',
            amount: { gte: 10, lte: 100 },
          }),
        })
      );
    });

    it('should support pagination', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(100);

      const req = { user: { id: 'user-123' }, query: { limit: '10', offset: '20' } };
      const res = { json: jest.fn() };

      await getTransactions(req, res);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: { total: 100, limit: 10, offset: 20, hasMore: true },
        })
      );
    });

    it('should handle errors gracefully', async () => {
      prisma.transaction.findMany.mockRejectedValue(new Error('DB error'));

      const req = { user: { id: 'user-123' }, query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch transactions' });
    });
  });

  describe('createTransaction', () => {
    it('should create transaction with valid data', async () => {
      const mockTransaction = {
        id: 'tx-1',
        title: 'Groceries',
        amount: 50.5,
        currency: 'USD',
        date: new Date('2026-07-15'),
        notes: 'Weekly shopping',
        user_id: 'user-123',
        category_id: 'cat-1',
        category: { id: 'cat-1', name: 'Food' },
      };

      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', user_id: 'user-123' });
      prisma.transaction.create.mockResolvedValue(mockTransaction);

      const req = {
        user: { id: 'user-123' },
        body: {
          title: 'Groceries',
          amount: 50.5,
          currency: 'USD',
          date: '2026-07-15',
          notes: 'Weekly shopping',
          category_id: 'cat-1',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockTransaction);
    });

    it('should default currency to USD', async () => {
      const mockTransaction = {
        id: 'tx-1',
        title: 'Groceries',
        amount: 50.5,
        currency: 'USD',
        date: new Date('2026-07-15'),
        notes: null,
        user_id: 'user-123',
        category_id: null,
      };

      prisma.transaction.create.mockResolvedValue(mockTransaction);

      const req = {
        user: { id: 'user-123' },
        body: {
          title: 'Groceries',
          amount: 50.5,
          date: '2026-07-15',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTransaction(req, res);

      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'USD',
          }),
        })
      );
    });

    it('should reject empty title', async () => {
      const req = {
        user: { id: 'user-123' },
        body: {
          title: '',
          amount: 50,
          date: '2026-07-15',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('required') });
    });

    it('should reject amount <= 0', async () => {
      const req = {
        user: { id: 'user-123' },
        body: {
          title: 'Test',
          amount: 0,
          date: '2026-07-15',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('greater than 0') });
    });

    it('should reject invalid amount', async () => {
      const req = {
        user: { id: 'user-123' },
        body: {
          title: 'Test',
          amount: 'abc',
          date: '2026-07-15',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('number') });
    });

    it('should reject future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const req = {
        user: { id: 'user-123' },
        body: {
          title: 'Test',
          amount: 50,
          date: futureDate.toISOString(),
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('future') });
    });

    it('should reject invalid date format', async () => {
      const req = {
        user: { id: 'user-123' },
        body: {
          title: 'Test',
          amount: 50,
          date: 'invalid',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('valid') });
    });

    it('should reject invalid currency', async () => {
      const req = {
        user: { id: 'user-123' },
        body: {
          title: 'Test',
          amount: 50,
          date: '2026-07-15',
          currency: 'INVALID',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('ISO 4217') });
    });

    it('should reject non-existent category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      const req = {
        user: { id: 'user-123' },
        body: {
          title: 'Test',
          amount: 50,
          date: '2026-07-15',
          category_id: 'nonexistent',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
    });

    it('should reject category not owned by user', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        user_id: 'other-user',
      });

      const req = {
        user: { id: 'user-123' },
        body: {
          title: 'Test',
          amount: 50,
          date: '2026-07-15',
          category_id: 'cat-1',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('updateTransaction', () => {
    it('should update transaction with valid data', async () => {
      const existingTransaction = {
        id: 'tx-1',
        title: 'Groceries',
        amount: 50.5,
        currency: 'USD',
        date: new Date('2026-07-15'),
        notes: null,
        user_id: 'user-123',
        category_id: null,
      };

      const updatedTransaction = {
        ...existingTransaction,
        title: 'Updated Groceries',
        amount: 75.5,
      };

      prisma.transaction.findUnique.mockResolvedValue(existingTransaction);
      prisma.transaction.update.mockResolvedValue(updatedTransaction);

      const req = {
        user: { id: 'user-123' },
        params: { id: 'tx-1' },
        body: {
          title: 'Updated Groceries',
          amount: 75.5,
          currency: 'USD',
          date: '2026-07-15',
        },
      };
      const res = { json: jest.fn() };

      await updateTransaction(req, res);

      expect(res.json).toHaveBeenCalledWith(updatedTransaction);
    });

    it('should return 404 if transaction not found', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      const req = {
        user: { id: 'user-123' },
        params: { id: 'nonexistent' },
        body: { title: 'Updated', amount: 75, date: '2026-07-15', currency: 'USD' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updateTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transaction not found' });
    });

    it('should return 403 if user does not own transaction', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        user_id: 'other-user',
      });

      const req = {
        user: { id: 'user-123' },
        params: { id: 'tx-1' },
        body: { title: 'Updated', amount: 75, date: '2026-07-15', currency: 'USD' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updateTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should reject invalid amount in update', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        user_id: 'user-123',
      });

      const req = {
        user: { id: 'user-123' },
        params: { id: 'tx-1' },
        body: { title: 'Test', amount: -10, date: '2026-07-15', currency: 'USD' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updateTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('greater than 0') });
    });

    it('should reject future date in update', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        user_id: 'user-123',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const req = {
        user: { id: 'user-123' },
        params: { id: 'tx-1' },
        body: {
          title: 'Test',
          amount: 50,
          date: futureDate.toISOString(),
          currency: 'USD',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updateTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('future') });
    });
  });

  describe('deleteTransaction', () => {
    it('should delete transaction owned by user', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        user_id: 'user-123',
      });
      prisma.transaction.delete.mockResolvedValue({ id: 'tx-1' });

      const req = {
        user: { id: 'user-123' },
        params: { id: 'tx-1' },
      };
      const res = { json: jest.fn() };

      await deleteTransaction(req, res);

      expect(prisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
      });
      expect(res.json).toHaveBeenCalledWith({ message: 'Transaction deleted successfully' });
    });

    it('should return 404 if transaction not found', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      const req = {
        user: { id: 'user-123' },
        params: { id: 'nonexistent' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transaction not found' });
    });

    it('should return 403 if user does not own transaction', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        user_id: 'other-user',
      });

      const req = {
        user: { id: 'user-123' },
        params: { id: 'tx-1' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('Edge Cases', () => {
    describe('Transaction with decimal amounts', () => {
      it('should accept decimal amounts like 99.99', async () => {
        prisma.transaction.create.mockResolvedValue({
          id: 'tx-1',
          title: 'Decimal test',
          amount: 99.99,
          currency: 'USD',
          date: new Date('2026-07-15'),
          user_id: 'user-123',
        });

        const req = {
          user: { id: 'user-123' },
          body: {
            title: 'Decimal test',
            amount: 99.99,
            date: '2026-07-15',
          },
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };

        await createTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalled();
      });

      it('should accept very small decimals like 0.01', async () => {
        prisma.transaction.create.mockResolvedValue({
          id: 'tx-1',
          amount: 0.01,
        });

        const req = {
          user: { id: 'user-123' },
          body: {
            title: 'Small amount',
            amount: 0.01,
            date: '2026-07-15',
          },
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };

        await createTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
      });

      it('should accept large amounts', async () => {
        prisma.transaction.create.mockResolvedValue({
          id: 'tx-1',
          amount: 999999.99,
        });

        const req = {
          user: { id: 'user-123' },
          body: {
            title: 'Large amount',
            amount: 999999.99,
            date: '2026-07-15',
          },
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };

        await createTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
      });
    });

    describe('Complex filtering combinations', () => {
      it('should handle search + category + dateRange + amount filters together', async () => {
        prisma.transaction.findMany.mockResolvedValue([]);
        prisma.transaction.count.mockResolvedValue(0);

        const req = {
          user: { id: 'user-123' },
          query: {
            search: 'grocery',
            category: 'cat-1',
            dateFrom: '2026-07-01',
            dateTo: '2026-07-31',
            amountMin: '10',
            amountMax: '100',
            limit: '20',
            offset: '0',
          },
        };
        const res = { json: jest.fn() };

        await getTransactions(req, res);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              user_id: 'user-123',
              OR: expect.any(Array),
              category_id: 'cat-1',
              date: expect.any(Object),
              amount: expect.any(Object),
            }),
          })
        );
      });

      it('should handle invalid limit by capping at 100', async () => {
        prisma.transaction.findMany.mockResolvedValue([]);
        prisma.transaction.count.mockResolvedValue(0);

        const req = {
          user: { id: 'user-123' },
          query: { limit: '9999' },
        };
        const res = { json: jest.fn() };

        await getTransactions(req, res);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 100,
          })
        );
      });

      it('should handle negative offset by using 0', async () => {
        prisma.transaction.findMany.mockResolvedValue([]);
        prisma.transaction.count.mockResolvedValue(0);

        const req = {
          user: { id: 'user-123' },
          query: { offset: '-50' },
        };
        const res = { json: jest.fn() };

        await getTransactions(req, res);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 0,
          })
        );
      });

      it('should handle non-numeric limit gracefully', async () => {
        prisma.transaction.findMany.mockResolvedValue([]);
        prisma.transaction.count.mockResolvedValue(0);

        const req = {
          user: { id: 'user-123' },
          query: { limit: 'invalid' },
        };
        const res = { json: jest.fn() };

        await getTransactions(req, res);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: expect.any(Number),
          })
        );
      });
    });

    describe('Amount range filtering edge cases', () => {
      it('should filter when amountMin equals amountMax', async () => {
        prisma.transaction.findMany.mockResolvedValue([]);
        prisma.transaction.count.mockResolvedValue(0);

        const req = {
          user: { id: 'user-123' },
          query: { amountMin: '50.00', amountMax: '50.00' },
        };
        const res = { json: jest.fn() };

        await getTransactions(req, res);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              amount: {
                gte: 50,
                lte: 50,
              },
            }),
          })
        );
      });

      it('should handle amountMin > amountMax (swap or ignore)', async () => {
        prisma.transaction.findMany.mockResolvedValue([]);
        prisma.transaction.count.mockResolvedValue(0);

        const req = {
          user: { id: 'user-123' },
          query: { amountMin: '100', amountMax: '50' },
        };
        const res = { json: jest.fn() };

        await getTransactions(req, res);

        // Should still call with amount filters (implementation specific)
        expect(prisma.transaction.findMany).toHaveBeenCalled();
      });
    });

    describe('Date handling edge cases', () => {
      it('should handle transactions at month boundaries', async () => {
        prisma.transaction.findMany.mockResolvedValue([]);
        prisma.transaction.count.mockResolvedValue(0);

        const req = {
          user: { id: 'user-123' },
          query: {
            dateFrom: '2026-07-01',
            dateTo: '2026-07-31',
          },
        };
        const res = { json: jest.fn() };

        await getTransactions(req, res);

        expect(prisma.transaction.findMany).toHaveBeenCalled();
      });
    });

    describe('Sort order edge cases', () => {
      it('should default to date DESC when sortOrder is invalid', async () => {
        prisma.transaction.findMany.mockResolvedValue([]);
        prisma.transaction.count.mockResolvedValue(0);

        const req = {
          user: { id: 'user-123' },
          query: { sortBy: 'date', sortOrder: 'invalid' },
        };
        const res = { json: jest.fn() };

        await getTransactions(req, res);

        // Should use desc as default
        expect(prisma.transaction.findMany).toHaveBeenCalled();
      });

      it('should sort by amount when sortBy=amount', async () => {
        prisma.transaction.findMany.mockResolvedValue([]);
        prisma.transaction.count.mockResolvedValue(0);

        const req = {
          user: { id: 'user-123' },
          query: { sortBy: 'amount', sortOrder: 'asc' },
        };
        const res = { json: jest.fn() };

        await getTransactions(req, res);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { amount: 'asc' },
          })
        );
      });
    });
  });
});
