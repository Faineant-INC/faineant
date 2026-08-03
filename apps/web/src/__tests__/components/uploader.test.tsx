import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
}));

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

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: supabaseMocks.getUser },
    storage: {
      from: vi.fn(() => ({
        upload: supabaseMocks.upload,
        getPublicUrl: supabaseMocks.getPublicUrl,
      })),
    },
  }),
}));

import { Uploader } from "@/components/uploader";

describe("Uploader component", () => {
  const onUploaded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getUser.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    supabaseMocks.upload.mockResolvedValue({ data: { path: "stored" }, error: null });
    supabaseMocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://uploads.test/u1/portfolio/photo.jpg" },
    });
  });

  function makeFile(name = "photo.jpg", type = "image/jpeg", size = 1024) {
    const blob = new Blob(["x".repeat(size)], { type });
    return new File([blob], name, { type });
  }

  function selectFile(file: File) {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fireEvent.change(input);
  }

  it("renders the drop zone label", () => {
    render(<Uploader onUploaded={onUploaded} />);
    expect(screen.getByLabelText("Upload image")).toBeInTheDocument();
  });

  it("rejects an unsupported content type before storage is called", async () => {
    render(<Uploader onUploaded={onUploaded} />);
    selectFile(makeFile("doc.pdf", "application/pdf", 100));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/JPEG, PNG, and WebP/i);
    });
    expect(supabaseMocks.upload).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("rejects a file over the size limit", async () => {
    render(<Uploader onUploaded={onUploaded} maxBytes={500} />);
    selectFile(makeFile("big.jpg", "image/jpeg", 2000));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/limit/i);
    });
    expect(supabaseMocks.upload).not.toHaveBeenCalled();
  });

  it("uploads a valid file directly to the user-scoped Supabase path", async () => {
    render(<Uploader onUploaded={onUploaded} purpose="portfolio" />);
    selectFile(makeFile("my photo.jpg"));

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith(
        "https://uploads.test/u1/portfolio/photo.jpg",
      );
    });

    expect(supabaseMocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^u1\/portfolio\/.+-my-photo\.jpg$/),
      expect.any(File),
      {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      },
    );
  });

  it("surfaces a Supabase Storage error", async () => {
    supabaseMocks.upload.mockResolvedValue({
      data: null,
      error: new Error("Upload quota reached"),
    });
    render(<Uploader onUploaded={onUploaded} />);
    selectFile(makeFile());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Upload quota reached/i);
    });
    expect(onUploaded).not.toHaveBeenCalled();
  });
});
