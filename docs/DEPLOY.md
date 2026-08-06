# Deployment Workflow

> **STATUS: Hosting not configured yet.** Cloudflare Pages was intentionally skipped during
> setup (no custom domain yet). Pushing to `main` runs the version-bump CI but does **not**
> deploy a live site. When ready, follow "Cloudflare Pages Setup" below (or pick another host).

## Cloudflare Pages (Static Site) — PLANNED, not yet connected

Once connected, deploys from `main` branch via GitHub Actions → Cloudflare Pages.

### Push Workflow
```bash
git add -A && git commit -m "message"
./scripts/push-main.sh   # pull --rebase, then push
```

### Post-Push Verification
1. Wait ~60s for CI to run (Tailwind build + Cloudflare Pages deploy)
2. `git pull --rebase origin main`
3. Read `version.json` — report version

### Version Format
`vYYMMDD.NN H:MMa` — date + daily counter + Austin time.
CI bumps automatically via GitHub Action on every push. **Never bump locally.**

### Post-Push Output Format
- **Main branch:** "Deployed to main — ..." with test URLs
- **Feature branch:** "Pushed to branch `name` (not yet deployed)" with changed files list

### Cloudflare Pages Setup

1. Create a Cloudflare Pages project connected to your GitHub repo
2. Build command: `npm run css:build`
3. Build output directory: `.` (root — the entire repo is the site)
4. Add GitHub secrets:
   - `CLOUDFLARE_API_TOKEN` — API token with Pages edit permissions
   - `CLOUDFLARE_ACCOUNT_ID` — Your Cloudflare account ID
5. Set GitHub variable `CLOUDFLARE_PAGES_PROJECT` to your project name

### Preview Deployments
Every pull request automatically gets a preview deployment URL:
`https://<branch>.<project>.pages.dev`

## Live URLs

| Environment | URL |
|---|---|
| Live site | _not deployed yet — no host configured_ |
| Admin | `/spaces/admin/manage.html` (once hosted; login-gated) |
| Contact / newsletter | `/contact/` |
| Repository | https://github.com/hoovytubeofficial/hoovytubewebsite |
| Supabase project | https://supabase.com/dashboard/project/iglbfojatowaxbhjubvz |

## Tailwind CSS

After adding new Tailwind classes, run: `npm run css:build`
