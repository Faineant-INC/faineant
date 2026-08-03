-- Client booking details and notification choices belong to the authenticated
-- profile. Keeping them in Postgres makes the web and mobile clients share one
-- source of truth instead of presenting non-persistent controls.
alter table public.profiles
  add column street_address text,
  add column neighbourhood text,
  add column notification_reminders boolean not null default true,
  add column notification_rebooking boolean not null default true,
  add column notification_newsletter boolean not null default false;

alter table public.profiles
  add constraint profiles_street_address_length_check check (
    street_address is null or char_length(street_address) between 1 and 500
  ),
  add constraint profiles_neighbourhood_check check (
    neighbourhood is null
    or neighbourhood in (
      'West Loop',
      'Logan Square',
      'Wicker Park',
      'Lincoln Park',
      'Fulton Market',
      'River North'
    )
  );

grant update (
  street_address,
  neighbourhood,
  notification_reminders,
  notification_rebooking,
  notification_newsletter
)
on table public.profiles to authenticated;
