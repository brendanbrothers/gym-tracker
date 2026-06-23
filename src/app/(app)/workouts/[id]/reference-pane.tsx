"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Copy, History, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { cn, formatWorkoutDay, formatWorkoutTime } from "@/lib/utils"

import { copyWorkoutContents } from "../actions"
import type { ReferenceCandidate } from "../actions"

// Once a workout has been run this many times, nudge the trainer to change it
// up rather than copy it again.
const SWITCH_UP_THRESHOLD = 4

type Round = ReferenceCandidate["sets"][number]["exercises"][number]

function groupByOrder(exercises: Round[]) {
  const groups = new Map<number, Round[]>()
  for (const ex of exercises) {
    const list = groups.get(ex.order) ?? []
    list.push(ex)
    groups.set(ex.order, list)
  }
  return Array.from(groups.values())
}

// What the client actually did this round, falling back to the programmed
// target only when a round wasn't logged (e.g. a not-yet-completed session).
function roundValue(r: Round) {
  const reps = r.actualReps ?? r.targetReps
  const weight = r.actualWeight ?? r.targetWeight
  const duration = r.actualDuration ?? r.targetDuration
  if (reps != null && weight != null) return `${weight}×${reps}`
  if (reps != null) return `${reps} reps`
  if (duration != null) return `${duration}s`
  if (weight != null) return `${weight} lbs`
  return null
}

// Per-round performance, e.g. "35×10, 40×10, 45×8" (weight×reps).
function performedSummary(rounds: Round[]) {
  return rounds
    .map(roundValue)
    .filter((v): v is string => v != null)
    .join(", ")
}

export function ReferencePane({
  candidates,
  currentSessionId,
  clientName,
  targetIsEmpty,
  className,
}: {
  candidates: ReferenceCandidate[]
  currentSessionId: string
  clientName: string
  targetIsEmpty: boolean
  className?: string
}) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [copying, setCopying] = useState(false)

  if (candidates.length === 0) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <History className="mx-auto mb-2 h-5 w-5" />
            No previous workouts for {clientName} yet. Build this one from
            scratch on the right.
          </CardContent>
        </Card>
      </div>
    )
  }

  const current = candidates[Math.min(index, candidates.length - 1)]
  const exerciseCount = current.sets.reduce(
    (n, s) => n + groupByOrder(s.exercises).length,
    0
  )
  const isStale = current.nextRunN >= SWITCH_UP_THRESHOLD

  async function handleCopy() {
    setCopying(true)
    const result = await copyWorkoutContents(current.id, currentSessionId)
    setCopying(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success("Copied workout — edit it on the right.")
    router.refresh()
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            Reference workout
          </div>

          {/* Pager: ◀ older — date / time · count · status — newer ▶.
              Candidates are newest-first, so "older" steps the index up. */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Older workout"
              disabled={index >= candidates.length - 1}
              onClick={() =>
                setIndex((i) => Math.min(candidates.length - 1, i + 1))
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center">
              <p className="font-medium leading-tight">
                {formatWorkoutDay(current.date)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatWorkoutTime(current.date)} · {exerciseCount}{" "}
                {exerciseCount === 1 ? "exercise" : "exercises"}
              </p>
              <div className="mt-1">
                <StatusBadge status={current.status} />
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Newer workout"
              disabled={index <= 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* "Nth time doing this workout" nudge. */}
          <div
            className={cn(
              "flex items-start gap-2 rounded-md px-3 py-2 text-xs",
              isStale
                ? "bg-amber-100 text-amber-800"
                : "bg-muted/50 text-muted-foreground"
            )}
          >
            <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Copying this = {clientName}&apos;s{" "}
              <span className="font-medium">{ordinal(current.nextRunN)} run</span>{" "}
              of this workout
              {current.firstRunDate &&
                ` (first ${formatWorkoutDay(current.firstRunDate)})`}
              {isStale && " — time to switch it up?"}
            </span>
          </div>

          <Button
            className="w-full"
            onClick={handleCopy}
            disabled={!targetIsEmpty || copying}
            title={
              targetIsEmpty
                ? undefined
                : "Clear this workout's circuits to copy"
            }
          >
            <Copy className="mr-2 h-4 w-4" />
            {copying ? "Copying..." : "Copy this whole workout"}
          </Button>
          {!targetIsEmpty && (
            <p className="text-center text-xs text-muted-foreground">
              Clear this workout&apos;s circuits to copy.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Read-only detail of the selected reference workout. */}
      <Card>
        <CardContent className="space-y-4 p-4">
          {current.sets.map((set) => (
            <div key={set.id} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Circuit {set.order}
              </p>
              {groupByOrder(set.exercises).map((rounds) => (
                <div key={rounds[0].id} className="text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span>{rounds[0].exercise.name}</span>
                    <span className="text-right text-xs text-muted-foreground">
                      {performedSummary(rounds)}
                    </span>
                  </div>
                  {rounds[0].modifier && (
                    <p className="text-xs text-muted-foreground">
                      {rounds[0].modifier}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}
