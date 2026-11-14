begin;

create function bytesaver_private.identity_review_avatars(p_user_ids uuid[])
returns table(user_id uuid, avatar_url text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not bytesaver_private.is_administrator() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;
  if cardinality(p_user_ids) > 101 then
    raise exception 'Too many applicant accounts requested.';
  end if;

  return query
    select u.id, u.avatar_url
    from public.users u
    where u.id = any(p_user_ids)
      and u.avatar_url like 'https://lh3.googleusercontent.com/%'
      and exists (select 1 from public.identity_submissions s where s.user_id = u.id);
end;
$$;

create function public.identity_review_avatars(p_user_ids uuid[])
returns table(user_id uuid, avatar_url text)
language sql stable security invoker set search_path = '' as $$
  select * from bytesaver_private.identity_review_avatars(p_user_ids);
$$;

revoke all on function bytesaver_private.identity_review_avatars(uuid[]),
  public.identity_review_avatars(uuid[]) from public, anon, authenticated;
grant execute on function bytesaver_private.identity_review_avatars(uuid[]),
  public.identity_review_avatars(uuid[]) to authenticated;

commit;
