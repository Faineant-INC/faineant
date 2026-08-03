import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import * as dataClient from "@/lib/data-client";
import ProviderHomeScreen from "@/app/(provider)/home";

jest.mock("@/lib/data-client");

beforeEach(() => {
  jest.clearAllMocks();
});

// Build ISO strings that resolve to "today" in any local timezone by anchoring
// to noon local time so that the UTC representation still falls on the same
// calendar day when converted back via toDateString().
function todayAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const mockBookings = [
  {
    id: "b1",
    status: "CONFIRMED",
    startTime: todayAt(10),
    endTime: todayAt(10, 30),
    service: { name: "Haircut" },
    client: { firstName: "John", lastName: "Doe" },
  },
  {
    id: "b2",
    status: "PENDING",
    startTime: todayAt(14),
    endTime: todayAt(15),
    service: { name: "Hair Color" },
    client: { firstName: "Jane", lastName: "Smith" },
  },
  {
    id: "b3",
    status: "CONFIRMED",
    startTime: "2025-01-01T10:00:00.000Z",
    endTime: "2025-01-01T10:30:00.000Z",
    service: { name: "Old Booking" },
    client: { firstName: "Old", lastName: "Client" },
  },
];

describe("ProviderHomeScreen", () => {
  it("renders today's schedule header", () => {
    (dataClient.listProviderBookings as jest.Mock).mockReturnValueOnce(
      new Promise(() => {}),
    );

    const { getByText } = render(<ProviderHomeScreen />);
    expect(getByText("TODAY")).toBeTruthy();
    expect(getByText("calendar.")).toBeTruthy();
  });

  it("loads bookings from Supabase", async () => {
    (dataClient.listProviderBookings as jest.Mock).mockResolvedValueOnce(mockBookings);

    render(<ProviderHomeScreen />);

    await waitFor(() => {
      expect(dataClient.listProviderBookings).toHaveBeenCalledWith();
    });
  });

  it("filters to show only today's bookings", async () => {
    (dataClient.listProviderBookings as jest.Mock).mockResolvedValueOnce(mockBookings);

    const { getByText, queryByText } = render(<ProviderHomeScreen />);

    await waitFor(() => {
      expect(getByText("Haircut")).toBeTruthy();
      expect(getByText("Hair Color")).toBeTruthy();
      expect(queryByText("Old Booking")).toBeNull();
    });
  });

  it("displays client names", async () => {
    (dataClient.listProviderBookings as jest.Mock).mockResolvedValueOnce(mockBookings);

    const { getByText } = render(<ProviderHomeScreen />);

    await waitFor(() => {
      expect(getByText("John Doe")).toBeTruthy();
      expect(getByText("Jane Smith")).toBeTruthy();
    });
  });

  it("shows empty state when no bookings today", async () => {
    (dataClient.listProviderBookings as jest.Mock).mockResolvedValueOnce([
      mockBookings[2],
    ]);

    const { getByText } = render(<ProviderHomeScreen />);

    await waitFor(() => {
      expect(getByText("Nothing on the books.")).toBeTruthy();
    });
  });

});
