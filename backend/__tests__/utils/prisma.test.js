describe('Prisma Utility', () => {
  beforeEach(() => {
    // Clear module cache before each test
    jest.resetModules();
  });

  describe('Fallback Mock Client', () => {
    it('should provide mock user operations when Prisma fails to load', () => {
      // Mock the require to simulate Prisma failure
      jest.mock('@prisma/client', () => {
        throw new Error('Prisma Client did not initialize');
      }, { virtual: true });

      const { prisma } = require('../../src/utils/prisma');

      expect(prisma).toBeDefined();
      expect(prisma.user).toBeDefined();
      expect(typeof prisma.user.findUnique).toBe('function');
      expect(typeof prisma.user.create).toBe('function');
      expect(typeof prisma.user.update).toBe('function');
    });

    it('should handle findUnique mock operation', async () => {
      jest.resetModules();
      const { prisma } = require('../../src/utils/prisma');

      const result = await prisma.user.findUnique({ where: { id: 'test-id' } });

      expect(result).toBeNull();
    });

    it('should handle create mock operation', async () => {
      jest.resetModules();
      const { prisma } = require('../../src/utils/prisma');

      const result = await prisma.user.create({
        data: { email: 'test@example.com', provider: 'google', provider_user_id: 'goog-123' },
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('mock-id');
      expect(result.email).toBe('test@example.com');
    });

    it('should handle update mock operation', async () => {
      jest.resetModules();
      const { prisma } = require('../../src/utils/prisma');

      const result = await prisma.user.update({
        where: { id: 'test-id' },
        data: { email: 'updated@example.com' },
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('test-id');
      expect(result.email).toBe('updated@example.com');
    });

    it('should provide $disconnect method', async () => {
      jest.resetModules();
      const { prisma } = require('../../src/utils/prisma');

      expect(typeof prisma.$disconnect).toBe('function');
      const result = await prisma.$disconnect();
      expect(result).toBeUndefined();
    });
  });
});
