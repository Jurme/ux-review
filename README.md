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

The welcome screen offers Google and Microsoft. In this sample they do not contact those providers and they never ask for a password. Pick a Sunrise Studio account — Tashi Dorji is the design lead — then switch accounts from the sidebar to see the same review as a reviewer.

Tshering Dema is invited but has not signed in. Signing in with that account activates membership. Reviewers can be invited by email before they have an account.

## What you can do

- See what is due on the dashboard, including reviews that need you.
- Move a review on the month or week calendar. Dropping it sets a new start date and keeps the length of the window.
- Create a review in one pass: brief, Figma link, schedule, reviewers, criteria, then save a draft or publish.
- Leave feedback against a criterion, with severity and an optional Figma comment link.
- Close, reopen, archive, and remind. Completion is finished reviewers divided by assigned reviewers.

Everything is stored in this browser. Settings can restore the sample workspace.

## Stack

Next.js, React, TypeScript, and Tailwind. Interface primitives come from shadcn/ui. A production version of this workspace would use Supabase for data and Google / Microsoft sign-in, and Resend for reminder email. Those services are not connected here, so the app runs without credentials.
