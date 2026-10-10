-- Week 5: postcards. Additive only — weeks 3 and 4 keep working.
alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check
  check (kind in ('field_note', 'exoplanet', 'transmission', 'postcard'));

alter table public.reports add column if not exists planet text;
alter table public.reports add column if not exists image_prompt text;

-- Same view as week 4 with the two new columns appended (create or replace allows adding at the end).
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
group by r.id, p.first_name, p.avatar_url;
