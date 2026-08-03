import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/layout/topbar", () => ({
  Topbar: () =>
    React.createElement("div", { "data-testid": "topbar" }, "Topbar"),
}));
vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () =>
    React.createElement("header", { "data-testid": "site-header" }, "SiteHeader"),
}));
vi.mock("@/components/layout/site-footer", () => ({
  SiteFooter: () =>
    React.createElement("footer", { "data-testid": "site-footer" }, "SiteFooter"),
}));
vi.mock("@/app/_components/hero-section", () => ({
  HeroSection: () =>
    React.createElement(
      "section",
      { "data-testid": "hero-section" },
      React.createElement("h1", null, "She arrives at two."),
      React.createElement("span", null, "Idle Collection"),
    ),
}));
vi.mock("@/app/_components/how-it-works-section", () => ({
  HowItWorksSection: () =>
    React.createElement(
      "section",
      { "data-testid": "how-it-works-section" },
      React.createElement("h3", null, "Three taps. One nap."),
    ),
}));
vi.mock("@/app/_components/idle-collection-section", () => ({
  IdleCollectionSection: () =>
    React.createElement(
      "section",
      { "data-testid": "idle-collection-section" },
      React.createElement("h3", null, "The Idle Collection."),
      React.createElement("span", null, "hour of nothing"),
      React.createElement("span", null, "quiet manicure"),
      React.createElement("span", null, "lymphatic facial"),
    ),
}));
vi.mock("@/app/_components/manifesto-section", () => ({
  ManifestoSection: () =>
    React.createElement(
      "section",
      { "data-testid": "manifesto-section" },
      React.createElement("blockquote", null, "only luxury we still believe in is not having to leave"),
      React.createElement("div", null, "FAINEANT, IDLE COLLECTION №01"),
    ),
}));
vi.mock("@/app/_components/practitioner-spotlight-section", () => ({
  PractitionerSpotlightSection: () =>
    React.createElement(
      "section",
      { "data-testid": "practitioner-spotlight-section" },
      React.createElement("h3", null, "The Salon at home."),
      React.createElement("h3", null, "Maeve Le Gal."),
    ),
}));
vi.mock("@/app/_components/waitlist-section", () => ({
  WaitlistSection: () =>
    React.createElement("section", { "data-testid": "waitlist-section" }),
}));

import HomePage from "@/app/page";

describe("HomePage (FAINEANT editorial)", () => {
  describe("Layout", () => {
    it("renders topbar, header, and footer", () => {
      render(React.createElement(HomePage));
      expect(screen.getByTestId("topbar")).toBeInTheDocument();
      expect(screen.getByTestId("site-header")).toBeInTheDocument();
      expect(screen.getByTestId("site-footer")).toBeInTheDocument();
    });

    it("renders main element wrapping all sections", () => {
      render(React.createElement(HomePage));
      const main = document.querySelector("main");
      expect(main).toBeInTheDocument();
    });
  });

  describe("Hero section", () => {
    it("renders the hero section", () => {
      render(React.createElement(HomePage));
      expect(screen.getByTestId("hero-section")).toBeInTheDocument();
    });

    it("contains brand headline copy", () => {
      render(React.createElement(HomePage));
      expect(screen.getByText(/she arrives at two\./i)).toBeInTheDocument();
    });

    it("contains Idle Collection reference", () => {
      render(React.createElement(HomePage));
      expect(screen.getAllByText(/idle collection/i).length).toBeGreaterThan(0);
    });
  });

  describe("How It Works section", () => {
    it("renders the how-it-works section", () => {
      render(React.createElement(HomePage));
      expect(screen.getByTestId("how-it-works-section")).toBeInTheDocument();
    });

    it("contains three-step headline", () => {
      render(React.createElement(HomePage));
      expect(screen.getByText(/three taps\. one nap\./i)).toBeInTheDocument();
    });
  });

  describe("Idle Collection section", () => {
    it("renders the idle-collection section", () => {
      render(React.createElement(HomePage));
      expect(screen.getByTestId("idle-collection-section")).toBeInTheDocument();
    });

    it("contains service ritual names", () => {
      render(React.createElement(HomePage));
      expect(screen.getByText(/hour of nothing/i)).toBeInTheDocument();
      expect(screen.getByText(/quiet manicure/i)).toBeInTheDocument();
      expect(screen.getByText(/lymphatic facial/i)).toBeInTheDocument();
    });
  });

  describe("Manifesto section", () => {
    it("renders the manifesto section", () => {
      render(React.createElement(HomePage));
      expect(screen.getByTestId("manifesto-section")).toBeInTheDocument();
    });

    it("contains FAINEANT brand attribution", () => {
      render(React.createElement(HomePage));
      expect(screen.getByText(/FAINEANT, IDLE COLLECTION/i)).toBeInTheDocument();
    });
  });

  describe("Practitioner Spotlight section", () => {
    it("renders the practitioner-spotlight section", () => {
      render(React.createElement(HomePage));
      expect(screen.getByTestId("practitioner-spotlight-section")).toBeInTheDocument();
    });

    it("features Maeve Le Gal", () => {
      render(React.createElement(HomePage));
      expect(screen.getByText(/maeve le gal\./i)).toBeInTheDocument();
    });

    it("contains salon heading", () => {
      render(React.createElement(HomePage));
      expect(screen.getByText(/the salon at home\./i)).toBeInTheDocument();
    });
  });
});
