# Smarter Workout Planning — Discussion Guide

A short walkthrough of two ideas you raised, plus the questions I'd love your input on. No need to prep anything — we can talk through it and I'll take notes against each question.

The two ideas turned out to be about two different things:

1. **Variety within a week** — don't repeat Monday's exercises on Wednesday.
2. **Knowing when a workout has gone stale** — a nudge when a client has done the same workout 3–4 times and it's time to change it up.

Both touch the "copy from a previous workout" feature, which is why they came up together.

---

## Idea 1 — Avoid repeating exercises within the week

**The problem:** When building a session, it's easy to program something the client already did earlier that week — especially while we're first loading everyone in from the paper system.

**What we're thinking:** When you add an exercise to a workout, the app would flag anything that client already did this week — e.g. a little note next to it: *"Bench Press · already done Mon."* It wouldn't stop you (sometimes repeating is on purpose), just give you a heads-up in the moment.

There's also a bigger version — a side-by-side view of the week's other sessions next to the one you're writing. That's closer to laying the paper sheets next to each other, but it's a lot busier on a phone. We could do the simple flags first and add the full view later if you want it.

### Questions for you

1. **What counts as "this week"?** Monday–Sunday? A rolling last-7-days? Or does each client's week start on a different day?
2. **Same exercise, or same muscle/movement?** Do you mostly care about repeating the *exact* exercise, or more about not hitting the same muscle group / movement pattern twice close together? (We can do either — the muscle-group version is smarter but also noisier.)
3. **Just a heads-up, or should it actually block you?** Our instinct is a soft warning you can ignore. Agree?
4. **Whose workouts should count?** Only the ones you programmed, or everything the client did that week (other trainers, workouts they did on their own)?
5. **How useful is the full side-by-side view** vs. just the inline flags? Worth the extra effort, or is the flag enough?

---

## Idea 2 — "This client's 4th time doing this workout"

**The problem:** We generally change a client's program every 3–4 workouts, but there's nothing tracking that — it's easy to lose count and keep copying the same thing.

**What we're thinking:** When you copy a previous workout and pick the date, the app would tell you something like:

> *"This will be Jordan's 4th time doing this workout (first run May 12). Continue copying, or switch it up?"*

For this to work, the app needs to quietly remember that one workout was copied from another, so it can count the chain. That's a small change on our end.

A possible bonus: a dashboard showing **"clients due for a program change"** — so instead of only reminding you at the moment you copy, it could surface clients who are overdue at a glance.

### Questions for you

1. **When should the count reset?** If you copy the workout but swap one exercise, is that "still the same workout" (count keeps climbing) or "a new workout" (count starts over)? In other words — how much has to change before it counts as a fresh program?
2. **Is 3–4 a hard rule, a default, or per-client?** Should some clients be set to rotate faster or slower?
3. **The reminder, the dashboard, or both?** Is the in-the-moment warning enough, or would a "due for a change" list be more useful?
4. **Should you be able to copy from a workout that hasn't happened yet** (one that's still scheduled)? Right now copy only offers completed sessions, which might be limiting while we plan a week ahead or load the system.

---

## The bigger-picture question

Both ideas above are quick, targeted improvements to how you work today (build/copy one session at a time).

There's also a larger direction some training tools take: a **"Program" or "Block"** — a named set of workouts you assign to a client for a stretch of time or a number of sessions. The app would then know it's a "4-session block" automatically, generate the sessions for you, and you'd stop re-copying every time.

That's a much bigger build and it changes how the app works day to day, so I don't want to jump to it. But it's worth asking:

- **Do the quick nudges fit how you actually work**, or are you already thinking in "programs/blocks" in your head and want the app to match that?

My suggestion is to ship the two simple wins first, see how they feel, and revisit the bigger idea once we've learned from them.

---

*Bring any other planning frustrations too — this is a good moment to get them on the table.*
