-- Week 5 added the 'postcard' kind. The frozen week 4 deployment reads report_feed and crashes on
-- kinds it doesn't know, so report_feed now hides postcards and the current app reads
-- observatory_feed (every kind). Both run as owner and expose only vote totals + author first name.

create or replace view public.observatory_feed as
select
  r.id, r.user_id, r.kind, r.subject, r.body, r.prompt, r.model, r.image_url,
  r.anomaly_date, r.created_at,
  coalesce(sum(v.value), 0)::int                          as score,
  count(*) filter (where v.value = 1)::int                as upvotes,
  count(*) filter (where v.value = -1)::int               as downvotes,
  p.first_name                                            as author_name,
  p.avatar_url                                            as author_avatar,
  r.planet,
  r.image_prompt
from public.reports r
left join public.votes v on v.report_id = r.id
left join public.profiles p on p.id = r.user_id
group by r.id, p.first_name, p.avatar_url;

grant select on public.observatory_feed to anon, authenticated;

create or replace view public.report_feed as
select
  r.id, r.user_id, r.kind, r.subject, r.body, r.prompt, r.model, r.image_url,
  r.anomaly_date, r.created_at,
  coalesce(sum(v.value), 0)::int                          as score,
  count(*) filter (where v.value = 1)::int                as upvotes,
  count(*) filter (where v.value = -1)::int               as downvotes,
  p.first_name                                            as author_name,
  p.avatar_url                                            as author_avatar,
  r.planet,
  r.image_prompt
from public.reports r
left join public.votes v on v.report_id = r.id
left join public.profiles p on p.id = r.user_id
where r.kind <> 'postcard'
group by r.id, p.first_name, p.avatar_url;
