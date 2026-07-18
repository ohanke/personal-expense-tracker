const { isAuthenticated } = require('../../src/middleware/auth');

describe('Auth Middleware', () => {
  describe('isAuthenticated', () => {
    it('should call next() if user is authenticated', (done) => {
      const req = {
        isAuthenticated: () => true,
      };
      const res = {};
      const next = jest.fn(() => done());

      isAuthenticated(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', () => {
      const req = {
        isAuthenticated: () => false,
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      isAuthenticated(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
