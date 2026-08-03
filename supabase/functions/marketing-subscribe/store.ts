export type MarketingRecord = {
  id: string;
  email: string;
  marketing_status: "legacy" | "subscribed" | "unsubscribed";
  consent_at: string | null;
  consent_version: string | null;
  consent_source: string | null;
  welcome_email_sent_at: string | null;
};

export type ConsentWrite = {
  email: string;
  source: string;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string;
  marketing_status: "subscribed";
  consent_at: string;
  consent_version: string;
  consent_source: string;
  unsubscribed_at: null;
  last_email_error: null;
};

export interface MarketingStore {
  countRecentConsentsByIpHash(ipHash: string, since: string): Promise<number>;
  findByEmail(email: string): Promise<MarketingRecord | null>;
  findById(id: string): Promise<MarketingRecord | null>;
  create(input: ConsentWrite): Promise<MarketingRecord>;
  resubscribe(id: string, input: ConsentWrite): Promise<MarketingRecord>;
  markWelcomeSent(id: string, sentAt: string): Promise<void>;
  markEmailError(id: string, message: string): Promise<void>;
  unsubscribe(id: string, unsubscribedAt: string): Promise<void>;
}

type SupabaseClient = {
  from(table: string): any;
};

const RECORD_COLUMNS =
  "id,email,marketing_status,consent_at,consent_version,consent_source,welcome_email_sent_at";

function throwIfError(error: { message?: string } | null): void {
  if (error) {
    throw new Error(error.message || "Marketing database request failed.");
  }
}

export class SupabaseMarketingStore implements MarketingStore {
  constructor(private readonly client: SupabaseClient) {}

  async countRecentConsentsByIpHash(
    ipHash: string,
    since: string,
  ): Promise<number> {
    const { count, error } = await this.client
      .from("waitlist_entries")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("consent_at", since);
    throwIfError(error);
    return count ?? 0;
  }

  async findByEmail(email: string): Promise<MarketingRecord | null> {
    const { data, error } = await this.client
      .from("waitlist_entries")
      .select(RECORD_COLUMNS)
      .eq("email", email)
      .maybeSingle();
    throwIfError(error);
    return data as MarketingRecord | null;
  }

  async findById(id: string): Promise<MarketingRecord | null> {
    const { data, error } = await this.client
      .from("waitlist_entries")
      .select(RECORD_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    throwIfError(error);
    return data as MarketingRecord | null;
  }

  async create(input: ConsentWrite): Promise<MarketingRecord> {
    const { data, error } = await this.client
      .from("waitlist_entries")
      .upsert(input, { onConflict: "email", ignoreDuplicates: true })
      .select(RECORD_COLUMNS)
      .maybeSingle();
    throwIfError(error);

    if (data) {
      return data as MarketingRecord;
    }

    const existing = await this.findByEmail(input.email);
    if (!existing) {
      throw new Error("Marketing subscription could not be created.");
    }

    return existing;
  }

  async resubscribe(
    id: string,
    input: ConsentWrite,
  ): Promise<MarketingRecord> {
    const { data, error } = await this.client
      .from("waitlist_entries")
      .update({ ...input, welcome_email_sent_at: null })
      .eq("id", id)
      .neq("marketing_status", "subscribed")
      .select(RECORD_COLUMNS)
      .maybeSingle();
    throwIfError(error);

    if (data) {
      return data as MarketingRecord;
    }

    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Marketing subscription could not be renewed.");
    }

    return existing;
  }

  async markWelcomeSent(id: string, sentAt: string): Promise<void> {
    const { error } = await this.client
      .from("waitlist_entries")
      .update({ welcome_email_sent_at: sentAt, last_email_error: null })
      .eq("id", id);
    throwIfError(error);
  }

  async markEmailError(id: string, message: string): Promise<void> {
    const { error } = await this.client
      .from("waitlist_entries")
      .update({ last_email_error: message.slice(0, 500) })
      .eq("id", id);
    throwIfError(error);
  }

  async unsubscribe(id: string, unsubscribedAt: string): Promise<void> {
    const { error } = await this.client
      .from("waitlist_entries")
      .update({
        marketing_status: "unsubscribed",
        unsubscribed_at: unsubscribedAt,
      })
      .eq("id", id);
    throwIfError(error);
  }
}
