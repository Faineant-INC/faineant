import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import * as dataClient from "@/lib/data-client";
import MessagesScreen from "@/app/(client)/messages";

jest.mock("@/lib/data-client");

beforeEach(() => {
  jest.clearAllMocks();
});

const mockConversations = [
  {
    id: "c1",
    otherParticipant: { id: "u2", firstName: "Marcus", lastName: "Johnson" },
    lastMessage: { text: "See you tomorrow at 10!", createdAt: "2026-03-27T15:00:00Z" },
  },
  {
    id: "c2",
    otherParticipant: { id: "u3", firstName: "Sarah", lastName: "Lee" },
    lastMessage: null,
  },
];

describe("MessagesScreen", () => {
  it("loads conversations from Supabase", async () => {
    (dataClient.listConversations as jest.Mock).mockResolvedValueOnce(mockConversations);

    render(<MessagesScreen />);

    await waitFor(() => {
      expect(dataClient.listConversations).toHaveBeenCalledWith();
    });
  });

  it("displays conversation participant names", async () => {
    (dataClient.listConversations as jest.Mock).mockResolvedValueOnce(mockConversations);

    const { getByText } = render(<MessagesScreen />);

    await waitFor(() => {
      expect(getByText("Marcus Johnson")).toBeTruthy();
      expect(getByText("Sarah Lee")).toBeTruthy();
    });
  });

  it("displays last message preview", async () => {
    (dataClient.listConversations as jest.Mock).mockResolvedValueOnce(mockConversations);

    const { getByText } = render(<MessagesScreen />);

    await waitFor(() => {
      expect(getByText("See you tomorrow at 10!")).toBeTruthy();
    });
  });

  it("renders avatar initials", async () => {
    (dataClient.listConversations as jest.Mock).mockResolvedValueOnce(mockConversations);

    const { getByText } = render(<MessagesScreen />);

    await waitFor(() => {
      expect(getByText("MJ")).toBeTruthy();
      expect(getByText("SL")).toBeTruthy();
    });
  });

  it("shows empty state when no conversations", async () => {
    (dataClient.listConversations as jest.Mock).mockResolvedValueOnce([]);

    const { getByText } = render(<MessagesScreen />);

    await waitFor(() => {
      expect(
        getByText(
          "Most clients don’t message. The few who do are usually about parking.",
        ),
      ).toBeTruthy();
    });
  });

});
