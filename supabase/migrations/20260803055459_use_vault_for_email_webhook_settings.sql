-- Hosted Supabase projects do not permit application-defined ALTER DATABASE
-- settings. Store the webhook URL and signing secret in Supabase Vault instead
-- and resolve them only inside this SECURITY DEFINER trigger.
create or replace function public.tg_send_email_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_payload jsonb;
begin
  select secret.decrypted_secret
  into v_url
  from vault.decrypted_secrets as secret
  where secret.name = 'faineant_send_email_url'
  order by secret.created_at desc
  limit 1;

  select secret.decrypted_secret
  into v_secret
  from vault.decrypted_secrets as secret
  where secret.name = 'faineant_send_email_secret'
  order by secret.created_at desc
  limit 1;

  if nullif(v_url, '') is null or nullif(v_secret, '') is null then
    return null;
  end if;

  v_payload := jsonb_build_object(
    'type', tg_op,
    'table', tg_table_name,
    'record', to_jsonb(new),
    'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
  );

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type',
      'application/json',
      'Authorization',
      'Bearer ' || v_secret
    ),
    body := v_payload
  );

  return null;
end;
$$;

revoke all on function public.tg_send_email_webhook()
from public, anon, authenticated;
