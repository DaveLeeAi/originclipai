import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  RateLimitError,
} from "@/lib/utils/errors";

describe("AppError", () => {
  it("creates error with code and status", () => {
    const err = new AppError("test", "TEST_ERROR", 500);
    expect(err.message).toBe("test");
    expect(err.code).toBe("TEST_ERROR");
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe("AppError");
  });
});

describe("ValidationError", () => {
  it("returns 400 status", () => {
    const err = new ValidationError("bad input");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("carries details", () => {
    const err = new ValidationError("bad", { field: "email" });
    expect(err.details).toEqual({ field: "email" });
  });
});

describe("NotFoundError", () => {
  it("returns 404 with resource info", () => {
    const err = new NotFoundError("Job", "abc-123");
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain("Job");
    expect(err.message).toContain("abc-123");
  });
});

describe("UnauthorizedError", () => {
  it("returns 401", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
  });
});

describe("RateLimitError", () => {
  it("returns 429 with retry info", () => {
    const err = new RateLimitError(60);
    expect(err.statusCode).toBe(429);
    expect(err.details?.retryAfter).toBe(60);
  });
});
