import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import React from "react";

/* ---------------------------------------------------------------------------
 * Mock: next/link
 * --------------------------------------------------------------------------- */

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...rest }, children),
}));

/* ---------------------------------------------------------------------------
 * Mock: next/navigation
 * --------------------------------------------------------------------------- */

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

/* ---------------------------------------------------------------------------
 * Mock: @/lib/auth
 * --------------------------------------------------------------------------- */

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: null,
    accessToken: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  }),
  AuthContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

/* ---------------------------------------------------------------------------
 * Mock: lucide-react
 *
 * Create a simple SVG stub for each icon export.
 * --------------------------------------------------------------------------- */

function makeSvgStub(name: string) {
  const Stub = (props: Record<string, unknown>) =>
    React.createElement("svg", { "data-testid": `lucide-${name}`, ...props });
  Stub.displayName = name;
  return Stub;
}

vi.mock("lucide-react", () => ({
  Search: makeSvgStub("Search"),
  CalendarDays: makeSvgStub("CalendarDays"),
  ShieldCheck: makeSvgStub("ShieldCheck"),
  MapPin: makeSvgStub("MapPin"),
  ArrowRight: makeSvgStub("ArrowRight"),
  Check: makeSvgStub("Check"),
  Star: makeSvgStub("Star"),
  Zap: makeSvgStub("Zap"),
  Clock: makeSvgStub("Clock"),
  CreditCard: makeSvgStub("CreditCard"),
  Users: makeSvgStub("Users"),
  Scissors: makeSvgStub("Scissors"),
  Sparkles: makeSvgStub("Sparkles"),
  TrendingUp: makeSvgStub("TrendingUp"),
  Menu: makeSvgStub("Menu"),
  X: makeSvgStub("X"),
  Smartphone: makeSvgStub("Smartphone"),
  Bell: makeSvgStub("Bell"),
  MessageSquare: makeSvgStub("MessageSquare"),
  BarChart3: makeSvgStub("BarChart3"),
  CheckCircle2: makeSvgStub("CheckCircle2"),
  Quote: makeSvgStub("Quote"),
  Upload: makeSvgStub("Upload"),
  Loader2: makeSvgStub("Loader2"),
}));
