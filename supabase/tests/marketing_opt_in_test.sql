begin;
select plan(15);

select has_column(
  'public',
  'waitlist_entries',
  'marketing_status',
  'waitlist records marketing eligibility'
);
select has_column(
  'public',
  'waitlist_entries',
  'consent_at',
  'waitlist records when consent was granted'
);
select has_column(
  'public',
  'waitlist_entries',
  'consent_version',
  'waitlist records the accepted disclosure version'
);
select has_column(
  'public',
  'waitlist_entries',
  'consent_source',
  'waitlist records where consent was granted'
);
select has_column(
  'public',
  'waitlist_entries',
  'unsubscribed_at',
  'waitlist records withdrawal time'
);
select has_column(
  'public',
  'waitlist_entries',
  'welcome_email_sent_at',
  'waitlist records welcome delivery'
);
select has_column(
  'public',
  'waitlist_entries',
  'last_email_error',
  'waitlist records a bounded delivery failure'
);
select has_column(
  'public',
  'waitlist_entries',
  'updated_at',
  'waitlist records the last state transition'
);

set local role anon;
select throws_ok(
  $$insert into public.waitlist_entries (email)
    values ('forged-consent@example.com')$$,
  '42501',
  null,
  'anonymous clients cannot forge marketing consent'
);
reset role;

select lives_ok(
  $$insert into public.waitlist_entries (
      email,
      source,
      marketing_status,
      consent_at,
      consent_version,
      consent_source
    ) values (
      'subscribed@example.com',
      'homepage',
      'subscribed',
      now(),
      'marketing-email-v1',
      'homepage-waitlist'
    )$$,
  'service-owned writes can record complete consent'
);

select throws_ok(
  $$insert into public.waitlist_entries (
      email,
      marketing_status,
      consent_version,
      consent_source
    ) values (
      'missing-time@example.com',
      'subscribed',
      'marketing-email-v1',
      'homepage-waitlist'
    )$$,
  '23514',
  null,
  'subscribed state requires a consent timestamp'
);

select throws_ok(
  $$update public.waitlist_entries
    set marketing_status = 'unsubscribed'
    where email = 'subscribed@example.com'$$,
  '23514',
  null,
  'unsubscribed state requires a withdrawal timestamp'
);

select lives_ok(
  $$update public.waitlist_entries
    set marketing_status = 'unsubscribed', unsubscribed_at = now()
    where email = 'subscribed@example.com'$$,
  'a complete withdrawal transition is accepted'
);

select results_eq(
  $$select marketing_status from public.waitlist_entries
    where email = 'subscribed@example.com'$$,
  array['unsubscribed'::text],
  'withdrawal moves the contact onto the suppression ledger'
);

insert into public.waitlist_entries (email)
values ('legacy@example.com');

select results_eq(
  $$select marketing_status || ':' || (consent_at is null)::text
    from public.waitlist_entries where email = 'legacy@example.com'$$,
  array['legacy:true'::text],
  'unversioned rows remain legacy and have no inferred consent'
);

select * from finish();
rollback;
