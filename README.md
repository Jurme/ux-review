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

The dev server uses an in-memory database when `DATABASE_URL` is unset.

## What you can do

- Add projects, reviewers, and criteria as you go. Settings is where they live.
- See what is due on the dashboard, including reviews that need you.
- Move a review on the calendar. Dropping it sets a new deadline.
- Send a design: project, title, Figma link, send date, how long reviewers have, optional reviewers and criteria.
- Leave feedback against a criterion, with severity and an optional Figma comment link.
- Close, reopen, archive, and remind. Marking the last reviewer done completes the review.

Settings can load a Sunrise Studio sample. You stay signed in as yourself.

## Stack

Next.js, React, TypeScript, and Tailwind. Interface primitives come from shadcn/ui. Sign-in is email and password through Auth.js. The workspace is stored in Postgres when the app is published, and in memory during local development.
