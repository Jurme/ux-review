# UX Review

A lightweight workspace for asynchronous UX and UI design reviews. Designers schedule a review window, invite reviewers, attach a Figma link, reuse criteria, and track structured feedback — without a spreadsheet.

The calendar shows when a review is open. The review page shows who still owes notes, and what they said.

## Run it

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js. The dev server uses port **3847**.

## Sign in

The welcome screen has Sign in and Sign up. Sign in asks for email and password. Sign up also asks for your name. You arrive as that account. There is no list of people to pick from.

The first person to sign in becomes the admin of an empty workspace. Anyone who signs in after that joins as themselves. Projects and criteria are added in Settings. Reviewers are people who have already signed in.

Accounts and the workspace are stored in Supabase. On this machine, with no Supabase URL set, they stay in `.data/` so you can still sign in after a restart.

## What you can do

- Add projects, reviewers, and criteria as you go. Settings is where they live.
- See what is due on the dashboard, including reviews that need you.
- Move a review on the calendar. Dropping it sets a new deadline.
- Send a design: project, title, Figma link, send date, how long reviewers have, optional reviewers and criteria.
- Leave feedback against a criterion, with severity and an optional Figma comment link.
- Close, reopen, archive, and remind. Marking the last reviewer done completes the review.

Settings can load a Sunrise Studio sample. You stay signed in as yourself.

## Deploy on Vercel

Create a Supabase project, then either install the Supabase integration on the Vercel project or set the env vars yourself.

Set `POSTGRES_URL` to the **Transaction pooler** connection string (host `pooler.supabase.com`, port `6543`). The Vercel integration sets this for you. Also set `AUTH_SECRET` to a long random string so sessions stay valid across servers.

The production build does not connect to the database. Tables are created on the first request. `POSTGRES_URL_NON_POOLING` is optional.

## Stack

Next.js, React, TypeScript, and Tailwind. Interface primitives come from shadcn/ui. Sign-in is email and password through Auth.js. The workspace is stored in Supabase Postgres. Local development without `POSTGRES_URL` uses `.data/`.
