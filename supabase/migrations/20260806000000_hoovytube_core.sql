-- HoovyTube core schema — clean minimal build.
-- Scope: site/brand config, admin auth + RBAC, media galleries (Supabase Storage),
--        email templates, newsletter subscribers, contact messages.
-- Public site is read-only for anon; content writes require a staff/admin app_user.
-- Edge functions use the service_role key and bypass RLS.

create extension if not exists "pgcrypto";

-- =========================================================================
-- CONFIG (singleton rows, id = 1; whole config is a jsonb blob)
-- =========================================================================
create table if not exists public.property_config (
  id         int primary key,
  config     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_config (
  id         int primary key,
  config     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- PEOPLE (contacts / business entity referenced by the public contact page)
-- =========================================================================
create table if not exists public.people (
  id           uuid primary key default gen_random_uuid(),
  email        text,
  first_name   text,
  last_name    text,
  company_name text,
  phone        text,
  phone2       text,
  created_at   timestamptz not null default now()
);

-- =========================================================================
-- AUTH / RBAC
-- =========================================================================
create table if not exists public.app_users (
  id                  uuid primary key default gen_random_uuid(),
  auth_user_id        uuid unique references auth.users(id) on delete cascade,
  email               text,
  display_name        text,
  first_name          text,
  last_name           text,
  avatar_url          text,
  role                text not null default 'public',
  person_id           uuid references public.people(id) on delete set null,
  is_current_resident boolean default false,
  invited_by          uuid,
  last_login_at       timestamptz,
  created_at          timestamptz not null default now()
);

create table if not exists public.user_invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  role        text not null default 'staff',
  status      text not null default 'pending',
  invited_by  uuid,
  invited_at  timestamptz not null default now()
);

create table if not exists public.permissions (
  key         text primary key,
  label       text,
  description text,
  category    text,
  sort_order  int default 100
);

create table if not exists public.role_permissions (
  role           text not null,
  permission_key text not null,
  primary key (role, permission_key)
);

create table if not exists public.user_permissions (
  app_user_id    uuid not null references public.app_users(id) on delete cascade,
  permission_key text not null,
  granted        boolean not null default true,
  primary key (app_user_id, permission_key)
);

-- =========================================================================
-- MEDIA GALLERIES
-- =========================================================================
create table if not exists public.spaces (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique,
  description   text,
  display_order int default 0,
  is_archived   boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.media (
  id               uuid primary key default gen_random_uuid(),
  url              text,
  storage_provider text not null default 'supabase',
  storage_path     text,
  media_type       text not null default 'image',
  mime_type        text,
  file_size_bytes  bigint,
  width            int,
  height           int,
  title            text,
  caption          text,
  category         text,
  content_hash     text,
  is_archived      boolean not null default false,
  uploaded_at      timestamptz not null default now()
);
create index if not exists media_uploaded_at_idx on public.media (uploaded_at desc);
create index if not exists media_category_idx    on public.media (category);

create table if not exists public.media_tags (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  tag_group   text,
  color       text,
  description text
);

create table if not exists public.media_tag_assignments (
  media_id uuid not null references public.media(id)       on delete cascade,
  tag_id   uuid not null references public.media_tags(id)  on delete cascade,
  primary key (media_id, tag_id)
);

create table if not exists public.media_spaces (
  media_id      uuid not null references public.media(id)  on delete cascade,
  space_id      uuid not null references public.spaces(id) on delete cascade,
  display_order int default 0,
  is_primary    boolean default false,
  primary key (media_id, space_id)
);

create table if not exists public.upload_tokens (
  token      uuid primary key default gen_random_uuid(),
  purpose    text,
  metadata   jsonb,
  used       boolean default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Aggregate storage stats (read by shared/media-service.js)
create or replace view public.storage_usage as
  select 'supabase'::text as provider,
         coalesce(sum(file_size_bytes), 0)::bigint as total_bytes,
         count(*)::bigint as file_count
  from public.media
  where storage_provider = 'supabase' and is_archived = false;

-- =========================================================================
-- EMAIL / NEWSLETTER / CONTACT
-- =========================================================================
create table if not exists public.email_templates (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,
  name       text,
  subject    text,
  html       text,
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text unique not null,
  status            text not null default 'subscribed',
  resend_contact_id text,
  source            text,
  created_at        timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text,
  subject    text,
  message    text,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- FUNCTIONS
-- =========================================================================
-- security definer avoids RLS recursion when policies check the caller's role.
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_users
    where auth_user_id = auth.uid() and role in ('staff','admin','oracle')
  );
$$;

-- Effective permissions = role defaults ∪ user grants − user revokes.
create or replace function public.get_effective_permissions(p_app_user_id uuid)
returns setof text
language sql stable security definer set search_path = public as $$
  with u as (select role from public.app_users where id = p_app_user_id),
  role_perms as (
    select rp.permission_key as key
    from public.role_permissions rp, u where rp.role = u.role
  ),
  granted as (
    select permission_key as key from public.user_permissions
    where app_user_id = p_app_user_id and granted = true
  ),
  revoked as (
    select permission_key as key from public.user_permissions
    where app_user_id = p_app_user_id and granted = false
  )
  select key from (select key from role_perms union select key from granted) merged
  where key not in (select key from revoked);
$$;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
alter table public.property_config      enable row level security;
alter table public.brand_config         enable row level security;
alter table public.people               enable row level security;
alter table public.app_users            enable row level security;
alter table public.user_invitations     enable row level security;
alter table public.permissions          enable row level security;
alter table public.role_permissions     enable row level security;
alter table public.user_permissions     enable row level security;
alter table public.spaces               enable row level security;
alter table public.media                enable row level security;
alter table public.media_tags           enable row level security;
alter table public.media_tag_assignments enable row level security;
alter table public.media_spaces         enable row level security;
alter table public.upload_tokens        enable row level security;
alter table public.email_templates      enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages     enable row level security;

-- Public-read content (anon + authenticated), staff-write.
do $$
declare t text;
begin
  foreach t in array array[
    'property_config','brand_config','people','spaces','media',
    'media_tags','media_tag_assignments','media_spaces'
  ] loop
    execute format('drop policy if exists %I on public.%I', t||'_read', t);
    execute format('create policy %I on public.%I for select using (true)', t||'_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_write', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t||'_write', t);
  end loop;
end $$;

-- app_users: read/update own row; staff see all.
drop policy if exists app_users_self_read   on public.app_users;
drop policy if exists app_users_self_insert on public.app_users;
drop policy if exists app_users_self_update on public.app_users;
drop policy if exists app_users_staff_all   on public.app_users;
create policy app_users_self_read   on public.app_users for select to authenticated using (auth_user_id = auth.uid() or public.is_staff());
create policy app_users_self_insert on public.app_users for insert to authenticated with check (auth_user_id = auth.uid());
create policy app_users_self_update on public.app_users for update to authenticated using (auth_user_id = auth.uid() or public.is_staff());
create policy app_users_staff_all   on public.app_users for all    to authenticated using (public.is_staff()) with check (public.is_staff());

-- invitations: authenticated can read; a user may accept their own; staff manage.
drop policy if exists invitations_read   on public.user_invitations;
drop policy if exists invitations_accept on public.user_invitations;
drop policy if exists invitations_write  on public.user_invitations;
create policy invitations_read   on public.user_invitations for select to authenticated using (true);
create policy invitations_accept on public.user_invitations for update to authenticated using (lower(email) = lower(auth.email()));
create policy invitations_write  on public.user_invitations for all    to authenticated using (public.is_staff()) with check (public.is_staff());

-- RBAC catalogs: authenticated read; staff write (admin-shell auto-syncs tab perms).
do $$
declare t text;
begin
  foreach t in array array['permissions','role_permissions','user_permissions'] loop
    execute format('drop policy if exists %I on public.%I', t||'_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t||'_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_write', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t||'_write', t);
  end loop;
end $$;

-- upload_tokens / email_templates / newsletter_subscribers / contact_messages:
-- no public policies — only the service_role (edge functions) touches them.

-- =========================================================================
-- GRANTS (Supabase API roles)
-- =========================================================================
grant usage on schema public to anon, authenticated;
grant select on public.storage_usage to anon, authenticated;
grant execute on function public.get_effective_permissions(uuid) to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;

-- =========================================================================
-- SEED
-- =========================================================================
-- Site config: only the "email" feature is enabled (media galleries are core).
insert into public.property_config (id, config) values (1, jsonb_build_object(
  'property', jsonb_build_object('name','HoovyTube','short_name','HoovyTube','tagline','HoovyTube — videos, community & more'),
  'features', jsonb_build_object(
    'email', true, 'sms', false, 'whatsapp', false, 'voice', false,
    'payments_stripe', false, 'payments_square', false, 'payments_paypal', false,
    'esignatures', false, 'documents', false,
    'lighting', false, 'cameras', false, 'music', false, 'climate', false,
    'laundry', false, 'oven', false, 'printer_3d', false, 'glowforge', false,
    'vehicles', false, 'rentals', false, 'events', false, 'associates', false,
    'residents', false, 'airbnb', false, 'pai', false, 'alexa', false
  )
))
on conflict (id) do update set config = excluded.config, updated_at = now();

insert into public.brand_config (id, config) values (1, jsonb_build_object(
  'name','HoovyTube'
))
on conflict (id) do nothing;

-- First admin: hoovytube@gmail.com becomes 'admin' on first sign-in (via invitation).
insert into public.user_invitations (email, role, status)
select 'hoovytube@gmail.com', 'admin', 'pending'
where not exists (select 1 from public.user_invitations where lower(email) = 'hoovytube@gmail.com');
