import { describe, it, expect } from "vitest";
import { storageObjectPath } from "../schemas/upload.schema";

describe("storageObjectPath", () => {
  it("builds <userId>/<uuid>.<ext>", () => {
    const p = storageObjectPath("user-1", "image/png");
    expect(p).toMatch(/^user-1\/[0-9a-f-]{36}\.png$/);
  });

  it("returns jpg extension for image/jpeg", () => {
    const p = storageObjectPath("user-abc", "image/jpeg");
    expect(p).toMatch(/^user-abc\/[0-9a-f-]{36}\.jpg$/);
  });

  it("returns webp extension for image/webp", () => {
    const p = storageObjectPath("user-xyz", "image/webp");
    expect(p).toMatch(/^user-xyz\/[0-9a-f-]{36}\.webp$/);
  });

  it("rejects unsupported types", () => {
    expect(() => storageObjectPath("user-1", "image/gif")).toThrow(
      "Unsupported content type"
    );
  });

  it("produces unique paths for repeated calls", () => {
    const a = storageObjectPath("user-1", "image/png");
    const b = storageObjectPath("user-1", "image/png");
    expect(a).not.toBe(b);
  });
});
