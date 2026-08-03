import type { Database, ServiceCategorySlug } from "@faineant/shared";
import { supabase } from "./supabase";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type ServiceCategory = Database["public"]["Enums"]["service_category"];

const CATEGORY_FILTERS: Record<ServiceCategorySlug, ServiceCategory[]> = {
  hair: ["HAIRCUT", "COLOR", "BRAIDS", "LOCS"],
  nails: ["NAILS"],
  face: ["FACIAL", "BROWS", "WAXING"],
  lash: ["LASHES"],
  barber: ["FADE", "BEARD", "HAIRCUT"],
  makeup: ["MAKEUP"],
};

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  fail(error);
  if (!data.user) throw new Error("You must be signed in.");
  return data.user.id;
}

export interface MobileUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface BookableService {
  id: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  durationMinutes: number;
  priceInCents: number;
  providerProfileId: string;
  providerName: string;
}

export interface AvailableDay {
  dateKey: string;
  dayLabel: string;
  dateLabel: string;
  slots: { startTime: string; label: string }[];
}

function mapUser(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  profile?: { first_name: string; last_name: string; role: string } | null,
): MobileUser {
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? "",
    firstName: profile?.first_name ?? String(metadata.first_name ?? ""),
    lastName: profile?.last_name ?? String(metadata.last_name ?? ""),
    role: profile?.role ?? String(metadata.role ?? "CLIENT"),
  };
}

export async function signIn(email: string, password: string): Promise<MobileUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  fail(error);
  if (!data.user || !data.session) throw new Error("Sign in did not create a session.");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name,last_name,role,is_active")
    .eq("id", data.user.id)
    .single();
  fail(profileError);
  if (!profile) throw new Error("Account profile not found.");
  if (!profile.is_active) {
    await supabase.auth.signOut({ scope: "local" });
    throw new Error("This account is disabled.");
  }
  if (profile.role === "ADMIN") {
    await supabase.auth.signOut({ scope: "local" });
    throw new Error("Administrator accounts use the web console.");
  }
  return mapUser(data.user, profile);
}

export async function signUp(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "CLIENT" | "PROVIDER";
}): Promise<{ user: MobileUser; hasSession: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        role: input.role,
      },
    },
  });
  fail(error);
  if (!data.user) throw new Error("Registration did not create a user.");
  return {
    user: mapUser(data.user),
    hasSession: Boolean(data.session),
  };
}

export async function listProviders(): Promise<
  {
    id: string;
    slug: string;
    businessName: string | null;
    bio: string | null;
    averageRating: number;
    totalReviews: number;
    distance: number | null;
    user: { firstName: string; lastName: string };
    services: { name: string; priceInCents: number }[];
  }[]
> {
  const { data: providers, error } = await supabase.rpc("search_providers", {
    p_limit: 100,
    p_offset: 0,
  });
  fail(error);
  const ids = (providers ?? []).flatMap((provider) =>
    provider.id ? [provider.id] : [],
  );
  const serviceResult = ids.length
    ? await supabase
        .from("services")
        .select("provider_profile_id,name,price_in_cents")
        .in("provider_profile_id", ids)
        .eq("is_active", true)
    : { data: [], error: null };
  fail(serviceResult.error);
  const servicesByProvider = new Map<
    string,
    { name: string; priceInCents: number }[]
  >();
  for (const service of serviceResult.data ?? []) {
    const items = servicesByProvider.get(service.provider_profile_id) ?? [];
    items.push({ name: service.name, priceInCents: service.price_in_cents });
    servicesByProvider.set(service.provider_profile_id, items);
  }
  return (providers ?? []).flatMap((provider) =>
    provider.id && provider.slug
      ? [
          {
            id: provider.id,
            slug: provider.slug,
            businessName: provider.business_name,
            bio: provider.bio,
            averageRating: provider.average_rating ?? 0,
            totalReviews: provider.total_reviews ?? 0,
            distance: null,
            user: {
              firstName: provider.first_name ?? "",
              lastName: provider.last_name ?? "",
            },
            services: servicesByProvider.get(provider.id) ?? [],
          },
        ]
      : [],
  );
}

export async function listBookableServices(
  category?: ServiceCategorySlug,
): Promise<BookableService[]> {
  const { data: providers, error: providerError } = await supabase.rpc(
    "search_providers",
    { p_limit: 100, p_offset: 0 },
  );
  fail(providerError);
  const providerIds = (providers ?? []).flatMap((provider) =>
    provider.id ? [provider.id] : [],
  );
  if (providerIds.length === 0) return [];

  let query = supabase
    .from("services")
    .select(
      "id,provider_profile_id,name,description,category,duration_minutes,price_in_cents",
    )
    .in("provider_profile_id", providerIds)
    .eq("is_active", true)
    .order("price_in_cents");
  if (category) query = query.in("category", CATEGORY_FILTERS[category]);
  const { data: services, error } = await query;
  fail(error);

  const providersById = new Map(
    (providers ?? []).flatMap((provider) =>
      provider.id
        ? [[
            provider.id,
            `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim() ||
              provider.business_name ||
              "Faineant practitioner",
          ] as const]
        : [],
    ),
  );
  return (services ?? []).map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    category: service.category,
    durationMinutes: service.duration_minutes,
    priceInCents: service.price_in_cents,
    providerProfileId: service.provider_profile_id,
    providerName:
      providersById.get(service.provider_profile_id) ?? "Faineant practitioner",
  }));
}

function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function atLocalTime(date: Date, value: string): Date {
  const [hours = "0", minutes = "0"] = value.split(":");
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Number(hours),
    Number(minutes),
  );
}

export async function listAvailableDays(input: {
  providerProfileId: string;
  durationMinutes: number;
  days?: number;
}): Promise<AvailableDay[]> {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + (input.days ?? 14));
  const [availability, overrides, busy] = await Promise.all([
    supabase
      .from("availability")
      .select("day_of_week,start_time,end_time")
      .eq("provider_profile_id", input.providerProfileId)
      .order("start_time"),
    supabase
      .from("availability_overrides")
      .select("date,is_blocked,start_time,end_time")
      .eq("provider_profile_id", input.providerProfileId)
      .gte("date", localDateKey(start))
      .lte("date", localDateKey(end)),
    supabase.rpc("get_provider_busy_intervals", {
      p_provider_profile_id: input.providerProfileId,
      p_from: start.toISOString(),
      p_to: end.toISOString(),
    }),
  ]);
  fail(availability.error);
  fail(overrides.error);
  fail(busy.error);

  const earliest = Date.now() + 30 * 60_000;
  const result: AvailableDay[] = [];
  for (let offset = 0; offset < (input.days ?? 14); offset += 1) {
    const date = new Date(start);
    date.setHours(12, 0, 0, 0);
    date.setDate(start.getDate() + offset);
    const dateKey = localDateKey(date);
    const dateOverrides = (overrides.data ?? []).filter(
      (entry) => entry.date === dateKey,
    );
    if (dateOverrides.some((entry) => entry.is_blocked)) continue;

    const overrideWindows = dateOverrides.flatMap((entry) =>
      entry.start_time && entry.end_time
        ? [{ start_time: entry.start_time, end_time: entry.end_time }]
        : [],
    );
    const windows =
      overrideWindows.length > 0
        ? overrideWindows
        : (availability.data ?? []).filter(
            (entry) => entry.day_of_week === date.getDay(),
          );
    const slots: { startTime: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const window of windows) {
      const windowEnd = atLocalTime(date, window.end_time);
      for (
        let cursor = atLocalTime(date, window.start_time);
        cursor.getTime() + input.durationMinutes * 60_000 <= windowEnd.getTime();
        cursor = new Date(cursor.getTime() + 30 * 60_000)
      ) {
        const slotEnd = new Date(
          cursor.getTime() + input.durationMinutes * 60_000,
        );
        const overlaps = (busy.data ?? []).some(
          (interval) =>
            cursor < new Date(interval.end_time) &&
            slotEnd > new Date(interval.start_time),
        );
        const iso = cursor.toISOString();
        if (cursor.getTime() >= earliest && !overlaps && !seen.has(iso)) {
          seen.add(iso);
          slots.push({
            startTime: iso,
            label: new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }).format(cursor),
          });
        }
      }
    }
    if (slots.length > 0) {
      result.push({
        dateKey,
        dayLabel:
          offset === 0
            ? "Today"
            : offset === 1
              ? "Tomorrow"
              : new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date),
        dateLabel: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(date),
        slots,
      });
    }
  }
  return result;
}

export async function getMyBookingProfile(): Promise<{
  streetAddress: string;
  neighbourhood: string;
}> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("street_address,neighbourhood")
    .eq("id", userId)
    .single();
  fail(error);
  if (!data) throw new Error("Account profile not found.");
  return {
    streetAddress: data.street_address ?? "",
    neighbourhood: data.neighbourhood ?? "",
  };
}

export async function createBooking(input: {
  serviceId: string;
  startTime: string;
  location: string;
  notes?: string;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc("create_booking", {
    p_service_id: input.serviceId,
    p_start_time: input.startTime,
    p_location: input.location,
    p_notes: input.notes?.trim() || undefined,
  });
  fail(error);
  if (!data?.id) throw new Error("The reservation was not created.");
  return { id: data.id };
}

export async function listClientBookings(): Promise<
  {
    id: string;
    status: string;
    startTime: string;
    totalPriceInCents: number;
    service: { name: string };
    providerProfile: { user: { firstName: string; lastName: string } };
  }[]
> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id,status,start_time,total_price_in_cents,provider_profile_id,service:services(name)")
    .order("start_time", { ascending: false });
  fail(error);
  const { data: providers, error: providerError } = await supabase.rpc(
    "search_providers",
    { p_limit: 1000, p_offset: 0 },
  );
  fail(providerError);
  const providerById = new Map((providers ?? []).map((p) => [p.id, p]));
  return (data ?? []).map((booking) => {
    const service = booking.service as { name: string } | null;
    const provider = providerById.get(booking.provider_profile_id);
    return {
      id: booking.id,
      status: booking.status,
      startTime: booking.start_time,
      totalPriceInCents: booking.total_price_in_cents,
      service: { name: service?.name ?? "Service" },
      providerProfile: {
        user: {
          firstName: provider?.first_name ?? "",
          lastName: provider?.last_name ?? "",
        },
      },
    };
  });
}

export async function listProviderBookings(): Promise<
  {
    id: string;
    status: string;
    startTime: string;
    endTime: string;
    totalPriceInCents: number;
    notes: string | null;
    service: { name: string };
    client: { firstName: string; lastName: string };
  }[]
> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,status,start_time,end_time,total_price_in_cents,notes,service:services(name),client:profiles!bookings_client_id_fkey(first_name,last_name)",
    )
    .order("start_time", { ascending: true });
  fail(error);
  return (data ?? []).map((booking) => {
    const service = booking.service as { name: string } | null;
    const client = booking.client as {
      first_name: string;
      last_name: string;
    } | null;
    return {
      id: booking.id,
      status: booking.status,
      startTime: booking.start_time,
      endTime: booking.end_time,
      totalPriceInCents: booking.total_price_in_cents,
      notes: booking.notes,
      service: { name: service?.name ?? "Service" },
      client: {
        firstName: client?.first_name ?? "",
        lastName: client?.last_name ?? "",
      },
    };
  });
}

export async function updateBookingStatus(
  bookingId: string,
  status: string,
): Promise<void> {
  const { error } = await supabase.rpc("update_booking_status", {
    p_booking_id: bookingId,
    p_new_status: status as BookingStatus,
  });
  fail(error);
}

export async function listConversations(): Promise<
  {
    id: string;
    otherParticipant: { id: string; firstName: string; lastName: string };
    lastMessage: { text: string; createdAt: string } | null;
  }[]
> {
  const userId = await currentUserId();
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id,participant_a_id,participant_b_id,last_message_at")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  fail(error);
  const otherIds = (conversations ?? []).map((conversation) =>
    conversation.participant_a_id === userId
      ? conversation.participant_b_id
      : conversation.participant_a_id,
  );
  const profileResult = otherIds.length
    ? await supabase
        .from("profiles")
        .select("id,first_name,last_name")
        .in("id", otherIds)
    : { data: [], error: null };
  fail(profileResult.error);
  const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
  const messageResult = conversationIds.length
    ? await supabase
        .from("messages")
        .select("conversation_id,text,created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  fail(messageResult.error);
  const profileById = new Map((profileResult.data ?? []).map((p) => [p.id, p]));
  const lastMessageByConversation = new Map<
    string,
    { text: string; createdAt: string }
  >();
  for (const message of messageResult.data ?? []) {
    if (!lastMessageByConversation.has(message.conversation_id)) {
      lastMessageByConversation.set(message.conversation_id, {
        text: message.text,
        createdAt: message.created_at,
      });
    }
  }
  return (conversations ?? []).map((conversation) => {
    const otherId =
      conversation.participant_a_id === userId
        ? conversation.participant_b_id
        : conversation.participant_a_id;
    const profile = profileById.get(otherId);
    return {
      id: conversation.id,
      otherParticipant: {
        id: otherId,
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
      },
      lastMessage: lastMessageByConversation.get(conversation.id) ?? null,
    };
  });
}

export async function getEarnings(): Promise<{
  totalEarnings: number;
  payments: {
    id: string;
    providerPayoutInCents: number;
    createdAt: string;
    booking: { startTime: string; service: { name: string } };
  }[];
}> {
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id,provider_payout_in_cents,created_at,booking:bookings(start_time,service:services(name))",
    )
    .eq("status", "SUCCEEDED")
    .order("created_at", { ascending: false })
    .limit(100);
  fail(error);
  const payments = (data ?? []).flatMap((payment) => {
    const booking = payment.booking as {
      start_time: string;
      service: { name: string } | null;
    } | null;
    if (!booking) return [];
    return [
      {
        id: payment.id,
        providerPayoutInCents: payment.provider_payout_in_cents,
        createdAt: payment.created_at,
        booking: {
          startTime: booking.start_time,
          service: { name: booking.service?.name ?? "Service" },
        },
      },
    ];
  });
  return {
    totalEarnings: payments.reduce(
      (sum, payment) => sum + payment.providerPayoutInCents,
      0,
    ),
    payments,
  };
}
