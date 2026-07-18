const request = require('supertest');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport');

// Setup environment for OAuth strategies
process.env.GOOGLE_CLIENT_ID = 'test-google-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
process.env.GITHUB_CLIENT_ID = 'test-github-id';
process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';

// Mock Prisma BEFORE importing routes
jest.mock('../../src/utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'mock-id', provider: 'google', email: 'test@example.com' }),
    },
  },
}));

const authRouter = require('../../src/routes/auth');
const { isAuthenticated } = require('../../src/middleware/auth');

// Mock strategies
class MockStrategy extends Strategy {
  authenticate(req) {
    this.pass();
  }
}

// Register mock strategies
passport.use('google', new MockStrategy());
passport.use('github', new MockStrategy());

// Create a minimal Express app for testing
const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax' },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use('/auth', authRouter);

  return app;
};

describe('Auth Routes Integration', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /auth/me', () => {
    it('should return 401 if user is not authenticated', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return user data if authenticated', async () => {
      const req = {
        user: {
          id: 'user-123',
          display_name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        isAuthenticated: () => true,
      };

      // Manually call the route handler to test
      const res = {
        json: jest.fn((data) => {
          expect(data).toEqual({
            id: 'user-123',
            name: 'Test User',
            email: 'test@example.com',
            avatar: 'https://example.com/avatar.jpg',
          });
        }),
      };

      const { getUser } = require('../../src/controllers/authController');
      getUser(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('POST /auth/logout', () => {
    it('should return 401 if user is not authenticated', async () => {
      const response = await request(app).post('/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should log out authenticated user', async () => {
      const req = {
        isAuthenticated: () => true,
        logout: jest.fn((callback) => callback(null)),
      };

      const res = {
        json: jest.fn(),
      };

      const { logout } = require('../../src/controllers/authController');
      logout(req, res);

      expect(req.logout).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });
  });

  describe('GET /auth/google', () => {
    it('should have Google route registered', () => {
      // Routes are properly configured
      expect(authRouter.stack).toBeDefined();
      const googleRoute = authRouter.stack.find((layer) => layer.route && layer.route.path === '/google');
      expect(googleRoute).toBeDefined();
    });
  });

  describe('GET /auth/github', () => {
    it('should have GitHub route registered', () => {
      // Routes are properly configured
      expect(authRouter.stack).toBeDefined();
      const githubRoute = authRouter.stack.find((layer) => layer.route && layer.route.path === '/github');
      expect(githubRoute).toBeDefined();
    });
  });
});
