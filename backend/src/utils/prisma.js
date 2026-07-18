let PrismaClient;

try {
  const module = require('@prisma/client');
  PrismaClient = module.PrismaClient;
} catch (error) {
  console.warn('Prisma Client module import failed, using mock:', error.message);
  PrismaClient = class {
    constructor() {
      this.user = {
        findUnique: async () => null,
        findUniqueOrThrow: async () => { throw new Error('Not found'); },
        create: async (data) => ({ id: 'mock-id', ...data.data }),
        update: async (data) => ({ id: data.where.id, ...data.data }),
      };
    }
  };
}

const prisma = new PrismaClient();

module.exports = { prisma };
