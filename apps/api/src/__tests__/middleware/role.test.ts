import { describe, it, expect, vi } from 'vitest';
import { requireRole } from '../../middleware/role';
import type { Request, Response, NextFunction } from 'express';

function createMocks(user?: { userId: string; role: string }) {
  const req = {
    user,
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as unknown as NextFunction;

  return { req, res, next };
}

describe('requireRole middleware', () => {
  describe('single role', () => {
    it('calls next() when user has the required role', () => {
      const { req, res, next } = createMocks({ userId: 'u1', role: 'PROVIDER' });

      requireRole('PROVIDER')(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 when user has a different role', () => {
      const { req, res, next } = createMocks({ userId: 'u1', role: 'CLIENT' });

      requireRole('PROVIDER')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          }),
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('multiple roles', () => {
    it('calls next() when user role is in the allowed list', () => {
      const { req, res, next } = createMocks({ userId: 'u1', role: 'ADMIN' });

      requireRole('PROVIDER', 'ADMIN')(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('calls next() for any matching role in the list', () => {
      const { req, res, next } = createMocks({ userId: 'u1', role: 'PROVIDER' });

      requireRole('PROVIDER', 'ADMIN')(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns 403 when user role is not in the allowed list', () => {
      const { req, res, next } = createMocks({ userId: 'u1', role: 'CLIENT' });

      requireRole('PROVIDER', 'ADMIN')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('unauthenticated requests', () => {
    it('returns 401 when req.user is undefined', () => {
      const { req, res, next } = createMocks(undefined);

      requireRole('PROVIDER')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          }),
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 before checking role when user is missing', () => {
      const { req, res, next } = createMocks(undefined);

      requireRole('CLIENT', 'PROVIDER', 'ADMIN')(req, res, next);

      // Should be 401, not 403 -- authentication comes before authorization
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
