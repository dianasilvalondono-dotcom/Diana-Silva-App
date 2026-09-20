# Ronda

A wellness platform for women, grounded in DBT and affective neuroscience.
Live at **[rondahub.com](https://rondahub.com)**.

Built and shipped by one person — a lawyer, working with AI-assisted development,
with no engineering team.

---

## Architecture

| Layer | Stack |
|---|---|
| Client | React 19 + Vite, PWA, mobile-first (430px) |
| Data | Supabase — PostgreSQL with row-level security on every table |
| Serverless | Vercel Functions (`/api`) |
| Push | OneSignal |
| Analytics | PostHog (no-op without a key) |

## The AI layer

Four serverless functions. **Every provider key lives server-side** — none of them
reaches the browser bundle.

| Endpoint | Model | Role |
|---|---|---|
| `/api/agent` | Claude Sonnet 5 | Conversational companion with persistent user memory, day context, and crisis escalation |
| `/api/generate-program` | Claude Haiku 4.5 | Turns a stated goal into a structured 7-day programme (strict JSON) |
| `/api/guia` | Claude Sonnet 5 | Guided psychoeducation |
| `/api/speak` | ElevenLabs `multilingual_v2` | Speech synthesis for the companion's replies |

### Three decisions worth explaining

**Nothing hard-fails in front of a user.** Every AI function degrades rather than
erroring. No `ANTHROPIC_API_KEY` and `generate-program` falls back to six programmes
written by hand plus a generic scaffold. No `ELEVENLABS_API_KEY` and the audio control
is simply not rendered. A woman opening this app in distress never sees a stack trace.

**Clinical guardrails live in the prompt, not in review.** The agent is instructed never
to diagnose and never to use clinical vocabulary — it validates, normalises, then offers
a tool, in that order. Guías are certified wellness coaches, not psychologists, which
keeps the platform outside Colombia's Ley 1090 scope. Every surface carries a
"complement to, not a replacement for, professional care" disclaimer.

**The crisis path sounds different.** When the agent detects distress it surfaces DBT
tools, and the synthesis for that path runs at higher stability and slower speed than
normal replies — flatter, less inflected, so the voice does not escalate what the user
is already feeling.

## Voice input

The diary uses the browser's native Web Speech API (`es-CO`, continuous, interim
results), with a written fallback for unsupported browsers. Recognition accuracy
degrades on Caribbean coastal accents — a known limitation, not a solved problem.

## Local development

```bash
npm install
cp .env.example .env   # fill in Supabase; AI keys are optional
npm run dev
```

The app runs without any AI key — every function falls back to deterministic content.

## Layout

```
api/            Vercel serverless functions (AI + push)
src/
  components/   UI, split by view
  lib/          Supabase, auth, notifications, analytics, speech
  constants/    Design tokens, colours, static content
  utils/        Helpers, migrations
PRODUCT.md      What gets built, and what deliberately does not
```

## Known limitations

- `src/App.jsx` is still a large monolith. Views are being extracted into
  `src/components/views/` one at a time; `HistoriaView`, `FrasesView` and `DiarioView`
  are done.
- No automated test suite yet.
- Speech recognition accuracy on coastal Colombian accents, noted above.
