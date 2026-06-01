-- Fire the send-email Edge Function on booking + profile events via pg_net.
-- URL + secret come from DB settings so the same migration works in every env.
-- When app.settings.send_email_url is unset (e.g. locally), the trigger no-ops.
create or replace function public.tg_send_email_webhook()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url  text := current_setting('app.settings.send_email_url', true);
  v_secret text := current_setting('app.settings.send_email_secret', true);
  v_payload jsonb;
begin
  if v_url is null or v_url = '' then
    return null; -- not configured in this environment; no-op
  end if;
  v_payload := jsonb_build_object(
    'type', tg_op, 'table', tg_table_name,
    'record', to_jsonb(new), 'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end);
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce(v_secret,'')),
    body := v_payload);
  return null;
end;
$$;

create trigger send_email_on_booking_insert
  after insert on public.bookings
  for each row execute function public.tg_send_email_webhook();

create trigger send_email_on_booking_update
  after update of status on public.bookings
  for each row execute function public.tg_send_email_webhook();

create trigger send_email_on_profile_insert
  after insert on public.profiles
  for each row execute function public.tg_send_email_webhook();
