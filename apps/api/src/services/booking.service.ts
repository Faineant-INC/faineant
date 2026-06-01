import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";
import { CreateBookingInput } from "@faineant/shared";
import { BOOKING_STATUS_TRANSITIONS, BookingStatus } from "@faineant/shared";
import { sendEmail } from "./email";
import { bookingConfirmationEmail, cancellationEmail } from "./email-templates";

/** Humanise a start time in the practitioner's market timezone (Chicago). */
function humaniseWhen(startTime: Date): string {
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "America/Chicago",
  }).format(startTime);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(startTime);
  return `on ${day} at ${time}`;
}

type ClientFields = { firstName: string; email: string };
type PractitionerFields = { firstName: string; lastName: string };

function practitionerName(user: PractitionerFields): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export async function createBooking(clientId: string, input: CreateBookingInput) {
  const service = await prisma.service.findUnique({
    where: { id: input.serviceId },
    include: { providerProfile: true },
  });

  if (!service || !service.isActive) {
    throw new AppError(404, "NOT_FOUND", "Service not found or inactive");
  }

  const startTime = new Date(input.startTime);
  const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

  // Wrap conflict check + creation in a serializable transaction to prevent race conditions
  const booking = await prisma.$transaction(async (tx) => {
    // Check for conflicting bookings
    const conflict = await tx.booking.findFirst({
      where: {
        providerProfileId: service.providerProfileId,
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (conflict) {
      throw new AppError(409, "SLOT_UNAVAILABLE", "This time slot is no longer available");
    }

    return tx.booking.create({
      data: {
        clientId,
        serviceId: input.serviceId,
        providerProfileId: service.providerProfileId,
        startTime,
        endTime,
        totalPriceInCents: service.priceInCents,
        notes: input.notes,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
      },
      include: {
        service: true,
        client: { select: { firstName: true, lastName: true, email: true } },
        providerProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }, {
    isolationLevel: "Serializable",
  });

  // Confirm to the client. A send failure must not undo a committed booking.
  const client = booking.client as ClientFields;
  try {
    await sendEmail(
      bookingConfirmationEmail({
        reservationId: booking.id,
        firstName: client.firstName,
        practitionerName: practitionerName(booking.providerProfile.user),
        neighbourhood: booking.location ?? "home",
        whenHumanised: humaniseWhen(booking.startTime),
      }),
      client.email,
      { idempotencyKey: `booking-confirmation/${booking.id}` },
    );
  } catch (err) {
    console.error("[booking] failed to send confirmation email", err);
  }

  return booking;
}

export async function updateBookingStatus(
  bookingId: string,
  userId: string,
  newStatus: BookingStatus,
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { providerProfile: true },
  });

  if (!booking) throw new AppError(404, "NOT_FOUND", "Booking not found");

  // Only the client or the provider can update
  const isClient = booking.clientId === userId;
  const isProvider = booking.providerProfile.userId === userId;
  if (!isClient && !isProvider) {
    throw new AppError(403, "FORBIDDEN", "Not authorized to update this booking");
  }

  // Validate status transition
  const allowed = BOOKING_STATUS_TRANSITIONS[booking.status as BookingStatus];
  if (!allowed?.includes(newStatus)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `Cannot transition from ${booking.status} to ${newStatus}`,
    );
  }

  // Only clients can cancel; only providers can confirm/complete/no-show
  if (newStatus === "CANCELLED" && !isClient && !isProvider) {
    throw new AppError(403, "FORBIDDEN", "Not authorized");
  }
  if (["CONFIRMED", "IN_PROGRESS", "COMPLETED", "NO_SHOW"].includes(newStatus) && !isProvider) {
    throw new AppError(403, "FORBIDDEN", "Only the provider can perform this action");
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: newStatus },
    include: {
      service: true,
      client: { select: { id: true, firstName: true, lastName: true, email: true } },
      providerProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });

  if (newStatus === "CANCELLED") {
    const client = updated.client as ClientFields;
    try {
      await sendEmail(
        cancellationEmail({
          firstName: client.firstName,
          reservationId: updated.id,
          practitionerName: practitionerName(updated.providerProfile.user),
        }),
        client.email,
        { idempotencyKey: `booking-cancellation/${updated.id}` },
      );
    } catch (err) {
      console.error("[booking] failed to send cancellation email", err);
    }
  }

  return updated;
}

export async function getClientBookings(clientId: string, status?: BookingStatus) {
  return prisma.booking.findMany({
    where: {
      clientId,
      ...(status && { status }),
    },
    include: {
      service: true,
      providerProfile: {
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
      },
    },
    orderBy: { startTime: "desc" },
  });
}

export async function getProviderBookings(userId: string, status?: BookingStatus) {
  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(404, "NOT_FOUND", "Provider profile not found");

  return prisma.booking.findMany({
    where: {
      providerProfileId: profile.id,
      ...(status && { status }),
    },
    include: {
      service: true,
      client: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
    orderBy: { startTime: "desc" },
  });
}
