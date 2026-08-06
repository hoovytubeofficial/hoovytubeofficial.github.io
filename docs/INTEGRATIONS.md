# External Systems & Integrations (HoovyTube)

Non-secret configuration. Secrets live in `docs/CREDENTIALS.md` (gitignored).

## Supabase (database, storage, auth, edge functions)
- **Project ref:** `iglbfojatowaxbhjubvz` · **URL:** https://iglbfojatowaxbhjubvz.supabase.co
- **CLI:** installed as a devDependency → `npx supabase ...` (access token in env for management ops).
- **Storage:** public bucket `media` (50 MB limit; image/video). Public read; staff write.
- **Edge functions (deployed, public):** `contact-form`, `newsletter-signup`.
- **Cost:** Free tier.

## Resend (email) — Free tier, 3,000 emails/mo
- Powers the **contact form** (owner notification) and **newsletter signup** (Resend Audience).
- **Audience:** "HoovyTube Newsletter" (`RESEND_AUDIENCE_ID`).
- **Sending domain:** none yet → from `onboarding@resend.dev`, which only delivers to your Resend
  account email. Verify a domain in Resend to send branded email to any recipient (and to send
  newsletter broadcasts). Dashboard: https://resend.com/domains
- Docs: https://resend.com/docs · Audiences API: https://resend.com/docs/api-reference/contacts

## Hosting
- **Not configured.** Cloudflare Pages was skipped (no custom domain yet). Pushing to `main`
  runs the version-bump CI but does not deploy a live site. See `docs/DEPLOY.md`.

## Not integrated (pruned)
Payments, SMS/WhatsApp/voice, e-signatures, smart-home, vehicles, maker-tools, AI/PAI —
all removed during setup. Re-add later via the template repo if ever needed.
