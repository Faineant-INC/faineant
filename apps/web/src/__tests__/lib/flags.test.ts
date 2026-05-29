import { describe, it, expect, afterEach } from "vitest";
import { isLaunched } from "@/lib/flags";

describe("isLaunched", () => {
  const original = process.env.NEXT_PUBLIC_LAUNCH_MODE;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    else process.env.NEXT_PUBLIC_LAUNCH_MODE = original;
  });

  it("is false when the var is unset", () => {
    delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    expect(isLaunched()).toBe(false);
  });

  it("is false when the var is the string 'false'", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "false";
    expect(isLaunched()).toBe(false);
  });

  it("is true only when the var is exactly 'true'", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "true";
    expect(isLaunched()).toBe(true);
  });
});
