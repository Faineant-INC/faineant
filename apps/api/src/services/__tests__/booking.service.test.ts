import { describe, it, expect, beforeEach, vi } from "vitest";

// Hoisted spies/state so vi.mock factories can reference them.
const { sendEmailSpy, db } = vi.hoisted(() => ({
  sendEmailSpy: vi.fn(async (..._args: unknown[]) => ({ delivered: false })),
  db: {
    service: { findUnique: vi.fn() },
    booking: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  } as Record<string, any>,
}));

vi.mock("../../config/database", () => ({
  prisma: {
    ...db,
    // Function form used by createBooking; runs the callback against the same mock.
    $transaction: vi.fn(async (arg: unknown) =>
      typeof arg === "function" ? (arg as (tx: unknown) => unknown)(db) : Promise.all(arg as Promise<unknown>[]),
    ),
  },
}));

vi.mock("../email", () => ({ sendEmail: sendEmailSpy }));

import * as bookingService from "../booking.service";

const SERVICE = {
  id: "svc_1",
  isActive: true,
  durationMinutes: 60,
  priceInCents: 12_000,
  providerProfileId: "pp_1",
  providerProfile: { id: "pp_1" },
};

function createdBookingRow() {
  return {
    id: "bk_1",
    status: "PENDING",
    startTime: new Date("2026-06-04T19:00:00.000Z"),
    location: "Wicker Park",
    clientId: "client_1",
    service: { name: "Signature Cut", durationMinutes: 60 },
    client: { firstName: "Sasha", lastName: "Vega", email: "sasha@example.com" },
    providerProfile: { user: { firstName: "Maeve", lastName: "Le Gal" } },
  };
}

describe("booking.service email side-effects", () => {
  beforeEach(() => {
    sendEmailSpy.mockClear();
    db.service.findUnique.mockReset();
    db.booking.findFirst.mockReset();
    db.booking.create.mockReset();
    db.booking.findUnique.mockReset();
    db.booking.update.mockReset();
  });

  describe("createBooking", () => {
    it("emails the client a booking confirmation", async () => {
      db.service.findUnique.mockResolvedValue(SERVICE);
      db.booking.findFirst.mockResolvedValue(null);
      db.booking.create.mockResolvedValue(createdBookingRow());

      await bookingService.createBooking("client_1", {
        serviceId: "svc_1",
        startTime: "2026-06-04T19:00:00.000Z",
      });

      expect(sendEmailSpy).toHaveBeenCalledOnce();
      const [rendered, to, opts] = sendEmailSpy.mock.calls[0] as [
        { subject: string },
        string,
        { idempotencyKey: string },
      ];
      expect(rendered.subject.toLowerCase()).toContain("booked");
      expect(to).toBe("sasha@example.com");
      expect(opts.idempotencyKey).toBe("booking-confirmation/bk_1");
    });

    it("does not fail the booking if the email send throws", async () => {
      db.service.findUnique.mockResolvedValue(SERVICE);
      db.booking.findFirst.mockResolvedValue(null);
      db.booking.create.mockResolvedValue(createdBookingRow());
      sendEmailSpy.mockRejectedValueOnce(new Error("resend down"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      const booking = await bookingService.createBooking("client_1", {
        serviceId: "svc_1",
        startTime: "2026-06-04T19:00:00.000Z",
      });

      expect(booking.id).toBe("bk_1");
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe("updateBookingStatus", () => {
    function existingBooking(status = "PENDING") {
      return {
        id: "bk_1",
        status,
        clientId: "client_1",
        providerProfile: { userId: "prov_user_1" },
      };
    }

    function updatedRow(status: string) {
      return {
        id: "bk_1",
        status,
        client: { firstName: "Sasha", lastName: "Vega", email: "sasha@example.com" },
        service: { name: "Signature Cut" },
        providerProfile: { user: { firstName: "Maeve", lastName: "Le Gal" } },
      };
    }

    it("emails the client a cancellation when a booking is cancelled", async () => {
      db.booking.findUnique.mockResolvedValue(existingBooking("PENDING"));
      db.booking.update.mockResolvedValue(updatedRow("CANCELLED"));

      await bookingService.updateBookingStatus("bk_1", "client_1", "CANCELLED");

      expect(sendEmailSpy).toHaveBeenCalledOnce();
      const [rendered, to, opts] = sendEmailSpy.mock.calls[0] as [
        { subject: string },
        string,
        { idempotencyKey: string },
      ];
      expect(rendered.subject.toLowerCase()).toContain("leave");
      expect(to).toBe("sasha@example.com");
      expect(opts.idempotencyKey).toBe("booking-cancellation/bk_1");
    });

    it("does not email on non-cancellation transitions", async () => {
      db.booking.findUnique.mockResolvedValue(existingBooking("PENDING"));
      db.booking.update.mockResolvedValue(updatedRow("CONFIRMED"));

      await bookingService.updateBookingStatus("bk_1", "prov_user_1", "CONFIRMED");

      expect(sendEmailSpy).not.toHaveBeenCalled();
    });
  });
});
