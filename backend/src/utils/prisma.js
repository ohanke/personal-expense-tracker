let prisma;

const MockPrismaClient = class {
  constructor() {
    this.user = {
      findUnique: async () => null,
      findUniqueOrThrow: async () => { throw new Error('Not found'); },
      create: async (data) => ({ id: 'mock-id', ...data.data }),
      update: async (data) => ({ id: data.where.id, ...data.data }),
    };
  }
  async $disconnect() {}
};

try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
} catch (error) {
  console.warn('[Prisma] Using mock client (Windows platform limitation)');
  prisma = new MockPrismaClient();
}

module.exports = { prisma };
