# 🎄 Winter Advent Calendar

A 12-ornament advent tree. Tracy fills each person's 12 ornaments in the studio
and sends them a secret link. Starting Dec 1 they can open any ornament, one new
one per day (Pacific time). On Dec 31 everything unlocks so they can catch up.

- **Recipient tree:** `/c/<secret-slug>`
- **Studio** (password login): `/studio`

## Setup

1. Make a Supabase project, then paste [`supabase/schema.sql`](supabase/schema.sql) into the SQL Editor and run it.
2. Copy `.env.example` to `.env.local` and fill it in.
3. Check the setup, then start the app:

```bash
npm install
npm run check:supabase
npm run dev
```

## How it fits together

| Where | What |
|---|---|
| `src/app/c/[slug]` | The tree page |
| `src/app/api/c/[slug]/…` | Ornament, riddle, reaction and reminder sign-up endpoints. Locked ornaments return 423 and never send their content. |
| `src/app/studio` | Studio pages and server actions |
| `src/app/api/media/[key]` | Redirects to a 1-hour signed link for an uploaded file |
| `src/lib/store.ts` | All database reads and writes |
| `src/lib/time.ts`, `src/lib/doors.ts` | Unlock rules: December only, one new ornament a day, all open Dec 31 |
| `src/lib/validate.ts` | Checks ornament content before it's saved |

When you're logged in to the studio, add `?now=2026-12-09` to any tree link
to preview it as of that date. Your previews skip the one-a-day rule and never
count as the recipient opening an ornament.
