-- Postcards keep what the user actually typed/uploaded (the AI title replaces `subject`).
alter table public.reports add column if not exists user_prompt text;
alter table public.reports add column if not exists source_image_url text;

-- Backfill the existing postcards from their stored prompts.
update public.reports
set user_prompt = substring(prompt from 'Subject: ([^\n]+)')
where kind = 'postcard'
  and user_prompt is null
  and prompt !~ 'Subject: whatever is in the attached photo';

-- Both views gain the two columns at the end (week 4's report_feed still hides postcards).
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
  r.image_prompt,
  r.user_prompt,
  r.source_image_url
from public.reports r
left join public.votes v on v.report_id = r.id
left join public.profiles p on p.id = r.user_id
group by r.id, p.first_name, p.avatar_url;

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
  r.image_prompt,
  r.user_prompt,
  r.source_image_url
from public.reports r
left join public.votes v on v.report_id = r.id
left join public.profiles p on p.id = r.user_id
where r.kind <> 'postcard'
group by r.id, p.first_name, p.avatar_url;
