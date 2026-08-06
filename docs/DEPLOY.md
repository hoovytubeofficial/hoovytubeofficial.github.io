# Deployment Workflow

## Hosting: GitHub Pages (org-root)

The site is served by **GitHub Pages** from the repo root of
`hoovytubeofficial/hoovytubeofficial.github.io`, deploying from the `main` branch,
root folder (`/`). No build step is needed — `styles/tailwind.out.css` is committed.

- **Live URL:** https://hoovytube.com/
- Absolute `/…` asset paths work because the site is served at the domain root
  (this is why an org-root Pages repo was chosen over a project page).
- `.nojekyll` at the repo root disables Jekyll so files are served as-is.

### Push workflow
```bash
git add -A && git commit -m "message"
git pull --rebase origin main && git push origin main
```
A push to `main` republishes the site within ~1 minute.

### First-time Pages setup (one-time, GitHub UI)
1. Repo renamed to `hoovytubeofficial.github.io` (org-root site).
2. Settings → Pages → Build and deployment → Source: **Deploy from a branch** →
   Branch: `main` / `/ (root)` → Save.
3. Wait ~1 min, then load https://hoovytube.com/.

### Version
`version.json` is stamped by a GitHub Action (`.github/workflows/bump-version-on-push.yml`)
if Actions are enabled. Never bump locally.

## Live URLs

| Environment | URL |
|---|---|
| Live site | https://hoovytube.com/ |
| Contact / newsletter | https://hoovytube.com/contact/ |
| Admin (login-gated) | https://hoovytube.com/spaces/admin/manage.html |
| Repository | https://github.com/hoovytubeofficial/hoovytubeofficial.github.io |
| Supabase project | https://supabase.com/dashboard/project/iglbfojatowaxbhjubvz |

## Tailwind CSS
After adding new Tailwind classes, run: `npm run css:build`
