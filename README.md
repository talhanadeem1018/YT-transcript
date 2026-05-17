# Transcript Flow

One-page React + Supabase + Vercel application for generating YouTube transcripts with Apify, daily credits, auth-gated generation, and saved history.

## Stack

- React + Vite
- Supabase Auth + Postgres
- Vercel Serverless Functions
- Apify Actor API

## Recommended Apify actor

Selected actor: `prodiger/youtube-transcript-scraper---transcriber`

Why this one:

- Very low caption-path pricing compared with other Apify transcript actors
- Supports YouTube watch URLs, short URLs, Shorts URLs, and raw video IDs
- Returns transcript metadata that fits the app well
- Has a fallback architecture for harder cases, while still letting us stay cost-aware

References:

- [Apify actor listing](https://apify.com/prodiger/youtube-transcript-scraper---transcriber)
- [Apify actor runtime docs](https://docs.apify.com/platform/actors/running)

## Environment variables

Create these in local `.env` and in Vercel Project Settings:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
APIFY_API_TOKEN=
APIFY_ACTOR_ID=prodiger/youtube-transcript-scraper---transcriber
```

## Supabase setup

1. Create a new Supabase project.
2. Open SQL Editor.
3. Run [`supabase/schema.sql`](/C:/Users/HP/OneDrive/Desktop/codex-YT transcript/supabase/schema.sql).
4. In Authentication, enable Email auth.
5. If you want instant login after signup, disable email confirmation or configure your email templates.

## Local run

```bash
npm install
npm run dev
```

## Vercel deployment

1. Push this project to GitHub.
2. Import the repo into Vercel.
3. Add the same environment variables in Vercel.
4. Deploy.

## Product behavior

- User lands directly on the transcript page, not on a login screen.
- User pastes a YouTube link or raw video ID.
- On first generate attempt, auth modal appears with the required message.
- After login/signup, transcript generation runs through Vercel API -> Apify -> Supabase save.
- Each user gets `1` daily credit.
- Each new user also gets a `7-day` unlimited offer window.
- History stores video URL, transcript, and date.

## Important note

This project includes account and billing placeholders, but not payment gateway integration. If you want, the next step can be Stripe subscription checkout plus real billing sync inside Supabase.
