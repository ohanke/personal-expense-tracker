// Mock environment variables before any imports
process.env.GOOGLE_CLIENT_ID = 'test-google-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
process.env.GITHUB_CLIENT_ID = 'test-github-id';
process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';

// Mock Prisma before requiring passport config
jest.mock('../../src/utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const passport = require('passport');
const { prisma } = require('../../src/utils/prisma');

// Load passport config after mocking
require('../../src/config/passport');

describe('Passport Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('serializeUser', () => {
    it('should serialize user by id', (done) => {
      const user = { id: 'user-123', email: 'test@example.com' };
      const serializeFn = passport._serializers[0];

      serializeFn(user, (err, id) => {
        expect(err).toBeNull();
        expect(id).toBe('user-123');
        done();
      });
    });

    it('should serialize user even with minimal data', (done) => {
      const user = { id: 'user-456' };
      const serializeFn = passport._serializers[0];

      serializeFn(user, (err, id) => {
        expect(err).toBeNull();
        expect(id).toBe('user-456');
        done();
      });
    });
  });

  describe('deserializeUser', () => {
    it('should deserialize user from database by id', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', provider: 'google' };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const deserializeFn = passport._deserializers[0];

      await new Promise((resolve) => {
        deserializeFn('user-123', (err, user) => {
          expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-123' } });
          expect(user).toEqual(mockUser);
          expect(err).toBeNull();
          resolve();
        });
      });
    });

    it('should handle missing user in deserialize', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const deserializeFn = passport._deserializers[0];

      await new Promise((resolve) => {
        deserializeFn('nonexistent', (err, user) => {
          expect(user).toBeNull();
          expect(err).toBeNull();
          resolve();
        });
      });
    });

    it('should handle database error in deserialize', async () => {
      const dbError = new Error('Database connection failed');
      prisma.user.findUnique.mockRejectedValue(dbError);

      const deserializeFn = passport._deserializers[0];

      await new Promise((resolve) => {
        deserializeFn('user-123', (err) => {
          expect(err).toBeDefined();
          expect(err.message).toBe('Database connection failed');
          resolve();
        });
      });
    });
  });

  describe('Google Strategy', () => {
    it('should have Google strategy registered', () => {
      const googleStrategy = passport._strategies.google;
      expect(googleStrategy).toBeDefined();
    });

    it('should create new user on first Google login', async () => {
      const mockProfile = {
        id: 'google-123',
        displayName: 'John Doe',
        emails: [{ value: 'john@example.com' }],
        photos: [{ value: 'https://example.com/photo.jpg' }],
      };
      const mockUser = {
        id: 'user-1',
        provider: 'google',
        provider_user_id: 'google-123',
        email: 'john@example.com',
        display_name: 'John Doe',
        avatar_url: 'https://example.com/photo.jpg',
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const googleStrategy = passport._strategies.google;

      await new Promise((resolve) => {
        googleStrategy._verify(
          'accessToken',
          'refreshToken',
          mockProfile,
          (err, createdUser) => {
            void err;
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
              where: {
                provider_provider_user_id: {
                  provider: 'google',
                  provider_user_id: 'google-123',
                },
              },
            });
            expect(prisma.user.create).toHaveBeenCalledWith({
              data: {
                provider: 'google',
                provider_user_id: 'google-123',
                email: 'john@example.com',
                display_name: 'John Doe',
                avatar_url: 'https://example.com/photo.jpg',
              },
            });
            expect(createdUser).toEqual(mockUser);
            resolve();
          }
        );
      });
    });

    it('should update existing user on Google login', async () => {
      const mockProfile = {
        id: 'google-123',
        displayName: 'John Updated',
        emails: [{ value: 'john.updated@example.com' }],
        photos: [{ value: 'https://example.com/photo-new.jpg' }],
      };
      const existingUser = { id: 'user-1', provider: 'google', provider_user_id: 'google-123' };
      const updatedUser = {
        id: 'user-1',
        provider: 'google',
        provider_user_id: 'google-123',
        email: 'john.updated@example.com',
        display_name: 'John Updated',
        avatar_url: 'https://example.com/photo-new.jpg',
      };

      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.user.update.mockResolvedValue(updatedUser);

      const googleStrategy = passport._strategies.google;

      await new Promise((resolve) => {
        googleStrategy._verify(
          'accessToken',
          'refreshToken',
          mockProfile,
          (err, updatedUserRes) => {
            void err;
            expect(prisma.user.update).toHaveBeenCalledWith({
              where: { id: 'user-1' },
              data: {
                email: 'john.updated@example.com',
                display_name: 'John Updated',
                avatar_url: 'https://example.com/photo-new.jpg',
              },
            });
            expect(updatedUserRes).toEqual(updatedUser);
            resolve();
          }
        );
      });
    });

    it('should handle Google strategy error', async () => {
      const mockProfile = {
        id: 'google-123',
        displayName: 'John Doe',
      };
      const dbError = new Error('Database error');

      prisma.user.findUnique.mockRejectedValue(dbError);

      const googleStrategy = passport._strategies.google;

      await new Promise((resolve) => {
        googleStrategy._verify(
          'accessToken',
          'refreshToken',
          mockProfile,
          (err) => {
            void err;
            expect(err).toBeDefined();
            expect(err.message).toBe('Database error');
            resolve();
          }
        );
      });
    });
  });

  describe('GitHub Strategy', () => {
    it('should have GitHub strategy registered', () => {
      const githubStrategy = passport._strategies.github;
      expect(githubStrategy).toBeDefined();
    });

    it('should create new user on first GitHub login', async () => {
      const mockProfile = {
        id: 'github-456',
        displayName: 'Jane Doe',
        username: 'janedoe',
        emails: [{ value: 'jane@example.com' }],
        photos: [{ value: 'https://avatars.githubusercontent.com/jane.jpg' }],
      };
      const mockUser = {
        id: 'user-2',
        provider: 'github',
        provider_user_id: 'github-456',
        email: 'jane@example.com',
        display_name: 'Jane Doe',
        avatar_url: 'https://avatars.githubusercontent.com/jane.jpg',
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const githubStrategy = passport._strategies.github;

      await new Promise((resolve) => {
        githubStrategy._verify(
          'accessToken',
          'refreshToken',
          mockProfile,
          (err, createdUser) => {
            void err;
            expect(prisma.user.create).toHaveBeenCalledWith({
              data: {
                provider: 'github',
                provider_user_id: 'github-456',
                email: 'jane@example.com',
                display_name: 'Jane Doe',
                avatar_url: 'https://avatars.githubusercontent.com/jane.jpg',
              },
            });
            expect(createdUser).toEqual(mockUser);
            resolve();
          }
        );
      });
    });

    it('should use username when displayName is missing on GitHub', async () => {
      const mockProfile = {
        id: 'github-456',
        username: 'janedoe',
        emails: [{ value: 'jane@example.com' }],
        photos: [{ value: 'https://avatars.githubusercontent.com/jane.jpg' }],
      };
      const mockUser = {
        id: 'user-2',
        provider: 'github',
        provider_user_id: 'github-456',
        email: 'jane@example.com',
        display_name: 'janedoe',
        avatar_url: 'https://avatars.githubusercontent.com/jane.jpg',
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const githubStrategy = passport._strategies.github;

      await new Promise((resolve) => {
        githubStrategy._verify(
          'accessToken',
          'refreshToken',
          mockProfile,
          () => {
            expect(prisma.user.create).toHaveBeenCalledWith({
              data: {
                provider: 'github',
                provider_user_id: 'github-456',
                email: 'jane@example.com',
                display_name: 'janedoe',
                avatar_url: 'https://avatars.githubusercontent.com/jane.jpg',
              },
            });
            resolve();
          }
        );
      });
    });

    it('should update existing user on GitHub login', async () => {
      const mockProfile = {
        id: 'github-456',
        displayName: 'Jane Updated',
        username: 'janedoe',
        emails: [{ value: 'jane.updated@example.com' }],
        photos: [{ value: 'https://avatars.githubusercontent.com/jane-new.jpg' }],
      };
      const existingUser = { id: 'user-2', provider: 'github', provider_user_id: 'github-456' };
      const updatedUser = {
        id: 'user-2',
        provider: 'github',
        provider_user_id: 'github-456',
        email: 'jane.updated@example.com',
        display_name: 'Jane Updated',
        avatar_url: 'https://avatars.githubusercontent.com/jane-new.jpg',
      };

      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.user.update.mockResolvedValue(updatedUser);

      const githubStrategy = passport._strategies.github;

      await new Promise((resolve) => {
        githubStrategy._verify(
          'accessToken',
          'refreshToken',
          mockProfile,
          (err, user) => {
            expect(prisma.user.update).toHaveBeenCalledWith({
              where: { id: 'user-2' },
              data: {
                email: 'jane.updated@example.com',
                display_name: 'Jane Updated',
                avatar_url: 'https://avatars.githubusercontent.com/jane-new.jpg',
              },
            });
            expect(user).toEqual(updatedUser);
            resolve();
          }
        );
      });
    });

    it('should handle GitHub strategy error', async () => {
      const mockProfile = {
        id: 'github-456',
        username: 'janedoe',
      };
      const dbError = new Error('Database error');

      prisma.user.findUnique.mockRejectedValue(dbError);

      const githubStrategy = passport._strategies.github;

      await new Promise((resolve) => {
        githubStrategy._verify(
          'accessToken',
          'refreshToken',
          mockProfile,
          (err) => {
            void err;
            expect(err).toBeDefined();
            expect(err.message).toBe('Database error');
            resolve();
          }
        );
      });
    });
  });
});
