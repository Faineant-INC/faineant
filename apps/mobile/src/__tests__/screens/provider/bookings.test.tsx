import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as dataClient from "@/lib/data-client";
import ProviderBookingsScreen from "@/app/(provider)/bookings";

jest.mock("@/lib/data-client");

beforeEach(() => {
  jest.clearAllMocks();
});

const mockBookings = [
  {
    id: "b1",
    status: "PENDING",
    startTime: "2026-03-28T10:00:00.000Z",
    totalPriceInCents: 3500,
    notes: "Skin fade please",
    service: { name: "Haircut" },
    client: { firstName: "John", lastName: "Doe" },
  },
  {
    id: "b2",
    status: "CONFIRMED",
    startTime: "2026-03-28T14:00:00.000Z",
    totalPriceInCents: 7500,
    notes: null,
    service: { name: "Hair Color" },
    client: { firstName: "Jane", lastName: "Smith" },
  },
  {
    id: "b3",
    status: "IN_PROGRESS",
    startTime: "2026-03-28T16:00:00.000Z",
    totalPriceInCents: 5000,
    notes: null,
    service: { name: "Braids" },
    client: { firstName: "Lisa", lastName: "Chen" },
  },
  {
    id: "b4",
    status: "COMPLETED",
    startTime: "2026-03-27T10:00:00.000Z",
    totalPriceInCents: 3500,
    notes: null,
    service: { name: "Trim" },
    client: { firstName: "Mike", lastName: "Brown" },
  },
];

describe("ProviderBookingsScreen", () => {
  it("loads and displays bookings from Supabase", async () => {
    (dataClient.listProviderBookings as jest.Mock).mockResolvedValue(mockBookings);

    const view = render(<ProviderBookingsScreen />);

    await waitFor(() => {
      expect(dataClient.listProviderBookings).toHaveBeenCalledWith();
      expect(view.getByText("Haircut")).toBeTruthy();
      expect(view.getAllByText("$35.00").length).toBeGreaterThanOrEqual(1);
      expect(view.getByText("John Doe")).toBeTruthy();
    });
  });

  it.each([
    [0, "Confirm"],
    [0, "Decline"],
    [1, "Start"],
    [2, "Complete"],
  ] as const)("shows the valid action for booking state %s", async (index, label) => {
    (dataClient.listProviderBookings as jest.Mock).mockResolvedValue([
      mockBookings[index],
    ]);

    const view = render(<ProviderBookingsScreen />);

    await waitFor(() => expect(view.getByText(label)).toBeTruthy());
  });

  it("shows no transition action for a completed booking", async () => {
    (dataClient.listProviderBookings as jest.Mock).mockResolvedValue([
      mockBookings[3],
    ]);

    const view = render(<ProviderBookingsScreen />);

    await waitFor(() => {
      expect(view.queryByText("Confirm")).toBeNull();
      expect(view.queryByText("Start")).toBeNull();
      expect(view.queryByText("Complete")).toBeNull();
    });
  });

  it.each([
    [0, "Confirm", "CONFIRMED"],
    [0, "Decline", "CANCELLED"],
    [1, "Start", "IN_PROGRESS"],
    [2, "Complete", "COMPLETED"],
  ] as const)(
    "uses the booking-status RPC for %s",
    async (index, label, status) => {
      (dataClient.listProviderBookings as jest.Mock).mockResolvedValue([
        mockBookings[index],
      ]);
      (dataClient.updateBookingStatus as jest.Mock).mockResolvedValue(undefined);
      const view = render(<ProviderBookingsScreen />);
      await waitFor(() => expect(view.getByText(label)).toBeTruthy());

      fireEvent.press(view.getByText(label));

      await waitFor(() => {
        expect(dataClient.updateBookingStatus).toHaveBeenCalledWith(
          mockBookings[index].id,
          status,
        );
        expect(dataClient.listProviderBookings).toHaveBeenCalledTimes(2);
      });
    },
  );

  it("shows an alert when the status RPC fails", async () => {
    (dataClient.listProviderBookings as jest.Mock).mockResolvedValue([
      mockBookings[0],
    ]);
    (dataClient.updateBookingStatus as jest.Mock).mockRejectedValue(
      new Error("Conflict"),
    );
    const alertSpy = jest.spyOn(Alert, "alert");
    const view = render(<ProviderBookingsScreen />);
    await waitFor(() => expect(view.getByText("Confirm")).toBeTruthy());

    fireEvent.press(view.getByText("Confirm"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Error", "Conflict");
    });
  });

  it("shows the empty state", async () => {
    (dataClient.listProviderBookings as jest.Mock).mockResolvedValue([]);

    const view = render(<ProviderBookingsScreen />);

    await waitFor(() => expect(view.getByText("Quiet so far.")).toBeTruthy());
  });
});
