# GLP-1 Daily Briefing — GitHub Actions Setup

Runs automatically at 7:30 AM (Mon–Fri, Irish time). No server, no cron, no local setup.

---

## One-time setup (~10 minutes)

### Step 1 — Create a GitHub repo

1. Go to https://github.com/new
2. Name it `glp1-briefing` (private is fine)
3. Click **Create repository**

### Step 2 — Upload these files

Drag and drop all files from this folder into the repo via the GitHub web UI, keeping the folder structure:

```
.github/
  workflows/
    briefing.yml
briefing.js
package.json
```

Or if you have git installed:
```bash
cd glp1-actions
git init
git remote add origin https://github.com/YOUR_USERNAME/glp1-briefing.git
git add .
git commit -m "init"
git push -u origin main
```

### Step 3 — Add secrets

In your repo: **Settings → Secrets and variables → Actions → New repository secret**

Add each of these:

| Secret name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your key from https://console.anthropic.com |
| `SMTP_HOST` | `smtp.office365.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `colmgalligan@outlook.com` |
| `SMTP_PASS` | Your Outlook password |

### Step 4 — Test it manually

In your repo: **Actions → GLP-1 Daily Briefing → Run workflow → Run workflow**

Check your inbox within ~30 seconds.

---

## Schedule

Runs Mon–Fri at 7:30 AM Irish time by default.

To change the schedule, edit `.github/workflows/briefing.yml` and update the cron line:
- `'30 6 * * 1-5'` = Mon–Fri 7:30 AM (UTC+1)
- `'30 6 * * *'`   = Every day 7:30 AM

GitHub Actions runs on UTC. Add 1 hour for Irish Standard Time (IST), or 0 hours during winter (GMT).

---

## Troubleshooting

Check run logs: **Actions → GLP-1 Daily Briefing → click a run → send-briefing**

- **Auth error**: double-check SMTP_PASS secret — Outlook may require an app password if 2FA is on
- **Anthropic 401**: check ANTHROPIC_API_KEY secret
- **No email received**: check spam folder; verify SMTP_USER matches your Outlook address exactly
