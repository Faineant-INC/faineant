create or replace function public.send_message(
  p_recipient_id uuid,
  p_text text,
  p_image_url text default null
) returns public.messages
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_a uuid; v_b uuid; v_conv uuid;
  v_msg public.messages;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if p_recipient_id = v_uid then raise exception 'Cannot message yourself' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.profiles where id = p_recipient_id) then
    raise exception 'Recipient not found' using errcode = 'P0002';
  end if;

  if v_uid < p_recipient_id then v_a := v_uid; v_b := p_recipient_id;
  else v_a := p_recipient_id; v_b := v_uid; end if;

  select id into v_conv from public.conversations
  where participant_a_id = v_a and participant_b_id = v_b;
  if v_conv is null then
    insert into public.conversations (participant_a_id, participant_b_id, last_message_at)
    values (v_a, v_b, now()) returning id into v_conv;
  else
    update public.conversations set last_message_at = now() where id = v_conv;
  end if;

  insert into public.messages (conversation_id, sender_id, text, image_url)
  values (v_conv, v_uid, p_text, p_image_url) returning * into v_msg;
  return v_msg;
end;
$$;
grant execute on function public.send_message(uuid, text, text) to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and v_uid in (c.participant_a_id, c.participant_b_id)
  ) then
    raise exception 'Not a participant' using errcode = '42501';
  end if;

  update public.messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> v_uid
    and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
