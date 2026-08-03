-- Convert the legacy email capture into an auditable marketing-consent ledger.
-- Existing rows predate explicit consent language and must not silently become
-- marketable contacts.
alter table public.waitlist_entries
  add column marketing_status text not null default 'legacy'
    check (marketing_status in ('legacy', 'subscribed', 'unsubscribed')),
  add column consent_at timestamptz,
  add column consent_version text check (length(consent_version) <= 64),
  add column consent_source text check (length(consent_source) <= 100),
  add column unsubscribed_at timestamptz,
  add column welcome_email_sent_at timestamptz,
  add column last_email_error text check (length(last_email_error) <= 500),
  add column updated_at timestamptz not null default now(),
  add constraint waitlist_marketing_consent_check check (
    (
      marketing_status = 'legacy'
      and consent_at is null
      and consent_version is null
      and unsubscribed_at is null
    )
    or (
      marketing_status = 'subscribed'
      and consent_at is not null
      and nullif(consent_version, '') is not null
      and nullif(consent_source, '') is not null
      and unsubscribed_at is null
    )
    or (
      marketing_status = 'unsubscribed'
      and consent_at is not null
      and nullif(consent_version, '') is not null
      and nullif(consent_source, '') is not null
      and unsubscribed_at is not null
    )
  );

create trigger waitlist_entries_set_updated_at
before update on public.waitlist_entries
for each row execute function extensions.moddatetime(updated_at);

create index waitlist_entries_ip_consent_idx
on public.waitlist_entries(ip_hash, consent_at)
where ip_hash is not null and consent_at is not null;

create index waitlist_entries_marketing_status_idx
on public.waitlist_entries(marketing_status, created_at desc);

comment on column public.waitlist_entries.marketing_status is
  'Marketing eligibility. Legacy rows are suppressed until fresh consent.';
comment on column public.waitlist_entries.consent_version is
  'Version of the exact marketing disclosure affirmatively accepted.';
comment on column public.waitlist_entries.ip_hash is
  'One-way HMAC of the request address for abuse controls; never store raw IP.';

-- All future writes pass through the public Edge Function so the browser cannot
-- forge consent metadata, bypass abuse controls, or claim an email was sent.
drop policy if exists waitlist_insert on public.waitlist_entries;
revoke insert, update, delete on table public.waitlist_entries
from anon, authenticated;
