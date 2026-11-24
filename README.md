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

The welcome screen signs you in with Google or Microsoft. You arrive as that account. There is no list of people to pick from.

The first person to sign in becomes the admin of an empty workspace. They add projects, criteria, and reviewers from Settings. An invited reviewer signs in with the same email and sees the reviews assigned to them.

Until the provider credentials exist, the buttons stay disabled and the welcome screen lists the redirect URLs to register:

- `{origin}/api/auth/callback/google`
- `{origin}/api/auth/callback/microsoft-entra-id`

Set `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_MICROSOFT_ID`, and `AUTH_MICROSOFT_SECRET`. `AUTH_MICROSOFT_TENANT` is optional; leave it unset to allow any work or personal Microsoft account.

Locally, copy those names into `.env.local`. Do not commit that file. The dev server uses an in-memory database when `DATABASE_URL` is unset.

## What you can do

- Add projects, reviewers, and criteria as you go. Settings is where they live.
- See what is due on the dashboard, including reviews that need you.
- Move a review on the calendar. Dropping it sets a new deadline.
- Send a design: project, title, Figma link, send date, how long reviewers have, optional reviewers and criteria.
- Leave feedback against a criterion, with severity and an optional Figma comment link.
- Close, reopen, archive, and remind. Marking the last reviewer done completes the review.

Settings can load a Sunrise Studio sample. You stay signed in as yourself.

## Stack

Next.js, React, TypeScript, and Tailwind. Interface primitives come from shadcn/ui. Sign-in is Auth.js with Google and Microsoft Entra ID. The workspace is stored in Postgres when the app is published, and in memory during local development.
