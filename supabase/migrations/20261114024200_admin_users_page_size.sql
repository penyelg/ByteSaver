create or replace function bytesaver_private.admin_list_users(p_search text, p_access text, p_verification text, p_page integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not bytesaver_private.is_administrator() then raise exception 'Administrator access is required.'; end if;
  if p_access is null or p_access not in ('all','active','suspended') or p_verification is null
    or p_verification not in ('all','not_submitted','pending_review','approved','rejected')
    or p_page is null or p_page < 1 or p_page > 1000000 or length(coalesce(p_search,'')) > 150 then
    raise exception 'Choose valid search filters and page.';
  end if;
  return (
    with accounts as materialized (
      select u.id, u.full_name, u.display_name, u.email, u.phone, u.created_at,
        coalesce(a.status, 'active') as access_status,
        coalesce(v.status, 'not_submitted') as verification_status,
        exists (select 1 from bytesaver_private.administrators ad where ad.user_id = u.id) as is_admin
      from public.users u
      left join bytesaver_private.account_access a on a.user_id = u.id
      left join lateral (select s.status from public.identity_submissions s where s.user_id = u.id
        order by s.submitted_at desc, s.id desc limit 1) v on true
      where (coalesce(btrim(p_search), '') = '' or strpos(lower(concat_ws(' ',u.full_name,u.display_name,u.email,u.phone)),lower(btrim(p_search))) > 0)
    ), filtered as materialized (
      select * from accounts where (p_access = 'all' or access_status = p_access)
        and (p_verification = 'all' or verification_status = p_verification)
    ), page_rows as (
      select * from filtered order by created_at desc, id limit 10 offset ((p_page - 1) * 10)
    ) select jsonb_build_object('total', (select count(*) from filtered),
      'users', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id) from page_rows p), '[]'::jsonb))
  );
end;
$$;
