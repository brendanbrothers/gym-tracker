import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const pad = (n: number) => String(n).padStart(2, "0")

/**
 * Round a Date to the nearest quarter hour (:00/:15/:30/:45) in local time, so
 * it matches an option in a 15-minute time picker.
 */
export function roundToQuarterHour(date: Date) {
  const d = new Date(date)
  d.setSeconds(0, 0)
  d.setMinutes(Math.round(d.getMinutes() / 15) * 15) // setMinutes(60) rolls over
  return d
}

/** Local date as "YYYY-MM-DD" for an <input type="date">. */
export function toDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Local time as "HH:mm" (24h) for a time <Select> value. */
export function toTimeValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
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
 * Combine a date ("YYYY-MM-DD") and time ("HH:mm") wall-clock value into a UTC
 * ISO instant. new Date() parses the value in the viewer's local timezone,
 * which is what we want to store.
 */
export function dateAndTimeToISO(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString()
}

/** Format a workout's stored instant as local date + time for display. */
export function formatWorkoutDateTime(date: Date | string) {
  return new Date(date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
