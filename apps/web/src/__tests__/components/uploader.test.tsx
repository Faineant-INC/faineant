import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Override the global useAuth mock so the component has a token.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "u1", role: "PROVIDER" },
    accessToken: "test-token",
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  }),
  AuthContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

import { Uploader } from "@/components/uploader";

/**
 * Mock XHR class for tracking PUT calls and simulating success.
 */
class MockXMLHttpRequest {
  status = 0;
  upload = { onprogress: null as ((e: ProgressEvent) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  opened: { method: string; url: string } | null = null;
  headers: Record<string, string> = {};

  open(method: string, url: string) {
    this.opened = { method, url };
  }
  setRequestHeader(k: string, v: string) {
    this.headers[k] = v;
  }
  send(_body: unknown) {
    // Simulate progress + success on next tick.
    setTimeout(() => {
      this.upload.onprogress?.({
        lengthComputable: true,
        loaded: 50,
        total: 100,
      } as ProgressEvent);
      this.status = 200;
      this.onload?.();
    }, 0);
  }
}

describe("Uploader component", () => {
  const fetchMock = vi.fn();
  const onUploaded = vi.fn();
  const originalXHR = globalThis.XMLHttpRequest;

  beforeEach(() => {
    fetchMock.mockReset();
    onUploaded.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    (globalThis as { XMLHttpRequest: unknown }).XMLHttpRequest =
      MockXMLHttpRequest;
  });

  afterEach(() => {
    (globalThis as { XMLHttpRequest: unknown }).XMLHttpRequest = originalXHR;
  });

  function makeFile(name = "photo.jpg", type = "image/jpeg", size = 1024) {
    const blob = new Blob(["x".repeat(size)], { type });
    return new File([blob], name, { type });
  }

  it("renders the drop zone label", () => {
    render(<Uploader onUploaded={onUploaded} />);
    expect(screen.getByLabelText("Upload image")).toBeInTheDocument();
  });

  it("rejects an unsupported content type without calling the API", async () => {
    render(<Uploader onUploaded={onUploaded} />);
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const bad = makeFile("doc.pdf", "application/pdf", 100);

    Object.defineProperty(input, "files", { value: [bad], configurable: true });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/JPEG, PNG, and WebP/i);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("rejects a file over the size limit", async () => {
    render(<Uploader onUploaded={onUploaded} maxBytes={500} />);
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const big = makeFile("big.jpg", "image/jpeg", 2000);

    Object.defineProperty(input, "files", { value: [big], configurable: true });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/limit/i);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("runs the full sign -> PUT -> finalize flow on a valid file", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            uploadUrl: "https://signed.example/put",
            publicUrl: "https://uploads.test/users/u1/abc.jpg",
            key: "users/u1/abc.jpg",
            expiresIn: 300,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { url: "https://uploads.test/users/u1/abc.jpg" },
        }),
      });

    render(<Uploader onUploaded={onUploaded} purpose="portfolio" />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile();
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith(
        "https://uploads.test/users/u1/abc.jpg",
      );
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [signUrl, signOpts] = fetchMock.mock.calls[0]!;
    expect(String(signUrl)).toMatch(/\/uploads\/sign$/);
    expect((signOpts as RequestInit).headers).toMatchObject({
      Authorization: "Bearer test-token",
    });

    const [finUrl] = fetchMock.mock.calls[1]!;
    expect(String(finUrl)).toMatch(/\/uploads\/finalize$/);
  });

  it("surfaces the API error message when /uploads/sign fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: "UPLOAD_QUOTA_EXCEEDED",
          message: "Daily upload limit reached (50/day). Try again tomorrow.",
        },
      }),
    });

    render(<Uploader onUploaded={onUploaded} />);
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile();
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Daily upload limit/i);
    });
    expect(onUploaded).not.toHaveBeenCalled();
  });
});
