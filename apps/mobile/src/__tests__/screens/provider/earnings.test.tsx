import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import * as dataClient from "@/lib/data-client";
import EarningsScreen from "@/app/(provider)/earnings";

jest.mock("@/lib/data-client");

beforeEach(() => {
  jest.clearAllMocks();
});

const mockEarnings = {
  totalEarnings: 25000,
  payments: [
    {
      id: "pay1",
      providerPayoutInCents: 3400,
      createdAt: "2026-03-27T10:00:00Z",
      booking: { startTime: "2026-03-27T10:00:00Z", service: { name: "Haircut" } },
    },
    {
      id: "pay2",
      providerPayoutInCents: 7275,
      createdAt: "2026-03-26T14:00:00Z",
      booking: { startTime: "2026-03-26T14:00:00Z", service: { name: "Hair Color" } },
    },
  ],
};

describe("EarningsScreen", () => {
  it("loads earnings from Supabase", async () => {
    (dataClient.getEarnings as jest.Mock).mockResolvedValueOnce(mockEarnings);

    render(<EarningsScreen />);

    await waitFor(() => {
      expect(dataClient.getEarnings).toHaveBeenCalledWith();
    });
  });

  it("displays total earnings", async () => {
    (dataClient.getEarnings as jest.Mock).mockResolvedValueOnce(mockEarnings);

    const { getByText } = render(<EarningsScreen />);

    await waitFor(() => {
      expect(getByText("$250.00")).toBeTruthy();
    });
  });

  it("displays Total Earnings label", () => {
    (dataClient.getEarnings as jest.Mock).mockReturnValueOnce(
      new Promise(() => {}),
    );

    const { getByText } = render(<EarningsScreen />);
    expect(getByText("TO DATE")).toBeTruthy();
    expect(getByText("earned.")).toBeTruthy();
  });

  it("displays Payment History section", () => {
    (dataClient.getEarnings as jest.Mock).mockReturnValueOnce(
      new Promise(() => {}),
    );

    const { getByText } = render(<EarningsScreen />);
    expect(getByText("HISTORY")).toBeTruthy();
  });

  it("displays individual payment amounts", async () => {
    (dataClient.getEarnings as jest.Mock).mockResolvedValueOnce(mockEarnings);

    const { getByText } = render(<EarningsScreen />);

    await waitFor(() => {
      expect(getByText("+$34.00")).toBeTruthy();
      expect(getByText("+$72.75")).toBeTruthy();
    });
  });

  it("displays service names in payment list", async () => {
    (dataClient.getEarnings as jest.Mock).mockResolvedValueOnce(mockEarnings);

    const { getByText } = render(<EarningsScreen />);

    await waitFor(() => {
      expect(getByText("Haircut")).toBeTruthy();
      expect(getByText("Hair Color")).toBeTruthy();
    });
  });

  it("shows $0.00 when earnings not loaded yet", () => {
    (dataClient.getEarnings as jest.Mock).mockReturnValueOnce(new Promise(() => {}));

    const { getByText } = render(<EarningsScreen />);
    expect(getByText("$0.00")).toBeTruthy();
  });

  it("shows empty state when no payments", async () => {
    (dataClient.getEarnings as jest.Mock).mockResolvedValueOnce({
      totalEarnings: 0,
      payments: [],
    });

    const { getByText } = render(<EarningsScreen />);

    await waitFor(() => {
      expect(getByText("No payments yet.")).toBeTruthy();
    });
  });

});
