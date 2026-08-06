## Project Identity Check

This is **hoovytubewebsite** (HoovyTube). If the user mentions **finleg**, **portsie**, or **sponic** and the request doesn't match this project, **STOP** and warn:
> "You mentioned **{keyword}** but this session is in **hoovytubewebsite**. Did you mean to run this in the other project?"

# HoovyTube — Project Directives

Public portfolio + community + marketing site for the HoovyTube content creator.
**No user accounts / no public registration.** Admin login exists for site management only.

Enabled features: **core**, **email (Resend)**, **media galleries (Supabase Storage)**.
Everything else (payments, smart-home, vehicles, maker-tools, SMS/voice, e-sign, AI) was pruned.

> **On-demand docs — load when the task matches:**
> - `docs/CREDENTIALS.md` — **load for:** SQL queries, deploying functions, API keys (gitignored)
> - `docs/SCHEMA.md` — **load for:** writing queries, modifying tables, debugging data
> - `docs/PATTERNS.md` — **load for:** writing UI code, Tailwind styling, code review
> - `docs/DEPLOY.md` — **load for:** pushing, deploying, version questions
> - `docs/INTEGRATIONS.md` — **load for:** external APIs (Resend), vendor setup, pricing

## Mandatory Behaviors

1. After code changes: end response with `vYYMMDD.NN H:MMa [model]` + affected URLs (read `version.json`)
2. Push to `main` — CI bumps the version. **Hosting/Cloudflare Pages is NOT configured yet**, so a push does not deploy a live site.
3. CI bumps version — never bump locally
4. Run SQL migrations directly via `npx supabase db push` — never ask the user to run SQL manually

## Code Guards

- Filter archived items: `.filter(s => !s.is_archived)` client-side
- No personal info in consumer/public views
- `showToast()` not `alert()` in admin
- `openLightbox(url)` for images
- Media served from the public Supabase Storage `media` bucket via `shared/media-service.js`
- Tailwind: use design tokens from `@theme` block (see `docs/PATTERNS.md`). Run `npm run css:build` after new classes.

## Quick Refs

- **Tech:** Vanilla HTML/JS + Tailwind v4 | Supabase | (hosting TBD — Cloudflare Pages planned)
- **Live:** _not deployed yet — no host configured_
- **Supabase project ref:** `iglbfojatowaxbhjubvz`
- **Architecture:** Browser → static site → Supabase (no server-side code)
- **Repo:** https://github.com/hoovytubeofficial/hoovytubewebsite
- **Supabase CLI:** installed as devDependency — invoke with `npx supabase ...`
