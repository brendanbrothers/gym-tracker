# What's changing: the new workout builder

Based on your feedback, we're reworking how you create and write a workout. The goal is to let you **see a client's previous workout right next to the one you're building**, avoid accidentally repeating exercises within a week, and know when a client has been on the same workout long enough that it's time to change it up.

Here's what it will look like and how it'll work. Nothing here changes how *logging* a workout works — this is only about building/planning one.

---

## Creating a workout

The "New workout" pop-up gets simpler. You'll still pick the **client, trainer, date, and time** — but the "copy from previous workout" dropdown goes away. (It was hard to use: you couldn't actually see what was in a workout before copying it.)

When you create the workout, you land on a new **two-pane build page** instead.

---

## The build page (two panes, side by side)

**Left side — the reference workout.** This is a previous workout for the same client, shown in full: every circuit, exercise, set, target, and what they actually lifted.

- At the top is a simple **pager**: a left arrow ◀, the workout's **date** (with its time, exercise count, and status — Completed, Scheduled, etc.) below it, and a right arrow ▶. Click the arrows to flip through the client's recent workouts and the other workouts they have this week.
- A **"Copy this whole workout →"** button pulls the entire thing into the new workout on the right, the same way copy works today (it carries last time's actual numbers forward as the new targets, so progression is built in).

**Right side — the workout you're building.** This is the normal editor. You add circuits and exercises here as usual.

Because the old workout is right there beside you, you can glance over and see exactly what they did — and copy it across, or build something fresh while using it as a reference.

---

## "Time to switch it up?" nudge

You told us you generally change a client's program every 3–4 workouts. Now, when you go to copy a workout forward, the app keeps track of how many times that workout has been repeated, and will tell you:

> *"Copying this = Jordan's 4th run of this workout (first run May 26). Time to switch it up?"*

It's just a heads-up — you can copy anyway. It's there so you don't lose count.

> Note: this counter starts fresh when the feature launches, so it'll take a few weeks of normal use before the numbers reflect a client's full history. Early on, a workout you've already repeated several times may still show as an early run.

---

## "Already done this week" warning

This is the one about not repeating exercises within a week (the problem from the paper system). When you add an exercise to a workout, if the client **already did that same exercise earlier this week**, you'll see a small amber flag — e.g. *"Done Mon"* — next to it in the search list, plus a one-line note once you pick it:

> Note: unlike the "switch it up" counter above, this one works right away — it reads the workouts already in the system, so it's accurate from day one for every client, including workouts entered before this feature.

> *"Jordan already did Bench press this week (Mon, wide grip). Adding anyway is fine."*

A few details, based on what you told us:

- **The week is Monday–Sunday.**
- It counts **all** of that client's workouts that week, not just the ones you wrote.
- It's a **soft warning only** — it never stops you. Sometimes repeating is intentional.
- It matches on the **exact exercise**. If you logged a grip or tempo note (the "modifier"), we show that too, so you can see at a glance that Tuesday's bench was a different grip and ignore the warning.

> Note: a fuller "variants" system — where, say, wide-grip and close-grip bench are formally treated as different movements — is being looked at separately. For now the warning shows the note text so you can tell the difference yourself.

---

## What we're *not* doing (for now)

A couple of ideas came up that we've intentionally set aside to keep this focused:

- **"Week 1 / Workout A" labels.** This overlapped heavily with the "how many times have they done this" counter above, and starts to turn into a bigger "training program" feature. We'd rather do that properly later than half-build it now.
- **A "clients due for a change" dashboard.** A natural next step once the counter exists — flagging clients who've been on the same workout too long — but not in this round.

---

*Questions or anything that doesn't match how you actually work? Let me know before I finish building it.*
