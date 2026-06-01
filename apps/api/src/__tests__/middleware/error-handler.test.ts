import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError, errorHandler } from '../../middleware/error-handler';
import type { Request, Response, NextFunction } from 'express';

function createMocks() {
  const req = {} as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as unknown as NextFunction;

  return { req, res, next };
}

describe('AppError', () => {
  it('extends Error', () => {
    const err = new AppError(400, 'BAD_REQUEST', 'Something went wrong');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('stores statusCode, code, and message', () => {
    const err = new AppError(404, 'NOT_FOUND', 'Resource not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
  });

  it('has name set to AppError', () => {
    const err = new AppError(500, 'INTERNAL', 'oops');
    expect(err.name).toBe('AppError');
  });
});

describe('errorHandler middleware', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.error output during tests
    consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {}) as unknown as ReturnType<typeof vi.spyOn>;
  });

  it('returns the correct status code for an AppError', () => {
    const { req, res, next } = createMocks();
    const err = new AppError(422, 'UNPROCESSABLE', 'Invalid entity');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns the correct JSON structure for an AppError', () => {
    const { req, res, next } = createMocks();
    const err = new AppError(409, 'CONFLICT', 'Already exists');

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Already exists',
      },
    });
  });

  it('returns 500 for a generic Error', () => {
    const { req, res, next } = createMocks();
    const err = new Error('Something broke');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns a generic message for non-AppError errors', () => {
    const { req, res, next } = createMocks();
    const err = new Error('sensitive internal details');

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  it('does not leak internal error details for non-AppError', () => {
    const { req, res, next } = createMocks();
    const err = new Error('database connection string: postgres://user:pass@host');

    errorHandler(err, req, res, next);

    const responseBody = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(responseBody.error.message).not.toContain('postgres');
    expect(responseBody.error.message).toBe('An unexpected error occurred');
  });

  it('logs the error to console.error', () => {
    const { req, res, next } = createMocks();
    const err = new Error('test error');

    errorHandler(err, req, res, next);

    expect(consoleSpy).toHaveBeenCalledWith('Error:', err);
  });

  it('handles AppError with various status codes', () => {
    const cases = [
      { status: 400, code: 'BAD_REQUEST', message: 'Bad request' },
      { status: 401, code: 'UNAUTHORIZED', message: 'Not authorized' },
      { status: 403, code: 'FORBIDDEN', message: 'Forbidden' },
      { status: 404, code: 'NOT_FOUND', message: 'Not found' },
      { status: 429, code: 'RATE_LIMITED', message: 'Too many requests' },
    ];

    for (const { status, code, message } of cases) {
      const { req, res, next } = createMocks();
      const err = new AppError(status, code, message);

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { code, message },
      });
    }
  });

  it('handles TypeError as a generic 500 error', () => {
    const { req, res, next } = createMocks();
    const err = new TypeError('Cannot read properties of undefined');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });
});
