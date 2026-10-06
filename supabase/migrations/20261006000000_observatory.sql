-- Week 4: Earth Observatory. Additive only — Assignment 3 keeps working.

-- ── Daily anomalies ─────────────────────────────────────────────
create table if not exists public.anomalies (
  date    date primary key,
  subject text not null,
  blurb   text
);

-- Cycle 20 subjects across the rest of the term (one per New York day).
insert into public.anomalies (date, subject, blurb)
select g.d::date, s.subject, s.blurb
from generate_series('2026-10-01'::date, '2027-05-31'::date, interval '1 day') with ordinality as g(d, n)
join (values
  (1,  'the Halal cart line',            'Humans queue for an hour for rice. Investigate.'),
  (2,  'bodega cats',                    'Small furry guardians of the 24-hour stores.'),
  (3,  'the 1 train at 8am',             'A metal tube holding far more humans than physics allows.'),
  (4,  'the Low Steps at lunch',         'Hundreds of humans sit on stairs on purpose.'),
  (5,  'Butler Library at 2am',          'Lights on. Humans inside. Why?'),
  (6,  'dining hall mystery meat',       'Identify the specimen.'),
  (7,  'Central Park squirrels',         'Locals with no fear and strong opinions.'),
  (8,  'the M4 bus',                     'Slower than walking. Humans board anyway.'),
  (9,  'a Brooklyn brunch line',         'Weekend migration ritual. Two-hour wait for eggs.'),
  (10, 'Times Square costume characters','Large plush beings demanding tips.'),
  (11, 'dorm laundry rooms',             'Machines that eat single socks.'),
  (12, 'Midwest vs NYC pizza',           'A dispute older than the city itself.'),
  (13, 'subway performers',              'Showtime. Brace for impact.'),
  (14, 'the first cold day in NYC',      'Every human suddenly owns a long black coat.'),
  (15, 'Trader Joe''s on a Sunday',      'The line wraps around the planet.'),
  (16, 'rats on the subway tracks',      'The true residents of the city.'),
  (17, 'Columbia tour groups',           'Visitors following a human walking backwards.'),
  (18, 'Sweetgreen at noon',             'Salad, ordered by app, collected in silence.'),
  (19, 'the Hudson River sunset',        'Humans stop moving and point devices at the sky.'),
  (20, 'midterms week',                  'Collective stress detected across campus.')
) as s(i, subject, blurb) on s.i = ((g.n - 1) % 20) + 1
on conflict (date) do nothing;

-- ── Reports (AI generations) ───────────────────────────────────
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  kind         text not null check (kind in ('field_note', 'exoplanet', 'transmission')),
  subject      text not null check (char_length(subject) <= 140),
  prompt       text not null,
  model        text not null,
  body         text not null,
  image_url    text,
  anomaly_date date references public.anomalies (date),
  created_at   timestamptz not null default now()
);
create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_user_idx on public.reports (user_id, created_at desc);

-- ── Votes ──────────────────────────────────────────────────────
create table if not exists public.votes (
  report_id  uuid not null references public.reports (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  value      smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

-- ── Public feed view ───────────────────────────────────────────
-- Runs with the owner's rights (no security_invoker) on purpose: it exposes only vote
-- totals and the author's first name/photo, while votes and profiles stay owner-only.
create or replace view public.report_feed as
select
  r.id, r.user_id, r.kind, r.subject, r.body, r.prompt, r.model, r.image_url,
  r.anomaly_date, r.created_at,
  coalesce(sum(v.value), 0)::int                          as score,
  count(*) filter (where v.value = 1)::int                as upvotes,
  count(*) filter (where v.value = -1)::int               as downvotes,
  p.first_name                                            as author_name,
  p.avatar_url                                            as author_avatar
from public.reports r
left join public.votes v on v.report_id = r.id
left join public.profiles p on p.id = r.user_id
group by r.id, p.first_name, p.avatar_url;

-- ── RLS ────────────────────────────────────────────────────────
alter table public.anomalies enable row level security;
alter table public.reports   enable row level security;
alter table public.votes     enable row level security;
alter table public.planets   enable row level security;
alter table public.profiles  enable row level security;  -- already on; kept for completeness

drop policy if exists "Anyone can read planets" on public.planets;
create policy "Anyone can read planets" on public.planets for select using (true);

drop policy if exists "Anyone can read anomalies" on public.anomalies;
create policy "Anyone can read anomalies" on public.anomalies for select using (true);

drop policy if exists "Anyone can read reports" on public.reports;
create policy "Anyone can read reports" on public.reports for select using (true);

drop policy if exists "Users create their own reports" on public.reports;
create policy "Users create their own reports" on public.reports
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users see their own votes" on public.votes;
create policy "Users see their own votes" on public.votes
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users cast their own votes" on public.votes;
create policy "Users cast their own votes" on public.votes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users change their own votes" on public.votes;
create policy "Users change their own votes" on public.votes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users remove their own votes" on public.votes;
create policy "Users remove their own votes" on public.votes
  for delete to authenticated using (user_id = auth.uid());

-- Table privileges (this project does not auto-grant to API roles).
grant select on public.planets, public.anomalies, public.reports, public.report_feed to anon, authenticated;
grant insert on public.reports to authenticated;
grant select, insert, update, delete on public.votes to authenticated;

-- ── Storage: report photos ─────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('reports', 'reports', true)
on conflict (id) do nothing;

drop policy if exists "Report photos are publicly readable" on storage.objects;
create policy "Report photos are publicly readable"
  on storage.objects for select using (bucket_id = 'reports');

drop policy if exists "Users upload report photos to their folder" on storage.objects;
create policy "Users upload report photos to their folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);
