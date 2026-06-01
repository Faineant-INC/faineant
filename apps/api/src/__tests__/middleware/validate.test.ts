import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import type { Request, Response, NextFunction } from 'express';

/**
 * Creates mock Express req/res/next objects for middleware testing.
 */
function createMocks(overrides: Partial<Request> = {}) {
  const req = {
    body: {},
    query: {},
    params: {},
    ...overrides,
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as unknown as NextFunction;

  return { req, res, next };
}

describe('validate middleware', () => {
  const bodySchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
  });

  describe('body validation (default)', () => {
    it('calls next() when body is valid', () => {
      const { req, res, next } = createMocks({
        body: { email: 'test@example.com', name: 'Alice' },
      });

      validate(bodySchema)(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(next).toHaveBeenCalledWith(); // called with no arguments
      expect(res.status).not.toHaveBeenCalled();
    });

    it('replaces req.body with parsed (validated) data', () => {
      const { req, res, next } = createMocks({
        body: { email: 'test@example.com', name: 'Alice', extraField: 'ignored' },
      });

      const schema = z.object({
        email: z.string().email(),
        name: z.string().min(1),
      }).strict();

      // strict schema will reject extra fields - use non-strict to test replacement
      validate(bodySchema)(req, res, next);

      expect(req.body).toEqual({ email: 'test@example.com', name: 'Alice' });
    });

    it('returns 400 for invalid body', () => {
      const { req, res, next } = createMocks({
        body: { email: 'not-an-email', name: '' },
      });

      validate(bodySchema)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
          }),
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('includes field-level error details in response', () => {
      const { req, res, next } = createMocks({
        body: { email: 'bad', name: '' },
      });

      validate(bodySchema)(req, res, next);

      const responseBody = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(responseBody.error.details).toBeDefined();
      expect(responseBody.error.details.email).toBeInstanceOf(Array);
      expect(responseBody.error.details.email.length).toBeGreaterThan(0);
    });

    it('returns 400 when required fields are missing', () => {
      const { req, res, next } = createMocks({
        body: {},
      });

      validate(bodySchema)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const responseBody = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(responseBody.error.details).toBeDefined();
    });
  });

  describe('query validation', () => {
    const querySchema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      search: z.string().optional(),
    });

    it('calls next() when query params are valid', () => {
      const { req, res, next } = createMocks({
        query: { page: '2', search: 'test' } as unknown as Request['query'],
      });

      validate(querySchema, 'query')(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid query params', () => {
      const { req, res, next } = createMocks({
        query: { page: 'abc' } as unknown as Request['query'],
      });

      // 'abc' cannot coerce to number so it will fail
      // Actually z.coerce.number() with 'abc' gives NaN which fails .int()
      validate(querySchema, 'query')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('params validation', () => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    it('calls next() when params are valid', () => {
      const { req, res, next } = createMocks({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' } as unknown as Request['params'],
      });

      validate(paramsSchema, 'params')(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns 400 for invalid params', () => {
      const { req, res, next } = createMocks({
        params: { id: 'not-a-uuid' } as unknown as Request['params'],
      });

      validate(paramsSchema, 'params')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('non-Zod errors', () => {
    it('passes non-Zod errors to next()', () => {
      const throwingSchema = {
        parse: () => {
          throw new Error('unexpected');
        },
      } as unknown as z.ZodSchema;

      const { req, res, next } = createMocks({ body: {} });

      validate(throwingSchema)(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
