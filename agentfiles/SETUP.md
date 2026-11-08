# Five-agent crew for Elsewhere

You oversee. These bots do the work. You only talk to **Overseer**.

Repo: `https://github.com/archityem/HACKRPI26`  
Live site: `https://hackrpi-26.vercel.app`  
Local branch (ahead of production): `archit-branch`

## You have two different dashboards

| Screen | What it is | What it needs |
|---|---|---|
| [grok.com/dashboard/cloud-agents](https://grok.com/dashboard/cloud-agents) | Cloud Agents that edit and run code | **Privacy Mode (Legacy) off** + GitHub |
| [console.x.ai](https://console.x.ai) | xAI API (curl / scripts) | A **new API key** — you have not created one yet |

`agentfiles/agent.txt` is a **project handoff**, not an API key. Do not paste keys into that file or into git.

## Step 1 — unblock Cloud Agents (required)

The dashboard is blocked: “Cloud Agents need access to your codebase, which Legacy Privacy Mode does not allow.”

1. On that page, click **Edit privacy settings**.
2. Switch **off Legacy Privacy Mode**.
3. Keep current Privacy Mode if offered (no training; code **may** be stored so Cloud Agents can run). Grok Bot / Cloud Agents cannot run on Legacy.
4. Refresh Cloud Agents. Environments and Machines should become available.
5. Connect GitHub if asked. Grant `archityem/HACKRPI26`.

Until this is done, no agent can touch the repo.

## Step 2 — create the xAI API key (only if you want scripts)

On [console.x.ai](https://console.x.ai) → **API Keys** → create a key.

```bash
# PowerShell, this machine only — never commit
setx XAI_API_KEY "paste-the-key-here"
```

Or put it in `agentfiles/.env` (gitignored). Never chat the key to a bot. Use the Secure Form / Vault if a bot asks.

Smoke test:

```bash
curl https://api.x.ai/v1/responses -H "Content-Type: application/json" -H "Authorization: Bearer $XAI_API_KEY" -d "{\"model\":\"grok-4.7\",\"input\":\"Reply with the word pong.\"}"
```

This key is **not** what turns Cloud Agents on. Privacy Mode is.

## Step 3 — create five bots (one job each)

In Cloud Agents: **New run** (or in Grok Bot: **+** → Create a Bot).

Name them exactly:

1. **Builder** — paste `01-builder.md`
2. **Verifier** — paste `02-verifier.md`
3. **Bugs** — paste `03-bugs.md`
4. **Ship** — paste `04-ship.md`
5. **Overseer** — paste `05-overseer.md`

Give each bot its first message from that file. Ask it to remember the job.

## How you work after that

You message **Overseer** only, for example:

> Ship the leftover demo gaps: README is stale, poster fallback is hardcoded, archit-branch is unpushed. Do not merge to main. Brief me when the others are done.

Overseer assigns Builder → Verifier → Bugs → Ship, then writes a short briefing for you.

Hard stops for every bot:

- Do not `git push` or merge to `main` unless Archit says so in that message
- Do not spend money, book travel, or change Vercel env vars
- Do not put secrets in source or chat
- Production URL is evidence, not a place to hot-patch

## Approvals to keep on

Ask first before: push, merge, production deploy, deleting data, installing new paid APIs.  
Allow automatically: `git status`, tests, typecheck, reading the live site.
