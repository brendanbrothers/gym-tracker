import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const pad = (n: number) => String(n).padStart(2, "0")

// ============================================================================
// DATES & TIMES
//
// All session dates are stored in the database as UTC instants, and the whole
// app displays and interprets them in a single fixed timezone (the gym's).
// This is deliberate: pages render on the server (UTC) and in the browser, and
// without an explicit zone toLocale* would format differently in each place.
// Pinning to one zone keeps display, input, and day-boundary math consistent
// everywhere regardless of where the code runs.
// ============================================================================

export const APP_TIME_ZONE =
  process.env.NEXT_PUBLIC_APP_TIME_ZONE || "America/St_Johns"

// Wall-clock parts of an instant as seen in APP_TIME_ZONE.
function zonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date)
  const p: Record<string, string> = {}
  for (const part of parts) if (part.type !== "literal") p[part.type] = part.value
  return p
}

// Offset (ms) between APP_TIME_ZONE wall-clock and UTC at the given instant,
// i.e. (wall-clock read as UTC) - instant. Negative for zones behind UTC.
function zoneOffsetMs(utcMs: number) {
  const p = zonedParts(new Date(utcMs))
  const wallAsUtc = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour,
    +p.minute,
    +p.second
  )
  return wallAsUtc - utcMs
}

// Convert an APP_TIME_ZONE wall-clock ("YYYY-MM-DD", "HH:mm") to a UTC instant.
function zonedWallTimeToUtc(dateStr: string, timeStr: string) {
  const [y, mo, d] = dateStr.split("-").map(Number)
  const [h, mi] = timeStr.split(":").map(Number)
  // Treat the wall time as if it were UTC, then correct by the zone's offset at
  // that instant. One pass is exact except inside DST transition gaps, which
  // never coincide with scheduled session times here.
  const asIfUtc = Date.UTC(y, mo - 1, d, h, mi)
  return new Date(asIfUtc - zoneOffsetMs(asIfUtc))
}

/**
 * Round a Date to the nearest quarter hour (:00/:15/:30/:45), so it matches an
 * option in a 15-minute time picker. Rounds the absolute instant, which lands
 * on the same quarter-hour marks in any real timezone (all offsets are 15-min
 * multiples), so the zoned wall time reads :00/:15/:30/:45 too.
 */
export function roundToQuarterHour(date: Date) {
  const d = new Date(date)
  d.setSeconds(0, 0)
  d.setMinutes(Math.round(d.getMinutes() / 15) * 15) // setMinutes(60) rolls over
  return d
}

/** App-timezone date as "YYYY-MM-DD" for an <input type="date">. */
export function toDateValue(date: Date) {
  const p = zonedParts(date)
  return `${p.year}-${p.month}-${p.day}`
}

/** App-timezone time as "HH:mm" (24h) for a time <Select> value. */
export function toTimeValue(date: Date) {
  const p = zonedParts(date)
  return `${p.hour}:${p.minute}`
}

/**
 * 15-minute time options for a time <Select>, e.g. { value: "09:30", label:
 * "9:30 AM" }. Covers a full day, 12:00 AM through 11:45 PM.
 */
export function quarterHourOptions() {
  const opts: { value: string; label: string }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const period = h < 12 ? "AM" : "PM"
      const hour12 = h % 12 === 0 ? 12 : h % 12
      opts.push({
        value: `${pad(h)}:${pad(m)}`,
        label: `${hour12}:${pad(m)} ${period}`,
      })
    }
  }
  return opts
}

/**
 * Combine a date ("YYYY-MM-DD") and time ("HH:mm") the trainer picked — which
 * are app-timezone wall-clock values — into a UTC ISO instant for storage.
 */
export function dateAndTimeToISO(date: string, time: string) {
  return zonedWallTimeToUtc(date, time).toISOString()
}

/**
 * The UTC [start, end) instants of the app-timezone calendar day containing
 * `instant` (defaults to now). Use for "today" / day-range queries so the
 * window matches the gym's local day, not the server's UTC day.
 */
export function appTzDayRange(instant: Date = new Date()) {
  const p = zonedParts(instant)
  const start = zonedWallTimeToUtc(`${p.year}-${p.month}-${p.day}`, "00:00")
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

/**
 * The UTC [start, end) instants of the Mon–Sun app-timezone week containing
 * `instant` (defaults to now). Monday 00:00 local through the next Monday 00:00.
 * Use for "this week" queries so the window matches the gym's local week. (The
 * 7-day span is computed in absolute ms, so at a DST boundary the end can land
 * ±1h off local midnight — acceptable for soft week-membership filtering, as no
 * sessions sit at midnight.)
 */
export function appTzWeekRange(instant: Date = new Date()) {
  const p = zonedParts(instant)
  // Day-of-week of the local calendar day (0=Sun..6=Sat). Read it from a UTC
  // date built from the local Y-M-D so the server's own zone never interferes.
  const dow = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)).getUTCDay()
  const daysSinceMonday = (dow + 6) % 7 // Sun→6, Mon→0, ... Sat→5
  const dayStart = zonedWallTimeToUtc(`${p.year}-${p.month}-${p.day}`, "00:00")
  const start = new Date(dayStart.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000)
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
  return { start, end }
}

/** Format a workout's stored instant as a weekday + date, e.g. "Mon, Jun 15". */
export function formatWorkoutDay(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

/** Short weekday only, e.g. "Mon". */
export function formatWorkoutWeekday(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
  })
}

/** Format a workout's stored instant as date + time, e.g. "Jun 15, 2026, 9:30 AM". */
export function formatWorkoutDateTime(date: Date | string) {
  return new Date(date).toLocaleString("en-US", {
    timeZone: APP_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/** Format a workout's stored instant as a time of day, e.g. "9:30 AM". */
export function formatWorkoutTime(date: Date | string) {
  return new Date(date).toLocaleTimeString("en-US", {
    timeZone: APP_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  })
}

/** Format a workout's stored instant as e.g. "Mon, Jun 15, 9:30 AM". */
export function formatWorkoutWeekdayTime(date: Date | string) {
  return new Date(date).toLocaleString("en-US", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
