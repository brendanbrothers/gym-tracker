# GymTracker — Getting Started

A quick introduction to the everyday tasks in GymTracker. This guide is written for trainers; client-only notes are called out where they differ.

---

## Logging in

1. Go to the app and you'll land on the **Sign in** page.
2. Enter your **Email** and **Password**.
3. Click **Sign in** (or press Enter).

If your details are wrong you'll see *"Invalid email or password."* Once signed in you land on the **Home** page, which has a sidebar (Home, Workouts, Clients, Trainers, Progress, Exercises) and quick-action cards.

To log out, use **Sign out** at the bottom of the sidebar.

---

## Changing a password

> **Trainers/admins only (for now).** Password changes are handled by a trainer or admin. Clients do not currently have access to change their own password — this may be added for clients in the future.

1. Open **Users** (the user list) from the sidebar.
2. Click the **pencil / edit** icon next to the person.
3. In the **Edit Client / Edit Trainer** dialog, fill in **New Password (leave blank to keep current)**.
4. Save.

Leaving the field blank keeps the existing password unchanged.

---

## Creating a client

Trainers and admins can add clients.

1. Go to **Clients** and click **Add User** (top right) — or use the **New User** quick-action card on Home.
2. In the **Add New User** dialog, fill in:
   - **Name**
   - **Email**
   - **Password**
   - **Role** — choose **Client** (also available: Trainer, Admin)
3. Click **Create User**.

When opened from the Clients page, the role defaults to **Client**.

---

## Creating a workout

Trainers create workouts for clients.

1. Go to **Workouts** and click **New Workout** (top right) — or use the **New Workout** quick-action card on Home.
2. In the **Start New Workout** dialog, fill in:
   - **Client** (required)
   - **Trainer** (optional)
   - **Date** (defaults to today)
   - **Copy from previous workout** (optional — see [Creating a follow-up workout](#creating-a-follow-up-workout-next-session)). Leave on **Start fresh** for a blank workout.
3. Click **Start Workout**.

You're taken to the workout page, ready to add exercises.

---

## Adding sets and exercises

A workout is organized into **Sets** (Set 1, Set 2, …), and each set contains one or more **exercises**, and each exercise has one or more **rounds**.

### Add a set
Click **Add Set** at the bottom of the workout. A new numbered set appears.

### Add an exercise to a set
1. Click **Add Exercise** inside the set card.
2. In the **Add Exercise** dialog, start typing in **"Type to search exercises…"** and pick from the matches.
   - If it doesn't exist, click **Create "<name>" as new exercise**, fill in **Name** (and optionally **Category**, **Primary Muscle**, **Equipment**), and click **Create Exercise**.
3. Set the targets for the exercise:
   - **Modifier** (optional notes, e.g. *"start at 10, slow tempo"*)
   - **Rounds** (default 3)
   - **Target Reps**
   - **Weight (lbs)**
   - **Duration (s)** — for timed/hold exercises
   - If the client has personal bests for this exercise, you'll see them here and a flag if your targets would beat a PB.
4. Click **Add to Set**. One row is created per round.

### Add another round
Click **Add Round** under an exercise to add a round; it inherits the previous round's targets.

---

## Logging results and using the check marks

During the session, each round row has fields to record what actually happened:

- **Reps** — actual reps performed
- **Weight** — actual weight used
- **Note** — anything worth recording
- A **check button** to mark the round **complete**

Click the **check** to mark a round complete (the button fills in; click again to mark it incomplete). Completing a round saves the row and checks for a new **personal best** — if hit, you'll get a *"New personal best — <exercise>! 🎉"* toast.

> Clients can log results (reps, weight, notes, check marks) on **their own** workouts. Adding/removing sets, exercises, and rounds is trainer-only.

---

## Completing a workout

When the session is done, click **Complete Workout** (top right of the workout page).

- The status changes to **Completed** (shown as a green badge).
- Editing and logging are locked.
- A **Reopen Workout** button appears if you need to make changes — click it to set the workout back to in-progress.

---

## Creating a follow-up workout (next session)

When it's time for the next session, create a new workout one of two ways:

### Copy from a previous workout
1. Start a **New Workout** and select the **Client**.
2. Open **Copy from previous workout** and choose a past (completed) session — each is listed as `date — exercise, exercise, …`.
3. Click **Start Workout**.

The new workout copies the full structure and **targets** (sets, exercises, rounds, target reps/weight/duration) but **not** the previous actual results — so you start fresh on logging while keeping the plan.

### From scratch
1. Start a **New Workout** and select the **Client**.
2. Leave **Copy from previous workout** on **Start fresh**.
3. Click **Start Workout**, then add sets and exercises manually.

---

*That's the core loop: log in → create/select a client → create a workout (fresh or copied) → add sets, exercises, and rounds → log results and check off rounds → complete the workout.*
