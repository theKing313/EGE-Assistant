---
name: SmartEGE architecture
description: Key decisions and constraints for the SmartEGE Chrome extension + Express backend project
---

## Structure
- Chrome extension (React 18 + Vite + @crxjs) — popup at `index.html`, content script at `src/content/content.js`
- Express backend at `server/` (ESM, port 3001) — workflow "SmartEGE Backend"
- PostgreSQL via Replit's DATABASE_URL; tables: users, subscriptions, usage_logs, ai_cache, hint_history

## Critical decisions

**AI is NEVER called when JSON matches (MIN_SCORE ≥ 1).**
`knowledgeService.findHint()` → JSON first → AI fallback only on zero score.
**Why:** cost guarantee; OpenAI spend is bounded to genuinely unknown questions.

**AI responses are cached server-side in `ai_cache` by SHA-256 of (subject + taskText + level).**
Cache hit does NOT increment usage_logs.
**Why:** same question from 1000 students costs one API call, not 1000.

**Daily limits live in `subscriptions.ai_limit_per_day`, counters in `usage_logs(user_id, date)`.**
Free = 20/day, Premium = 300/day (configurable per row, not hardcoded).
**Why:** predictable costs, client cannot bypass.

**manifest.json `oauth2.client_id` is a placeholder.** User must create a Google Cloud OAuth2 app for Chrome Extension and replace `REPLACE_WITH_GOOGLE_CLIENT_ID`.

**`VITE_API_URL` must be set before `npm run build`** — it's baked into the extension bundle by Vite.
Backend URL is NOT auto-discoverable at runtime inside a Chrome extension.

**HintSelector component is now unused** — level switching moved into Tooltip.jsx directly.
The files still exist but are not imported anywhere.

## How to apply
- Before touching auth: Google OAuth for Chrome extensions uses `chrome.identity.getAuthToken` (not redirect flow).
- Before adding AI subjects: add JSON file to `public/knowledge/`, register in `SUBJECT_FILES` in `knowledgeService.js`.
- Backend route changes need server workflow restart; extension changes need `npm run build` + Chrome reload.
