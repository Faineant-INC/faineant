import { createClient } from "@supabase/supabase-js";

const supabaseUrl = required("SUPABASE_URL");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const accounts = [
  {
    key: "client",
    email: "qa.client@faineantapp.com",
    password: required("QA_CLIENT_PASSWORD"),
    role: "CLIENT",
    firstName: "Quinn",
    lastName: "Client",
    confirmed: true,
    active: true,
    streetAddress: "1000 W Fulton Market, Chicago, IL 60607",
    neighbourhood: "Fulton Market",
    notificationReminders: true,
    notificationRebooking: false,
    notificationNewsletter: true,
    scenario: "active client",
  },
  {
    key: "unverified",
    email: "qa.unverified@faineantapp.com",
    password: required("QA_UNVERIFIED_PASSWORD"),
    role: "CLIENT",
    firstName: "Una",
    lastName: "Unverified",
    confirmed: false,
    active: true,
    scenario: "email confirmation required",
  },
  {
    key: "disabled",
    email: "qa.disabled@faineantapp.com",
    password: required("QA_DISABLED_PASSWORD"),
    role: "CLIENT",
    firstName: "Drew",
    lastName: "Disabled",
    confirmed: true,
    active: false,
    banned: true,
    scenario: "disabled and auth-banned client",
  },
  {
    key: "provider",
    email: "qa.provider@faineantapp.com",
    password: required("QA_PROVIDER_PASSWORD"),
    role: "PROVIDER",
    firstName: "Parker",
    lastName: "Provider",
    confirmed: true,
    active: true,
    providerVerified: true,
    scenario: "verified provider with complete QA catalog",
  },
  {
    key: "providerPending",
    email: "qa.provider.pending@faineantapp.com",
    password: required("QA_PROVIDER_PENDING_PASSWORD"),
    role: "PROVIDER",
    firstName: "Peyton",
    lastName: "Pending",
    confirmed: true,
    active: true,
    providerVerified: false,
    scenario: "provider awaiting marketplace approval",
  },
  {
    key: "admin",
    email: "qa.admin@faineantapp.com",
    password: required("QA_ADMIN_PASSWORD"),
    role: "ADMIN",
    firstName: "Avery",
    lastName: "Admin",
    confirmed: true,
    active: true,
    scenario: "platform administrator",
  },
];

for (const account of accounts) assertStrongPassword(account.password);

const usersByEmail = await listUsersByEmail();
const provisioned = new Map();

for (const account of accounts) {
  const user = await ensureAuthUser(account, usersByEmail.get(account.email));
  await ensureProfile(account, user.id);
  provisioned.set(account.key, { account, user });
}

const providerProfile = await ensureProviderProfile(
  provisioned.get("provider"),
  {
    slug: "qa-studio-chicago",
    business_name: "Faineant QA Studio",
    bio: "A verified Chicago provider fixture for end-to-end QA. Do not book outside test runs.",
    address: "1000 W Fulton Market, Chicago, IL 60607",
    latitude: 41.8864,
    longitude: -87.6523,
    service_radius: 15,
    is_verified: true,
    stripe_onboarding_complete: false,
  },
);

await ensureProviderProfile(provisioned.get("providerPending"), {
  slug: "qa-provider-pending",
  business_name: "Pending QA Provider",
  bio: "A fixture for provider verification and onboarding review.",
  address: "Chicago, IL",
  latitude: 41.8781,
  longitude: -87.6298,
  service_radius: 10,
  is_verified: false,
  stripe_onboarding_complete: false,
});

await provisionScenarioFixtures({
  clientId: provisioned.get("client").user.id,
  adminId: provisioned.get("admin").user.id,
  providerUserId: provisioned.get("provider").user.id,
  providerProfileId: providerProfile.id,
});

await verifyProvisioning();

console.log("Provisioned Faineant hosted QA identities and deterministic fixtures:");
for (const account of accounts) {
  console.log(`- ${account.email}: ${account.role} - ${account.scenario}`);
}
console.log("Passwords were supplied through environment variables and were not printed.");

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assertStrongPassword(password) {
  if (
    password.length < 12 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      "Each QA password must be at least 12 characters and include lowercase, uppercase, a digit, and a symbol.",
    );
  }
}

async function listUsersByEmail() {
  const result = new Map();
  for (let page = 1; ; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    fail(error);
    for (const user of data.users) {
      if (user.email) result.set(user.email.toLowerCase(), user);
    }
    if (data.users.length < 1000) return result;
  }
}

async function ensureAuthUser(account, existing) {
  const userMetadata = {
    first_name: account.firstName,
    last_name: account.lastName,
    role: account.role,
    qa_fixture: true,
  };
  const appMetadata = {
    qa_fixture: true,
    role: account.role === "ADMIN" ? "ADMIN" : null,
  };

  if (!existing) {
    const { data, error } = await db.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: account.confirmed,
      user_metadata: userMetadata,
      app_metadata: appMetadata,
      ban_duration: account.banned ? "876000h" : "none",
    });
    fail(error);
    if (!data.user) throw new Error(`Auth did not return ${account.email}`);
    return data.user;
  }

  if (!account.confirmed && existing.email_confirmed_at) {
    throw new Error(
      `${account.email} is already confirmed; refusing to weaken the unverified QA scenario implicitly.`,
    );
  }

  const attributes = {
    password: account.password,
    user_metadata: userMetadata,
    app_metadata: appMetadata,
    ban_duration: account.banned ? "876000h" : "none",
  };
  if (account.confirmed) attributes.email_confirm = true;
  const { data, error } = await db.auth.admin.updateUserById(
    existing.id,
    attributes,
  );
  fail(error);
  if (!data.user) throw new Error(`Auth did not update ${account.email}`);
  return data.user;
}

async function ensureProfile(account, userId) {
  const { error } = await db.from("profiles").upsert(
    {
      id: userId,
      role: account.role,
      first_name: account.firstName,
      last_name: account.lastName,
      phone: account.active ? "+13125550100" : null,
      is_active: account.active,
      street_address: account.streetAddress ?? null,
      neighbourhood: account.neighbourhood ?? null,
      notification_reminders: account.notificationReminders ?? true,
      notification_rebooking: account.notificationRebooking ?? true,
      notification_newsletter: account.notificationNewsletter ?? false,
    },
    { onConflict: "id" },
  );
  fail(error);
}

async function ensureProviderProfile(entry, fields) {
  const userId = entry.user.id;
  const { data: existing, error: selectError } = await db
    .from("provider_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  fail(selectError);

  const row = { ...fields, user_id: userId };
  if (existing?.id) row.id = existing.id;
  const { data, error } = await db
    .from("provider_profiles")
    .upsert(row, { onConflict: "user_id" })
    .select("id")
    .single();
  fail(error);
  return data;
}

async function provisionScenarioFixtures({
  clientId,
  adminId,
  providerUserId,
  providerProfileId,
}) {
  const serviceIds = {
    haircut: "71000000-0000-0000-0000-000000000001",
    makeup: "71000000-0000-0000-0000-000000000002",
    facial: "71000000-0000-0000-0000-000000000003",
  };
  await upsert("services", [
    {
      id: serviceIds.haircut,
      provider_profile_id: providerProfileId,
      name: "QA Signature Cut",
      description: "Fixture service for search, booking, payment, and review QA.",
      category: "HAIRCUT",
      duration_minutes: 60,
      price_in_cents: 8500,
      is_active: true,
    },
    {
      id: serviceIds.makeup,
      provider_profile_id: providerProfileId,
      name: "QA Event Makeup",
      description: "Fixture service for category and provider catalog QA.",
      category: "MAKEUP",
      duration_minutes: 90,
      price_in_cents: 14000,
      is_active: true,
    },
    {
      id: serviceIds.facial,
      provider_profile_id: providerProfileId,
      name: "QA Express Facial",
      description: "Inactive fixture used to verify catalog filtering.",
      category: "FACIAL",
      duration_minutes: 45,
      price_in_cents: 6500,
      is_active: false,
    },
  ]);

  await upsert("availability", [1, 2, 3, 4, 5].map((day, index) => ({
    id: `72000000-0000-0000-0000-00000000000${index + 1}`,
    provider_profile_id: providerProfileId,
    day_of_week: day,
    start_time: "09:00",
    end_time: "17:00",
  })));
  await upsert("availability_overrides", [
    {
      id: "72000000-0000-0000-0000-000000000010",
      provider_profile_id: providerProfileId,
      date: "2030-01-10",
      is_blocked: true,
      reason: "QA blocked-day fixture",
    },
  ]);
  await upsert("portfolio_items", [
    {
      id: "72000000-0000-0000-0000-000000000020",
      provider_profile_id: providerProfileId,
      service_id: serviceIds.haircut,
      image_url: "/brand/photography/tile-hair.png",
      caption: "QA in-home haircut fixture",
      sort_order: 0,
    },
  ]);

  const bookings = [
    ["73000000-0000-0000-0000-000000000001", "PENDING", "2030-01-07T15:00:00Z", "2030-01-07T16:00:00Z"],
    ["73000000-0000-0000-0000-000000000002", "CONFIRMED", "2030-01-08T16:00:00Z", "2030-01-08T17:00:00Z"],
    ["73000000-0000-0000-0000-000000000003", "IN_PROGRESS", "2030-01-09T17:00:00Z", "2030-01-09T18:00:00Z"],
    ["73000000-0000-0000-0000-000000000004", "COMPLETED", "2025-01-07T15:00:00Z", "2025-01-07T16:00:00Z"],
    ["73000000-0000-0000-0000-000000000005", "CANCELLED", "2025-01-08T16:00:00Z", "2025-01-08T17:00:00Z"],
    ["73000000-0000-0000-0000-000000000006", "NO_SHOW", "2025-01-09T17:00:00Z", "2025-01-09T18:00:00Z"],
  ].map(([id, status, start_time, end_time]) => ({
    id,
    client_id: clientId,
    service_id: serviceIds.haircut,
    provider_profile_id: providerProfileId,
    status,
    start_time,
    end_time,
    total_price_in_cents: 8500,
    notes: `Deterministic ${status} QA fixture`,
    location: "1000 W Fulton Market, Chicago, IL 60607",
    latitude: 41.8864,
    longitude: -87.6523,
  }));
  await upsert("bookings", bookings);

  await upsert("payments", [
    {
      id: "79000000-0000-0000-0000-000000000001",
      booking_id: "73000000-0000-0000-0000-000000000004",
      stripe_payment_intent_id: "pi_qa_fixture_completed",
      stripe_event_id: "evt_qa_fixture_completed",
      amount_in_cents: 8500,
      platform_fee_in_cents: 425,
      provider_payout_in_cents: 8075,
      refunded_amount_in_cents: 1000,
      status: "SUCCEEDED",
    },
  ]);
  await upsert("refunds", [
    {
      id: "79000000-0000-0000-0000-000000000002",
      payment_id: "79000000-0000-0000-0000-000000000001",
      stripe_refund_id: "re_qa_fixture_partial",
      amount_in_cents: 1000,
      reason: "Deterministic partial-refund fixture; no Stripe transaction exists.",
      initiated_by_user_id: adminId,
    },
  ]);
  await upsert("reviews", [
    {
      id: "74000000-0000-0000-0000-000000000001",
      booking_id: "73000000-0000-0000-0000-000000000004",
      client_id: clientId,
      provider_profile_id: providerProfileId,
      rating: 5,
      text: "Excellent service from the deterministic QA fixture.",
      photos: [],
    },
  ]);
  await update("provider_profiles", providerProfileId, {
    average_rating: 5,
    total_reviews: 1,
  });

  const participants = [clientId, providerUserId].sort();
  const conversationId = "75000000-0000-0000-0000-000000000001";
  await upsert("conversations", [
    {
      id: conversationId,
      participant_a_id: participants[0],
      participant_b_id: participants[1],
      last_message_at: "2026-08-03T05:00:00Z",
    },
  ]);
  await upsert("messages", [
    {
      id: "76000000-0000-0000-0000-000000000001",
      conversation_id: conversationId,
      sender_id: clientId,
      text: "QA: Is the appointment location confirmed?",
      read_at: "2026-08-03T04:55:00Z",
      created_at: "2026-08-03T04:50:00Z",
    },
    {
      id: "76000000-0000-0000-0000-000000000002",
      conversation_id: conversationId,
      sender_id: providerUserId,
      text: "QA: Yes, the fixture is ready for validation.",
      read_at: null,
      created_at: "2026-08-03T05:00:00Z",
    },
  ]);

  await upsert("posts", [
    {
      id: "77000000-0000-0000-0000-000000000001",
      author_id: providerUserId,
      title: "QA community fixture",
      body: "This deterministic post validates community list and detail surfaces.",
      category: "TIPS",
      likes_count: 0,
      comments_count: 1,
    },
  ]);
  await upsert("comments", [
    {
      id: "78000000-0000-0000-0000-000000000001",
      post_id: "77000000-0000-0000-0000-000000000001",
      author_id: clientId,
      body: "QA comment fixture",
    },
  ]);

  await upsert("calendar_connections", [
    {
      id: "80000000-0000-0000-0000-000000000001",
      user_id: providerUserId,
      provider: "ICS_FEED",
      feed_url: "https://example.com/faineant-qa-calendar.ics",
      external_id: "qa-inactive-calendar",
      is_active: false,
      last_synced_at: "2026-08-03T05:00:00Z",
    },
  ]);
  await upsert("external_events", [
    {
      id: "80000000-0000-0000-0000-000000000002",
      calendar_connection_id: "80000000-0000-0000-0000-000000000001",
      external_id: "qa-busy-event",
      title: "QA imported busy window",
      start_time: "2030-01-11T15:00:00Z",
      end_time: "2030-01-11T16:00:00Z",
      is_all_day: false,
    },
  ]);
  await db.from("waitlist_entries").upsert(
    {
      email: "qa.waitlist@faineantapp.com",
      source: "qa-fixture",
      referrer: "https://faineantapp.com/qa",
    },
    { onConflict: "email" },
  ).then(({ error }) => fail(error));
}

async function upsert(table, rows) {
  const { error } = await db.from(table).upsert(rows, { onConflict: "id" });
  fail(error);
}

async function update(table, id, fields) {
  const { error } = await db.from(table).update(fields).eq("id", id);
  fail(error);
}

async function verifyProvisioning() {
  const emails = accounts.map((account) => account.email);
  const { data: users, error: userError } = await db.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  fail(userError);
  const byEmail = new Map(
    users.users.filter((user) => user.email).map((user) => [user.email, user]),
  );
  for (const account of accounts) {
    const user = byEmail.get(account.email);
    if (!user) throw new Error(`Missing Auth user ${account.email}`);
    if (account.confirmed !== Boolean(user.email_confirmed_at)) {
      throw new Error(`Confirmation state mismatch for ${account.email}`);
    }
  }

  const { data: profiles, error: profileError } = await db
    .from("profiles")
    .select(
      "id,role,is_active,street_address,neighbourhood,notification_reminders,notification_rebooking,notification_newsletter",
    )
    .in("id", [...provisioned.values()].map((entry) => entry.user.id));
  fail(profileError);
  if (profiles.length !== emails.length) {
    throw new Error(`Expected ${emails.length} QA profiles, found ${profiles.length}`);
  }
  for (const entry of provisioned.values()) {
    const profile = profiles.find((item) => item.id === entry.user.id);
    if (
      !profile ||
      profile.role !== entry.account.role ||
      profile.is_active !== entry.account.active
    ) {
      throw new Error(`Profile state mismatch for ${entry.account.email}`);
    }
    if (
      entry.account.key === "client" &&
      (
        profile.street_address !== entry.account.streetAddress ||
        profile.neighbourhood !== entry.account.neighbourhood ||
        profile.notification_reminders !== entry.account.notificationReminders ||
        profile.notification_rebooking !== entry.account.notificationRebooking ||
        profile.notification_newsletter !== entry.account.notificationNewsletter
      )
    ) {
      throw new Error(`Client preference mismatch for ${entry.account.email}`);
    }
  }

  const checks = [
    ["services", 3],
    ["bookings", 6],
    ["payments", 1],
    ["refunds", 1],
    ["reviews", 1],
    ["conversations", 1],
    ["messages", 2],
    ["posts", 1],
    ["comments", 1],
    ["calendar_connections", 1],
    ["external_events", 1],
  ];
  for (const [table, minimum] of checks) {
    const { count, error } = await db
      .from(table)
      .select("id", { count: "exact", head: true });
    fail(error);
    if ((count ?? 0) < minimum) {
      throw new Error(`Expected at least ${minimum} rows in ${table}`);
    }
  }
}

function fail(error) {
  if (error) throw new Error(error.message);
}
