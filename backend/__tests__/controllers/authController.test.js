const { getUser, logout } = require('../../src/controllers/authController');

describe('Auth Controller', () => {
  describe('getUser', () => {
    it('should return user data in JSON format', () => {
      const req = {
        user: {
          id: 'user-123',
          display_name: 'John Doe',
          email: 'john@example.com',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      };
      const res = {
        json: jest.fn(),
      };

      getUser(req, res);

      expect(res.json).toHaveBeenCalledWith({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
      });
    });

    it('should handle missing avatar_url', () => {
      const req = {
        user: {
          id: 'user-123',
          display_name: 'Jane Doe',
          email: 'jane@example.com',
          avatar_url: null,
        },
      };
      const res = {
        json: jest.fn(),
      };

      getUser(req, res);

      expect(res.json).toHaveBeenCalledWith({
        id: 'user-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        avatar: null,
      });
    });
  });

  describe('logout', () => {
    it('should call logout and return success message', (done) => {
      const req = {
        logout: jest.fn((callback) => callback(null)),
      };
      const res = {
        json: jest.fn(() => done()),
      };

      logout(req, res);

      expect(req.logout).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should handle logout error gracefully', (done) => {
      const error = new Error('Logout failed');
      const req = {
        logout: jest.fn((callback) => callback(error)),
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(() => done()),
      };

      logout(req, res);

      expect(req.logout).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Logout failed' });
    });
  });
});
