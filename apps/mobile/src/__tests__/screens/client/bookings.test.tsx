import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import * as dataClient from "@/lib/data-client";
import ClientBookingsScreen from "@/app/(client)/bookings";

jest.mock("@/lib/data-client");

beforeEach(() => {
  jest.clearAllMocks();
});

const mockBookings = [
  {
    id: "b1",
    status: "CONFIRMED",
    startTime: "2026-03-28T10:00:00.000Z",
    totalPriceInCents: 3500,
    service: { name: "Haircut" },
    providerProfile: { user: { firstName: "Marcus", lastName: "Johnson" } },
  },
  {
    id: "b2",
    status: "COMPLETED",
    startTime: "2026-03-25T14:00:00.000Z",
    totalPriceInCents: 7500,
    service: { name: "Hair Color" },
    providerProfile: { user: { firstName: "Sarah", lastName: "Lee" } },
  },
  {
    id: "b3",
    status: "PENDING",
    startTime: "2026-03-30T09:00:00.000Z",
    totalPriceInCents: 5000,
    service: { name: "Braids" },
    providerProfile: { user: { firstName: "Lisa", lastName: "Chen" } },
  },
];

describe("ClientBookingsScreen", () => {
  it("loads bookings from Supabase", async () => {
    (dataClient.listClientBookings as jest.Mock).mockResolvedValueOnce(mockBookings);

    render(<ClientBookingsScreen />);

    await waitFor(() => {
      expect(dataClient.listClientBookings).toHaveBeenCalledWith();
    });
  });

  it("renders editorial header", async () => {
    (dataClient.listClientBookings as jest.Mock).mockResolvedValueOnce(mockBookings);

    const { getByText } = render(<ClientBookingsScreen />);

    await waitFor(() => {
      expect(getByText("YOUR VISITS")).toBeTruthy();
      expect(getByText("calendar.")).toBeTruthy();
    });
  });

  it("displays the next upcoming visit in the hero card", async () => {
    (dataClient.listClientBookings as jest.Mock).mockResolvedValueOnce(mockBookings);

    const { getByText } = render(<ClientBookingsScreen />);

    await waitFor(() => {
      expect(getByText("Next visit")).toBeTruthy();
      expect(getByText("Haircut")).toBeTruthy();
    });
  });

  it("displays past visits with service names and providers", async () => {
    (dataClient.listClientBookings as jest.Mock).mockResolvedValueOnce(mockBookings);

    const { getByText } = render(<ClientBookingsScreen />);

    await waitFor(() => {
      expect(getByText("Past visits")).toBeTruthy();
      expect(getByText("Hair Color")).toBeTruthy();
    });
  });

  it("displays past visit price as whole dollars", async () => {
    (dataClient.listClientBookings as jest.Mock).mockResolvedValueOnce(mockBookings);

    const { getByText } = render(<ClientBookingsScreen />);

    await waitFor(() => {
      expect(getByText("$75")).toBeTruthy();
    });
  });

  it("shows empty hero card when no bookings", async () => {
    (dataClient.listClientBookings as jest.Mock).mockResolvedValueOnce([]);

    const { getByText } = render(<ClientBookingsScreen />);

    await waitFor(() => {
      expect(getByText("Nothing scheduled")).toBeTruthy();
      expect(getByText("The calendar is empty.")).toBeTruthy();
    });
  });

});
