begin;

create or replace function bytesaver_private.identity_review_avatars(p_user_ids uuid[])
returns table(user_id uuid, avatar_url text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not bytesaver_private.is_administrator() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;
  if cardinality(p_user_ids) > 101 then
    raise exception 'Too many accounts requested.';
  end if;

  return query
    select u.id, u.avatar_url
    from public.users u
    where u.id = any(p_user_ids)
      and u.avatar_url like 'https://lh3.googleusercontent.com/%';
end;
$$;

commit;
