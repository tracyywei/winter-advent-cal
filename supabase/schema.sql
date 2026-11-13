-- Advent calendar database. Paste this whole file into the Supabase SQL Editor
-- and press Run. It's safe to run again (it skips anything that already exists).
--
-- Only the app's server talks to these tables, using the secret key. Row Level
-- Security is on with no policies, so the public "anon" key can't read anything.

create table if not exists calendars (
  id             text primary key,
  slug           text not null unique,
  recipient_name text not null,
  from_name      text not null,
  created_at     timestamptz not null default now()
);

create table if not exists doors (
  calendar_id text not null references calendars (id) on delete cascade,
  day         int  not null check (day between 1 and 25),
  content     jsonb not null,
  note        text,
  updated_at  timestamptz not null default now(),
  primary key (calendar_id, day)
);

-- First time the recipient opened each door (Tracy's previews never count).
create table if not exists opens (
  calendar_id     text not null references calendars (id) on delete cascade,
  day             int  not null,
  first_opened_at timestamptz not null default now(),
  primary key (calendar_id, day)
);

create table if not exists solved_riddles (
  calendar_id text not null references calendars (id) on delete cascade,
  day         int  not null,
  solved_at   timestamptz not null default now(),
  primary key (calendar_id, day)
);

create table if not exists reactions (
  calendar_id text not null references calendars (id) on delete cascade,
  day         int  not null,
  emoji       text,
  note        text check (char_length(note) <= 280),
  redeemed    boolean,
  updated_at  timestamptz not null default now(),
  primary key (calendar_id, day)
);

-- One SMS and/or one email address per calendar.
create table if not exists subscriptions (
  calendar_id  text not null references calendars (id) on delete cascade,
  channel      text not null check (channel in ('sms', 'email')),
  address      text not null,
  consented_at timestamptz not null,
  opted_out_at timestamptz,
  timezone     text,  -- their phone's time zone, e.g. America/New_York, so texts arrive at 9am their time
  primary key (calendar_id, channel)
);
alter table subscriptions add column if not exists timezone text;

-- Every reminder sent, so the daily job never texts the same person twice.
create table if not exists message_log (
  calendar_id text not null references calendars (id) on delete cascade,
  channel     text not null,
  day         int  not null,
  address     text not null,
  provider_id text,
  status      text not null,
  sent_at     timestamptz not null default now(),
  primary key (calendar_id, channel, day)
);

alter table calendars      enable row level security;
alter table doors          enable row level security;
alter table opens          enable row level security;
alter table solved_riddles enable row level security;
alter table reactions      enable row level security;
alter table subscriptions  enable row level security;
alter table message_log    enable row level security;

grant all on calendars, doors, opens, solved_riddles, reactions, subscriptions, message_log to service_role;

-- Private file bucket for photos, clips and voice memos. Files are only reachable
-- through short-lived signed links that the app hands out. 50 MB per file max.
-- If this part doesn't take, `npm run check:supabase` creates the bucket instead.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', false, 52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg'
  ]
)
on conflict (id) do nothing;

-- Tell the Data API to pick up the new tables right away.
notify pgrst, 'reload schema';
