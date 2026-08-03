"use client";

import type { Database } from "@faineant/shared";
import { createClient } from "@/lib/supabase/client";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type ServiceCategory = Database["public"]["Enums"]["service_category"];

const supabase = createClient();

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  fail(error);
  if (!data.user) throw new Error("You must be signed in.");
  return data.user.id;
}

async function currentProviderId(): Promise<string> {
  const { data, error } = await supabase.rpc("my_provider_profile_id");
  fail(error);
  if (!data) throw new Error("Provider profile not found.");
  return data;
}

export interface ClientBooking {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  totalPriceInCents: number;
  location: string | null;
  notes: string | null;
  service: { name: string; category: string; durationMinutes: number };
  providerProfile?: {
    user?: { firstName?: string; lastName?: string; avatarUrl?: string | null };
    businessName?: string;
  };
}

export interface ProviderBooking {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  totalPriceInCents: number;
  notes: string | null;
  location: string | null;
  service: { name: string; category?: string; durationMinutes?: number } | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    phone?: string;
  } | null;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  durationMinutes: number;
  priceInCents: number;
  isActive: boolean;
}

export interface CalendarConnectionData {
  id: string;
  provider: "GOOGLE" | "ICS_FEED";
  externalId: string | null;
  feedUrl: string | null;
  lastSyncedAt: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { externalEvents: number };
}

export interface EarningsData {
  totalEarnings: number;
  payments: {
    id: string;
    providerPayoutInCents: number;
    createdAt: string;
    booking: { startTime: string; service: { name: string } | null } | null;
  }[];
}

export interface ConversationSummary {
  id: string;
  otherParticipant: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  lastMessage: { text: string; createdAt: string; readAt: string | null } | null;
}

export interface MyProfileDetails {
  firstName: string;
  lastName: string;
  streetAddress: string;
  neighbourhood: string;
  notificationReminders: boolean;
  notificationRebooking: boolean;
  notificationNewsletter: boolean;
}

export async function resendVerification(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: "signup", email });
  fail(error);
}

export async function getAdminStats(): Promise<{
  totalUsers: number;
  totalProviders: number;
  totalBookings: number;
  totalRevenue: number;
}> {
  const [users, providers, bookings, payments] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("provider_profiles")
      .select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase
      .from("payments")
      .select("platform_fee_in_cents")
      .eq("status", "SUCCEEDED"),
  ]);
  fail(users.error);
  fail(providers.error);
  fail(bookings.error);
  fail(payments.error);
  return {
    totalUsers: users.count ?? 0,
    totalProviders: providers.count ?? 0,
    totalBookings: bookings.count ?? 0,
    totalRevenue: (payments.data ?? []).reduce(
      (sum, payment) => sum + payment.platform_fee_in_cents,
      0,
    ),
  };
}

export async function getMyProfileDetails(): Promise<MyProfileDetails> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "first_name,last_name,street_address,neighbourhood,notification_reminders,notification_rebooking,notification_newsletter",
    )
    .eq("id", userId)
    .single();
  fail(error);
  if (!data) throw new Error("Account profile not found.");
  return {
    firstName: data.first_name,
    lastName: data.last_name,
    streetAddress: data.street_address ?? "",
    neighbourhood: data.neighbourhood ?? "",
    notificationReminders: data.notification_reminders,
    notificationRebooking: data.notification_rebooking,
    notificationNewsletter: data.notification_newsletter,
  };
}

export async function updateMyProfile(input: {
  firstName: string;
  lastName: string;
  streetAddress: string;
  neighbourhood: string;
  notificationReminders: boolean;
  notificationRebooking: boolean;
  notificationNewsletter: boolean;
}): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      street_address: input.streetAddress.trim() || null,
      neighbourhood: input.neighbourhood || null,
      notification_reminders: input.notificationReminders,
      notification_rebooking: input.notificationRebooking,
      notification_newsletter: input.notificationNewsletter,
    })
    .eq("id", userId);
  fail(error);
}

export async function listConversations(): Promise<ConversationSummary[]> {
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
  const conversationIds = (conversations ?? []).map(({ id }) => id);
  const [profiles, messages] = await Promise.all([
    otherIds.length
      ? supabase
          .from("profiles")
          .select("id,first_name,last_name,avatar_url")
          .in("id", otherIds)
      : Promise.resolve({ data: [], error: null }),
    conversationIds.length
      ? supabase
          .from("messages")
          .select("conversation_id,text,created_at,read_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  fail(profiles.error);
  fail(messages.error);

  const profilesById = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
  const lastMessageByConversation = new Map<
    string,
    { text: string; createdAt: string; readAt: string | null }
  >();
  for (const message of messages.data ?? []) {
    if (!lastMessageByConversation.has(message.conversation_id)) {
      lastMessageByConversation.set(message.conversation_id, {
        text: message.text,
        createdAt: message.created_at,
        readAt: message.read_at,
      });
    }
  }

  return (conversations ?? []).map((conversation) => {
    const otherId =
      conversation.participant_a_id === userId
        ? conversation.participant_b_id
        : conversation.participant_a_id;
    const profile = profilesById.get(otherId);
    return {
      id: conversation.id,
      otherParticipant: {
        id: otherId,
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        avatarUrl: profile?.avatar_url ?? null,
      },
      lastMessage: lastMessageByConversation.get(conversation.id) ?? null,
    };
  });
}

export async function listClientBookings(): Promise<ClientBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,status,start_time,end_time,total_price_in_cents,location,notes,provider_profile_id,service:services(name,category,duration_minutes)",
    )
    .order("start_time", { ascending: false });
  fail(error);

  const { data: providers, error: providerError } = await supabase.rpc(
    "search_providers",
    { p_limit: 1000, p_offset: 0 },
  );
  fail(providerError);
  const providerById = new Map((providers ?? []).map((p) => [p.id, p]));

  return (data ?? []).map((row) => {
    const service = row.service as {
      name: string;
      category: string;
      duration_minutes: number;
    } | null;
    const provider = providerById.get(row.provider_profile_id);
    return {
      id: row.id,
      status: row.status,
      startTime: row.start_time,
      endTime: row.end_time,
      totalPriceInCents: row.total_price_in_cents,
      location: row.location,
      notes: row.notes,
      service: {
        name: service?.name ?? "Service",
        category: service?.category ?? "OTHER",
        durationMinutes: service?.duration_minutes ?? 0,
      },
      providerProfile: provider
        ? {
            businessName: provider.business_name ?? undefined,
            user: {
              firstName: provider.first_name ?? undefined,
              lastName: provider.last_name ?? undefined,
              avatarUrl: provider.avatar_url,
            },
          }
        : undefined,
    };
  });
}

export async function listProviderBookings(
  status?: string,
): Promise<ProviderBooking[]> {
  let query = supabase
    .from("bookings")
    .select(
      "id,status,start_time,end_time,total_price_in_cents,notes,location,service:services(name,category,duration_minutes),client:profiles!bookings_client_id_fkey(id,first_name,last_name,avatar_url,phone)",
    )
    .order("start_time", { ascending: true });
  if (status) query = query.eq("status", status as BookingStatus);
  const { data, error } = await query;
  fail(error);
  return (data ?? []).map((row) => {
    const service = row.service as {
      name: string;
      category: string;
      duration_minutes: number;
    } | null;
    const client = row.client as {
      id: string;
      first_name: string;
      last_name: string;
      avatar_url: string | null;
      phone: string | null;
    } | null;
    return {
      id: row.id,
      status: row.status,
      startTime: row.start_time,
      endTime: row.end_time,
      totalPriceInCents: row.total_price_in_cents,
      notes: row.notes,
      location: row.location,
      service: service
        ? {
            name: service.name,
            category: service.category,
            durationMinutes: service.duration_minutes,
          }
        : null,
      client: client
        ? {
            id: client.id,
            firstName: client.first_name,
            lastName: client.last_name,
            avatarUrl: client.avatar_url,
            phone: client.phone ?? undefined,
          }
        : null,
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

export async function listMyServices(): Promise<ServiceItem[]> {
  const providerId = await currentProviderId();
  const { data, error } = await supabase
    .from("services")
    .select("id,name,description,category,duration_minutes,price_in_cents,is_active")
    .eq("provider_profile_id", providerId)
    .order("created_at", { ascending: true });
  fail(error);
  return (data ?? []).map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    category: service.category,
    durationMinutes: service.duration_minutes,
    priceInCents: service.price_in_cents,
    isActive: service.is_active,
  }));
}

export async function createService(input: {
  name: string;
  description?: string;
  category: string;
  durationMinutes: number;
  priceInCents: number;
}): Promise<void> {
  const providerId = await currentProviderId();
  const { error } = await supabase.from("services").insert({
    provider_profile_id: providerId,
    name: input.name,
    description: input.description ?? null,
    category: input.category as ServiceCategory,
    duration_minutes: input.durationMinutes,
    price_in_cents: input.priceInCents,
  });
  fail(error);
}

export async function getMyProviderProfile(): Promise<{
  bio?: string;
  businessName?: string;
  address?: string;
  serviceRadius?: number;
}> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("provider_profiles")
    .select("bio,business_name,address,service_radius")
    .eq("user_id", userId)
    .single();
  fail(error);
  return {
    bio: data?.bio ?? undefined,
    businessName: data?.business_name ?? undefined,
    address: data?.address ?? undefined,
    serviceRadius: data?.service_radius ?? undefined,
  };
}

export async function updateMyProviderProfile(input: {
  bio?: string;
  businessName?: string;
  address?: string;
  serviceRadius: number;
}): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase
    .from("provider_profiles")
    .update({
      bio: input.bio ?? null,
      business_name: input.businessName ?? null,
      address: input.address ?? null,
      service_radius: input.serviceRadius,
    })
    .eq("user_id", userId);
  fail(error);
}

export async function replaceAvailability(
  slots: { dayOfWeek: number; startTime: string; endTime: string }[],
): Promise<void> {
  const { error } = await supabase.rpc("replace_my_availability", {
    p_slots: slots,
  });
  fail(error);
}

export async function listMyAvailability(): Promise<
  { dayOfWeek: number; startTime: string; endTime: string }[]
> {
  const providerId = await currentProviderId();
  const { data, error } = await supabase
    .from("availability")
    .select("day_of_week,start_time,end_time")
    .eq("provider_profile_id", providerId)
    .order("day_of_week")
    .order("start_time");
  fail(error);
  return (data ?? []).map((slot) => ({
    dayOfWeek: slot.day_of_week,
    startTime: slot.start_time,
    endTime: slot.end_time,
  }));
}

export async function listCalendarConnections(): Promise<CalendarConnectionData[]> {
  const { data, error } = await supabase
    .from("calendar_connections_safe")
    .select("id,provider,external_id,feed_url,last_synced_at,is_active,created_at,external_event_count")
    .order("created_at", { ascending: false });
  fail(error);
  return (data ?? []).flatMap((connection) =>
    connection.id &&
    connection.provider &&
    connection.created_at &&
    connection.is_active !== null
      ? [{
          id: connection.id,
          provider: connection.provider,
          externalId: connection.external_id,
          feedUrl: connection.feed_url,
          lastSyncedAt: connection.last_synced_at,
          isActive: connection.is_active,
          createdAt: connection.created_at,
          _count: { externalEvents: connection.external_event_count ?? 0 },
        }]
      : [],
  );
}

export async function invokeCalendar<T>(
  functionName: "calendar-google-connect" | "calendar-ics-connect" | "calendar-sync",
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  });
  fail(error);
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function disconnectCalendar(connectionId: string): Promise<void> {
  const { error } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("id", connectionId);
  fail(error);
}

export async function listPortfolio(): Promise<
  { id: string; imageUrl: string; caption: string | null }[]
> {
  const providerId = await currentProviderId();
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("id,image_url,caption")
    .eq("provider_profile_id", providerId)
    .order("sort_order", { ascending: true });
  fail(error);
  return (data ?? []).map((item) => ({
    id: item.id,
    imageUrl: item.image_url,
    caption: item.caption,
  }));
}

export async function addPortfolioItem(input: {
  imageUrl: string;
  caption?: string;
}): Promise<void> {
  const providerId = await currentProviderId();
  const { error } = await supabase.from("portfolio_items").insert({
    provider_profile_id: providerId,
    image_url: input.imageUrl,
    caption: input.caption ?? null,
  });
  fail(error);
}

export async function deletePortfolioItem(id: string): Promise<void> {
  const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
  fail(error);
}

export async function getEarnings(): Promise<EarningsData> {
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id,provider_payout_in_cents,created_at,booking:bookings(start_time,service:services(name))",
    )
    .eq("status", "SUCCEEDED")
    .order("created_at", { ascending: false })
    .limit(100);
  fail(error);
  const payments = (data ?? []).map((payment) => {
    const booking = payment.booking as {
      start_time: string;
      service: { name: string } | null;
    } | null;
    return {
      id: payment.id,
      providerPayoutInCents: payment.provider_payout_in_cents,
      createdAt: payment.created_at,
      booking: booking
        ? {
            startTime: booking.start_time,
            service: booking.service ? { name: booking.service.name } : null,
          }
        : null,
    };
  });
  return {
    totalEarnings: payments.reduce(
      (sum, payment) => sum + payment.providerPayoutInCents,
      0,
    ),
    payments,
  };
}

export async function startStripeConnect(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("stripe-connect", {
    body: { action: "onboard" },
  });
  fail(error);
  if (!data?.url) throw new Error(data?.error ?? "Stripe did not return an onboarding URL.");
  return data.url as string;
}
