# Database Schema (HoovyTube)

Supabase project `iglbfojatowaxbhjubvz`. Clean minimal schema — defined in
`supabase/migrations/20260806000000_hoovytube_core.sql`. All tables have RLS enabled.

## Config
- **property_config** `(id int pk, config jsonb, updated_at)` — singleton `id=1`. Site identity + `config.features` flags. Read by `shared/config-loader.js` & `shared/feature-registry.js`. Public read.
- **brand_config** `(id int pk, config jsonb, updated_at)` — singleton `id=1`. Branding tokens. Read by `shared/brand-config.js`. Public read.

## Auth / RBAC
- **app_users** `(id, auth_user_id→auth.users, email, display_name, first_name, last_name, avatar_url, role, person_id→people, is_current_resident, invited_by, last_login_at, created_at)` — admin identities. Own-row read/update; staff read all.
- **user_invitations** `(id, email, role, status, invited_by, invited_at)` — first sign-in of an invited email auto-creates the app_user with that role. Seeded: `hoovytube@gmail.com` → `admin`.
- **permissions** `(key pk, label, description, category, sort_order)` — auto-synced from admin tab defs.
- **role_permissions** `(role, permission_key)` / **user_permissions** `(app_user_id, permission_key, granted)`.
- **is_staff()** → bool (security definer). **get_effective_permissions(app_user_id)** → setof text.

## Media galleries
- **spaces** `(id, name, slug, description, display_order, is_archived, created_at)` — gallery collections. Public read.
- **media** `(id, url, storage_provider, storage_path, media_type, mime_type, file_size_bytes, width, height, title, caption, category, content_hash, is_archived, uploaded_at)` — public read, staff write. Served from the public Storage bucket `media`.
- **media_tags** `(id, name uq, tag_group, color, description)` + **media_tag_assignments** `(media_id, tag_id)`.
- **media_spaces** `(media_id, space_id, display_order, is_primary)` — links media to collections.
- **upload_tokens** `(token, purpose, metadata, used, expires_at, created_at)` — service-role only.
- **storage_usage** (view) — aggregate bytes/count of Supabase-stored media.

## Email / newsletter / contact
- **email_templates** `(id, key uq, name, subject, html, updated_at)` — service-role only.
- **newsletter_subscribers** `(id, email uq, status, resend_contact_id, source, created_at)` — mirror of the Resend Audience. Service-role only (written by the newsletter edge function).
- **contact_messages** `(id, name, email, subject, message, created_at)` — contact-form submissions. Service-role only.

## Storage
- Bucket **`media`** — public, 50 MB limit, image/video mime types. Public read; insert/update/delete require an authenticated staff user (`is_staff()`).

## RLS model
- Content (config, people, spaces, media*) = **public SELECT**, **staff write** (`is_staff()`).
- Sensitive tables (upload_tokens, email_templates, newsletter_subscribers, contact_messages) = **no anon/auth policies** → only edge functions via the service_role key.
