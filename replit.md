# SmartEGE

A Chrome Extension (Manifest V3) that injects 💡 hint buttons next to each task on Russian exam preparation sites (reshu.ru, sdamgia.ru, fipi.ru). Helps students prepare for ЕГЭ/ОГЭ with tiered hints: 20% nudge → 50% idea → full explanation.

## Architecture

### Extension (frontend)
- **Framework:** React 18 + Vite + @crxjs/vite-plugin
- **Entry points:** `index.html` (popup), `src/content/content.js` (content script)
- **Services:** `knowledgeService` (JSON-first, AI fallback), `authService` (Google OAuth + JWT), `subscriptionService`, `aiService` (calls backend)
- **UI components:** Lamp (icon-only button), Tooltip (first hint immediately + 3 level buttons), AuthModal (Google sign-in)

### Backend (`server/`)
- **Framework:** Express.js (Node.js, ESM)
- **Database:** Replit PostgreSQL (via `pg` pool, `DATABASE_URL` env var)
- **Routes:** `/api/auth`, `/api/ai`, `/api/subscriptions`, `/api/users`, `/api/billing`
- **Services:** authService (Google token verify + JWT), aiService (OpenAI with cache), usageService (daily limits), subscriptionService
- **Repositories:** thin DB wrappers — userRepository, subscriptionRepository, usageRepository, aiCacheRepository

### Database tables
- `users` — Google OAuth users (id, google_id, email, name, avatar)
- `subscriptions` — plan (free/premium), AI daily limit
- `usage_logs` — daily AI request counters per user
- `ai_cache` — deduplication cache for AI responses (saves cost)
- `hint_history` — per-user hint view history

## How to run

### Backend server
```bash
npm run server
# or in watch mode:
npm run server:dev
```
Runs on port 3001.

### Build the extension
```bash
npm run build
```
Output goes to `dist/`. Load `dist/` as an unpacked extension in Chrome via `chrome://extensions`.

### Development (both at once)
```bash
npm run dev:all
```

## Environment variables needed

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (auto-set by Replit) |
| `SESSION_SECRET` | JWT signing secret (already set in Replit Secrets) |
| `OPENAI_API_KEY` | OpenAI API key — set this to enable AI fallback |
| `VITE_API_URL` | Backend URL baked into extension at build time |

## Configuration before publishing

1. Set `OPENAI_API_KEY` in Replit Secrets to enable AI hints
2. Create a Google Cloud OAuth2 client ID for Chrome Extension, replace `REPLACE_WITH_GOOGLE_CLIENT_ID` in `manifest.json`
3. Set `VITE_API_URL` to your deployed backend URL before building the extension
4. Run `npm run build` and load `dist/` in Chrome

## Hint system priority (cost-optimized)
```
Local JSON knowledge base
    ↓ (no match)
Backend AI cache (PostgreSQL)
    ↓ (cache miss)
OpenAI API (gpt-4o-mini)
    ↓ (always)
Save to AI cache
```

## User preferences
- Keep existing project structure unless asked to change
- Production-ready code, no mocked data, explicit errors
