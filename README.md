# 🎄 Winter Advent Calendar

A snowy-village advent calendar, Dec 1–25. Tracy fills each person's 25 doors
in the studio and sends them a secret link. Doors unlock at midnight Pacific.

- **Recipient village:** `/c/<secret-slug>`
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
| `src/app/c/[slug]` | The village page |
| `src/app/api/c/[slug]/…` | Door, riddle, reaction and reminder sign-up endpoints. Locked doors return 423 and never send their content. |
| `src/app/studio` | Studio pages and server actions |
| `src/app/api/media/[key]` | Redirects to a 1-hour signed link for an uploaded file |
| `src/lib/store.ts` | All database reads and writes |
| `src/lib/time.ts` | Unlock rules (Pacific time) |
| `src/lib/validate.ts` | Checks door content before it's saved |

When you're logged in to the studio, add `?now=2026-12-09` to any village link
to preview it as of that date. Your previews never count as the recipient
opening a door.
