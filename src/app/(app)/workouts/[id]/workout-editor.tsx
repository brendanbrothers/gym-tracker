"use client"

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Pencil, Plus, Trash2, Check, CheckCheck, Trophy, RotateCcw, Play, Ban, User, AlertTriangle, History, X } from "lucide-react"
import { toast } from "sonner"

import type { PbHit, PbMetric, PersonalBests } from "@/lib/personal-bests"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import {
  addSet,
  deleteSet,
  addExerciseToSet,
  updateExercise,
  deleteExercise,
  startWorkout,
  cancelWorkout,
  restoreWorkout,
  completeWorkout,
  reopenWorkout,
  updateAllRoundsTargets,
  deleteWorkout,
  createExercise,
  addRound,
  updateWorkoutDetails,
  updateWorkoutNotes,
  getClientPersonalBests,
} from "./actions"

import {
    EXERCISE_CATEGORIES,
    PRIMARY_MUSCLES,
    EQUIPMENT,
  } from "@/lib/constants"
import {
  dateAndTimeToISO,
  formatWorkoutDateTime,
  formatWorkoutDay,
  quarterHourOptions,
  roundToQuarterHour,
  toDateValue,
  toTimeValue,
} from "@/lib/utils"
import { getExerciseSetHistory } from "../../progress/actions"

const TIME_OPTIONS = quarterHourOptions()

// Client-side PB presentation. The label/format logic is duplicated here rather
// than imported from @/lib/personal-bests, which pulls in Prisma (server-only).
const PB_LABELS: Record<PbMetric, string> = {
  est1RM: "Est. 1RM",
  maxWeight: "Heaviest weight",
  bestVolume: "Best volume",
  maxRepsUnbroken: "Most reps",
  maxDuration: "Longest hold",
  totalRepsTarget: "Most total reps",
}

function formatPbValue(metric: PbMetric, value: number): string {
  switch (metric) {
    case "maxRepsUnbroken":
    case "totalRepsTarget":
      return `${value} reps`
    case "maxDuration":
      return `${value}s`
    case "bestVolume":
      return `${Math.round(value)} lbs vol`
    case "est1RM":
    case "maxWeight":
    default:
      return `${Math.round(value * 10) / 10} lbs`
  }
}

function pbHitText(hit: PbHit): string {
  const label = `${PB_LABELS[hit.metric]}: ${formatPbValue(hit.metric, hit.newValue)}`
  if (hit.previousValue === null) return `${label} (first time!)`
  const delta = Math.round((hit.delta ?? 0) * 10) / 10
  return `${label} (+${delta} from ${formatPbValue(hit.metric, hit.previousValue)})`
}

// Shows a trainer the client's current PBs for the selected exercise while they
// program targets, and flags when the entered target would be a new best.
function PersonalBestHint({
  clientId,
  exerciseId,
  enabled,
  liveReps,
  liveWeight,
  hideWhenEmpty = false,
}: {
  clientId: string
  exerciseId: string | null
  enabled: boolean
  liveReps?: number | null
  liveWeight?: number | null
  hideWhenEmpty?: boolean
}) {
  const [pbs, setPbs] = useState<PersonalBests | null>(null)

  useEffect(() => {
    if (!enabled || !exerciseId) return
    let active = true
    getClientPersonalBests(clientId, exerciseId).then((p) => {
      if (active) setPbs(p)
    })
    // Clear on disable / exercise change so a stale PB never lingers.
    return () => {
      active = false
      setPbs(null)
    }
  }, [enabled, exerciseId, clientId])

  if (!exerciseId || !pbs) return null

  const parts: string[] = []
  if (pbs.maxWeight) parts.push(`${pbs.maxWeight.value} lbs`)
  if (pbs.maxRepsUnbroken) parts.push(`${pbs.maxRepsUnbroken.value} reps`)
  if (pbs.est1RM) parts.push(`est. 1RM ${Math.round(pbs.est1RM.value)}`)
  if (pbs.maxDuration) parts.push(`${pbs.maxDuration.value}s`)

  const isPbAttempt =
    (liveReps != null &&
      pbs.maxRepsUnbroken != null &&
      liveReps > pbs.maxRepsUnbroken.value) ||
    (liveWeight != null &&
      pbs.maxWeight != null &&
      liveWeight > pbs.maxWeight.value)

  if (parts.length === 0) {
    if (hideWhenEmpty) return null
    return (
      <p className="text-xs text-muted-foreground">
        No personal bests yet for this client — anything counts as a first!
      </p>
    )
  }

  return (
    <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Current PB:</span>{" "}
      {parts.join(" · ")}
      {isPbAttempt && (
        <span className="ml-2 font-medium text-amber-600">🔥 PB attempt</span>
      )}
    </div>
  )
}

type HistoryRow = Awaited<
  ReturnType<typeof getExerciseSetHistory>
>["rows"][number]

function formatRound(r: HistoryRow): string {
  if (r.actualReps != null && r.actualWeight != null)
    return `${r.actualWeight}×${r.actualReps}`
  if (r.actualReps != null) return `${r.actualReps} reps`
  if (r.actualDuration != null) return `${r.actualDuration}s`
  if (r.actualWeight != null) return `${r.actualWeight} lbs`
  return "—"
}

// A click-to-open popover showing the client's recent completed performances of
// this exercise (last ~6 sessions). Fetches lazily on first open — same pattern
// as PersonalBestHint — and caches the result.
function ExerciseHistoryFlyout({
  clientId,
  exerciseId,
  exerciseName,
}: {
  clientId: string
  exerciseId: string
  exerciseName: string
}) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<HistoryRow[] | null>(null)

  useEffect(() => {
    if (!open || rows !== null) return
    let active = true
    getExerciseSetHistory(exerciseId, clientId).then((res) => {
      if (active) setRows(res.rows)
    })
    return () => {
      active = false
    }
  }, [open, exerciseId, clientId, rows])

  // Derived: we're fetching while the popover is open but rows haven't arrived.
  const loading = open && rows === null

  // Rows come back newest-first; group into sessions by date and keep the most
  // recent six. (Map preserves the newest-first insertion order.)
  const sessions = useMemo(() => {
    if (!rows) return []
    const byDate = new Map<string, HistoryRow[]>()
    for (const r of rows) {
      const list = byDate.get(r.date) ?? []
      list.push(r)
      byDate.set(r.date, list)
    }
    return Array.from(byDate.entries())
      .slice(0, 6)
      .map(([date, rs]) => ({
        date,
        rounds: [...rs].sort((a, b) => a.order - b.order || a.round - b.round),
      }))
  }, [rows])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground"
          title={`History for ${exerciseName}`}
        >
          <History className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">History — {exerciseName}</p>
          <PopoverClose asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 shrink-0 p-0"
              aria-label="Close history"
            >
              <X className="h-4 w-4" />
            </Button>
          </PopoverClose>
        </div>
        {loading && (
          <p className="text-xs text-muted-foreground">Loading…</p>
        )}
        {!loading && sessions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No completed history yet for this client.
          </p>
        )}
        {!loading && sessions.length > 0 && (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {sessions.map((s) => (
              <div key={s.date} className="text-xs">
                <p className="font-medium text-muted-foreground">
                  {formatWorkoutDay(`${s.date}T12:00:00Z`)}
                </p>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  {s.rounds.map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-0.5">
                      {formatRound(r)}
                      {r.pbMetrics.length > 0 && (
                        <Trophy className="h-3 w-3 text-amber-600" />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

type Exercise = {
  id: string
  name: string
  category: string | null
  primaryMuscle: string | null
}

// A client's other uses of an exercise earlier in the same Mon–Sun week, keyed
// by exerciseId — drives the soft "already done this week" warning.
export type WeekRepeat = { day: string; modifier: string | null }
export type ExercisesDoneThisWeek = Record<string, WeekRepeat[]>

type Trainer = {
  id: string
  name: string
}

type SetExercise = {
  id: string
  order: number
  round: number
  modifier: string | null
  targetReps: number | null
  targetWeight: number | null
  targetDuration: number | null
  actualReps: number | null
  actualWeight: number | null
  actualDuration: number | null
  completed: boolean
  notes: string | null
  workoutSetId: string
  exercise: Exercise
}

type WorkoutSet = {
  id: string
  order: number
  exercises: SetExercise[]
}

// Imperative handle a RoundRow exposes so the exercise-level "complete all"
// button can run each round's own save — sending that row's current inputs and
// firing its PB toast/trophy, exactly as clicking its check would.
type RoundHandle = {
  complete: (completed: boolean) => Promise<void>
}

type Workout = {
  id: string
  date: Date
  status: string
  notes: string | null
  clientId: string
  client: { name: string }
  trainer: { id: string; name: string } | null
  trainerId: string | null
  sets: WorkoutSet[]
}

export function WorkoutEditor({
  workout,
  exercises,
  trainers,
  isTrainer = false,
  isOwner = false,
  exercisesDoneThisWeek = {},
}: {
  workout: Workout
  exercises: Exercise[]
  trainers: Trainer[]
  isTrainer?: boolean
  isOwner?: boolean
  exercisesDoneThisWeek?: ExercisesDoneThisWeek
}) {
  const router = useRouter()
  const isScheduled = workout.status === "SCHEDULED"
  const isInProgress = workout.status === "IN_PROGRESS"
  const isCompleted = workout.status === "COMPLETED"
  const isCancelled = workout.status === "CANCELLED"
  // Completed and cancelled sessions are read-only (no logging or editing).
  const isLocked = isCompleted || isCancelled
  const [editOpen, setEditOpen] = useState(false)

  // Permission flags
  const canEdit = isTrainer // Can modify workout structure
  const canLog = isTrainer || isOwner // Can log results

  async function handleEditSubmit(formData: FormData) {
    // Combine date + time into a UTC instant before sending.
    const localDate = formData.get("date") as string
    const localTime = (formData.get("time") as string) || "12:00"
    if (localDate) {
      formData.set("date", dateAndTimeToISO(localDate, localTime))
    }
    await updateWorkoutDetails(workout.id, formData)
    setEditOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 bg-background pb-4 -mx-6 px-6 -mt-6 pt-6 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span>
                {workout.client.name} -{" "}
                {formatWorkoutDateTime(workout.date)}
              </span>
              <Link
                href={`/clients/${workout.clientId}`}
                className="text-muted-foreground hover:text-foreground"
                title={`View ${workout.client.name}`}
              >
                <User className="h-5 w-5" />
              </Link>
            </h1>
            <p className="text-muted-foreground">
              {workout.trainer && `Trainer: ${workout.trainer.name}`}
            </p>
          </div>
          <div className="flex gap-2">
          {canEdit && (
            <>
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Workout Details</DialogTitle>
                  </DialogHeader>
                  <form action={handleEditSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          name="date"
                          type="date"
                          defaultValue={toDateValue(new Date(workout.date))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time">Time</Label>
                        <Select
                          name="time"
                          defaultValue={toTimeValue(
                            roundToQuarterHour(new Date(workout.date))
                          )}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="max-h-60">
                            {TIME_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trainerId">Trainer</Label>
                      <Select name="trainerId" defaultValue={workout.trainerId || "none"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trainer (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No trainer</SelectItem>
                          {trainers.map((trainer) => (
                            <SelectItem key={trainer.id} value={trainer.id}>
                              {trainer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">
                      Save Changes
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this workout?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this workout and all its circuits and exercises. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await deleteWorkout(workout.id)
                        router.push("/workouts")
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {isScheduled && canLog && (
            <>
              <Button
                variant="default"
                onClick={async () => {
                  await startWorkout(workout.id)
                  router.refresh()
                }}
              >
                <Play className="mr-2 h-4 w-4" />
                Start Workout
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <Ban className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this workout?</AlertDialogTitle>
                    <AlertDialogDescription>
                      It will be marked cancelled and moved out of the active
                      list. You can restore it to scheduled later if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await cancelWorkout(workout.id)
                        router.refresh()
                      }}
                    >
                      Cancel Workout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {isInProgress && canLog && (
            <Button
              variant="default"
              onClick={async () => {
                await completeWorkout(workout.id)
                router.push("/workouts")
              }}
            >
              <Check className="mr-2 h-4 w-4" />
              Complete Workout
            </Button>
          )}
          {isCompleted && (
            <span className="px-3 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
              Completed
            </span>
          )}
          {isCompleted && canLog && (
            <Button
              variant="outline"
              onClick={async () => {
                await reopenWorkout(workout.id)
                router.refresh()
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reopen Workout
            </Button>
          )}
          {isCancelled && (
            <span className="px-3 py-2 bg-gray-200 text-gray-600 rounded-md text-sm font-medium">
              Cancelled
            </span>
          )}
          {isCancelled && canLog && (
            <Button
              variant="outline"
              onClick={async () => {
                await restoreWorkout(workout.id)
                router.refresh()
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reschedule
            </Button>
          )}
        </div>
        </div>
      </div>

      {workout.sets.map((set) => (
        <SetCard
          key={set.id}
          set={set}
          workoutId={workout.id}
          clientId={workout.clientId}
          exercises={exercises}
          disabled={isLocked}
          canEdit={canEdit}
          canLog={canLog}
          exercisesDoneThisWeek={exercisesDoneThisWeek}
        />
      ))}

      {!isLocked && canEdit && (
        <Button
          variant="outline"
          onClick={() => addSet(workout.id)}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Circuit
        </Button>
      )}

      <WorkoutNotes
        workoutId={workout.id}
        notes={workout.notes}
        canEdit={canEdit && !isLocked}
      />
    </div>
  )
}

// General trainer notes about the whole session. Editable while the workout is
// live (trainer + not locked); shown read-only — only when present — once the
// session is completed/cancelled or viewed by a client.
function WorkoutNotes({
  workoutId,
  notes,
  canEdit,
}: {
  workoutId: string
  notes: string | null
  canEdit: boolean
}) {
  const [value, setValue] = useState(notes ?? "")
  const [saving, setSaving] = useState(false)
  const dirty = value !== (notes ?? "")

  async function handleSave() {
    setSaving(true)
    try {
      await updateWorkoutNotes(workoutId, value)
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) {
    if (!notes) return null
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">Notes</p>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {notes}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="workout-notes">Notes</Label>
      <Textarea
        id="workout-notes"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="General notes about this workout…"
        className="min-h-24"
      />
      {dirty && (
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Notes"}
        </Button>
      )}
    </div>
  )
}

function SetCard({
  set,
  workoutId,
  clientId,
  exercises,
  disabled,
  canEdit,
  canLog,
  exercisesDoneThisWeek,
}: {
  set: WorkoutSet
  workoutId: string
  clientId: string
  exercises: Exercise[]
  disabled: boolean
  canEdit: boolean
  canLog: boolean
  exercisesDoneThisWeek: ExercisesDoneThisWeek
}) {
  const groupedExercises = set.exercises.reduce((acc, ex) => {
    const key = ex.order
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(ex)
    return acc
  }, {} as Record<number, SetExercise[]>)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Circuit {set.order}</CardTitle>
        {!disabled && canEdit && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" title="Delete Circuit">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Circuit {set.order}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all exercises in this circuit. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteSet(set.id, workoutId)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedExercises).map(([order, rounds]) => (
          <ExerciseGroup
            key={order}
            rounds={rounds}
            workoutId={workoutId}
            clientId={clientId}
            disabled={disabled}
            canEdit={canEdit}
            canLog={canLog}
            exercisesDoneThisWeek={exercisesDoneThisWeek}
          />
        ))}
        {!disabled && canEdit && (
          <AddExerciseDialog
            setId={set.id}
            workoutId={workoutId}
            clientId={clientId}
            exercises={exercises}
            exercisesDoneThisWeek={exercisesDoneThisWeek}
          />
        )}
      </CardContent>
    </Card>
  )
}

function ExerciseGroup({
  rounds,
  workoutId,
  clientId,
  disabled,
  canEdit,
  canLog,
  exercisesDoneThisWeek,
}: {
  rounds: SetExercise[]
  workoutId: string
  clientId: string
  disabled: boolean
  canEdit: boolean
  canLog: boolean
  exercisesDoneThisWeek: ExercisesDoneThisWeek
}) {
  const first = rounds[0]
  // Flag when this same exercise is already programmed elsewhere in the client's
  // Mon–Sun week (whether it was copied in or added by hand). Soft, informational.
  const weekRepeats = exercisesDoneThisWeek[first.exercise.id]
  const repeatDays = weekRepeats?.length
    ? Array.from(new Set(weekRepeats.map((r) => r.day))).join("/")
    : null
  const [editOpen, setEditOpen] = useState(false)
  const [liveReps, setLiveReps] = useState<number | null>(first.targetReps)
  const [liveWeight, setLiveWeight] = useState<number | null>(first.targetWeight)
  const [completingAll, setCompletingAll] = useState(false)
  const roundHandles = useRef(new Map<string, RoundHandle>())
  const allCompleted = rounds.every((r) => r.completed)

  async function handleCompleteAll() {
    const completed = !allCompleted
    setCompletingAll(true)
    try {
      // Drive each round's own save in order — same effect as clicking every
      // check one by one (saves typed values, fires per-round PB toast/trophy).
      for (const r of rounds) {
        await roundHandles.current.get(r.id)?.complete(completed)
      }
    } finally {
      setCompletingAll(false)
    }
  }

  async function handleEditSubmit(formData: FormData) {
    await updateAllRoundsTargets(
      first.workoutSetId,
      first.exercise.id,
      first.order,
      workoutId,
      formData
    )
    setEditOpen(false)
  }

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-1">
            <p className="font-medium">{first.exercise.name}</p>
            <ExerciseHistoryFlyout
              clientId={clientId}
              exerciseId={first.exercise.id}
              exerciseName={first.exercise.name}
            />
          </div>
          {repeatDays && (
            <span className="my-0.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              <AlertTriangle className="h-3 w-3" />
              Also done {repeatDays} this week
            </span>
          )}
          {first.modifier && (
            <p className="text-sm text-muted-foreground">{first.modifier}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Target: {first.targetWeight && `${first.targetWeight} lbs`}
            {first.targetReps && ` @ ${first.targetReps} reps`}
            {first.targetDuration && ` ${first.targetDuration}s`}
            {rounds.length > 1 && ` × ${rounds.length} rounds`}
          </p>
        </div>
        {!disabled && (canLog || canEdit) && (
          <div className="flex gap-1">
            {canEdit && (
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit {first.exercise.name}</DialogTitle>
                </DialogHeader>
                <form action={handleEditSubmit} className="space-y-4">
                  <PersonalBestHint
                    clientId={clientId}
                    exerciseId={first.exercise.id}
                    enabled={editOpen}
                    liveReps={liveReps}
                    liveWeight={liveWeight}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="modifier">Modifier</Label>
                    <Input
                      id="modifier"
                      name="modifier"
                      defaultValue={first.modifier || ""}
                      placeholder="e.g., start at 10, slow tempo"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="targetWeight">Weight (lbs)</Label>
                      <Input
                        id="targetWeight"
                        name="targetWeight"
                        type="number"
                        min={0}
                        step="any"
                        defaultValue={first.targetWeight || ""}
                        onChange={(e) =>
                          setLiveWeight(
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetReps">Target Reps</Label>
                      <Input
                        id="targetReps"
                        name="targetReps"
                        type="number"
                        min={0}
                        defaultValue={first.targetReps || ""}
                        onChange={(e) =>
                          setLiveReps(
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetDuration">Duration (s)</Label>
                      <Input
                        id="targetDuration"
                        name="targetDuration"
                        type="number"
                        min={0}
                        defaultValue={first.targetDuration || ""}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Update All Rounds
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            )}
            {canLog && (
              <Button
                variant={allCompleted ? "default" : "outline"}
                size="sm"
                onClick={handleCompleteAll}
                disabled={completingAll}
                title={
                  allCompleted
                    ? "Mark all rounds incomplete"
                    : "Complete all rounds"
                }
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            {canEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" title="Delete Exercise">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {first.exercise.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all {rounds.length} round{rounds.length > 1 ? "s" : ""} of this exercise. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      rounds.forEach((r) => deleteExercise(r.id, workoutId))
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            )}
          </div>
        )}
      </div>
      {canLog && (
        <PersonalBestHint
          clientId={clientId}
          exerciseId={first.exercise.id}
          enabled
          hideWhenEmpty
        />
      )}
      <div className="grid gap-2">
        {rounds.map((round) => (
          // Include targets in the key so the row remounts and re-seeds its
          // inputs when "Update All Rounds" changes the targets. RoundRow seeds
          // its actual reps/weight from the target on mount, so a stable key
          // would keep showing the stale target after a target update.
          <RoundRow
            key={`${round.id}:${round.targetReps}:${round.targetWeight}:${round.targetDuration}`}
            ref={(handle) => {
              if (handle) roundHandles.current.set(round.id, handle)
              else roundHandles.current.delete(round.id)
            }}
            round={round}
            workoutId={workoutId}
            disabled={disabled}
            canEdit={canEdit}
            canLog={canLog}
          />
        ))}
        {!disabled && canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              addRound(first.workoutSetId, first.exercise.id, first.order, workoutId)
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Round
          </Button>
        )}
      </div>
    </div>
  )
}

const RoundRow = forwardRef<
  RoundHandle,
  {
    round: SetExercise
    workoutId: string
    disabled: boolean
    canEdit: boolean
    canLog: boolean
  }
>(function RoundRow({ round, workoutId, disabled, canEdit, canLog }, ref) {
  // Default to target values if no actual values have been entered yet
  const [actualReps, setActualReps] = useState(
    round.actualReps?.toString() || round.targetReps?.toString() || ""
  )
  const [actualWeight, setActualWeight] = useState(
    round.actualWeight?.toString() || round.targetWeight?.toString() || ""
  )
  const [notes, setNotes] = useState(round.notes || "")
  const [pbHits, setPbHits] = useState<PbHit[]>([])

  const handleUpdate = useCallback(
    async (completed: boolean) => {
      const formData = new FormData()
      formData.set("actualReps", actualReps)
      formData.set("actualWeight", actualWeight)
      formData.set("notes", notes)
      formData.set("completed", completed.toString())
      const result = await updateExercise(round.id, workoutId, formData)

      const hits: PbHit[] =
        result && "pbs" in result ? result.pbs ?? [] : []
      if (completed && hits.length > 0) {
        setPbHits(hits)
        toast.success(`New personal best — ${round.exercise.name}! 🎉`, {
          description: hits.map(pbHitText).join(" · "),
        })
      } else if (!completed) {
        setPbHits([])
      }
    },
    [actualReps, actualWeight, notes, round.id, round.exercise.name, workoutId]
  )

  // Let the parent ExerciseGroup trigger this row's save for "complete all".
  useImperativeHandle(ref, () => ({ complete: handleUpdate }), [handleUpdate])

  return (
    <div className="flex items-center gap-2 pl-2 border-l-2">
      <span className="text-sm text-muted-foreground w-16">
        Round {round.round}
      </span>
      {pbHits.length > 0 && (
        <span
          title={pbHits.map(pbHitText).join("\n")}
          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 animate-in zoom-in-95"
        >
          <Trophy className="h-3 w-3" />
          PB
        </span>
      )}
      {!disabled && canLog && (
        <>
          <Input
            type="number"
            min={0}
            step="any"
            placeholder="Weight"
            value={actualWeight}
            onChange={(e) => setActualWeight(e.target.value)}
            className="w-20"
          />
          <Input
            type="number"
            min={0}
            placeholder="Reps"
            value={actualReps}
            onChange={(e) => setActualReps(e.target.value)}
            className="w-20"
          />
          <Input
            type="text"
            placeholder="Note"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex-1 min-w-24"
          />
          <Button
            variant={round.completed ? "default" : "outline"}
            size="sm"
            onClick={() => handleUpdate(!round.completed)}
            title={round.completed ? "Mark Incomplete" : "Mark Complete"}
          >
            <Check className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteExercise(round.id, workoutId)}
              title="Delete Round"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
      {(disabled || !canLog) && (
        <span className="text-sm">
          {round.actualWeight && `${round.actualWeight} lbs`}
          {round.actualReps && ` @ ${round.actualReps} reps`}
          {round.notes && ` - ${round.notes}`}
          {round.completed && " ✓"}
        </span>
      )}
    </div>
  )
})

function AddExerciseDialog({
    setId,
    workoutId,
    clientId,
    exercises,
    exercisesDoneThisWeek,
  }: {
    setId: string
    workoutId: string
    clientId: string
    exercises: Exercise[]
    exercisesDoneThisWeek: ExercisesDoneThisWeek
  }) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
    const [showResults, setShowResults] = useState(false)
    const [showNewExerciseForm, setShowNewExerciseForm] = useState(false)
    const [liveReps, setLiveReps] = useState<number | null>(null)
    const [liveWeight, setLiveWeight] = useState<number | null>(null)

    const filteredExercises = exercises.filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase())
    )

    // Days this client already did a given exercise earlier this week, e.g.
    // "Mon" or "Mon/Wed", plus any modifiers noted — for the soft repeat warning.
    const repeatDays = (id: string) => {
      const repeats = exercisesDoneThisWeek[id]
      if (!repeats?.length) return null
      return Array.from(new Set(repeats.map((r) => r.day))).join("/")
    }
    const repeatModifiers = (id: string) => {
      const repeats = exercisesDoneThisWeek[id] ?? []
      return Array.from(
        new Set(repeats.map((r) => r.modifier).filter((m): m is string => !!m))
      )
    }
  
    async function handleSubmit(formData: FormData) {
      if (!selectedExercise) return
      formData.set("exerciseId", selectedExercise.id)
      await addExerciseToSet(setId, workoutId, formData)
      setOpen(false)
      setSearch("")
      setSelectedExercise(null)
    }
  
    async function handleCreateExercise(formData: FormData) {
      const result = await createExercise(formData)
      if (result.success && result.exercise) {
        setSelectedExercise(result.exercise)
        setSearch(result.exercise.name)
        setShowNewExerciseForm(false)
      }
    }
  
    function handleOpenChange(isOpen: boolean) {
      setOpen(isOpen)
      if (!isOpen) {
        setSearch("")
        setSelectedExercise(null)
        setShowResults(false)
        setShowNewExerciseForm(false)
      }
    }
  
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Exercise
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
          </DialogHeader>
  
{showNewExerciseForm ? (
  <form action={handleCreateExercise} className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="name">Exercise Name</Label>
      <Input
        id="name"
        name="name"
        required
        defaultValue={search}
        placeholder="e.g., Romanian Deadlift"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="category">Category</Label>
      <Select name="category">
        <SelectTrigger>
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          {EXERCISE_CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label htmlFor="primaryMuscle">Primary Muscle</Label>
      <Select name="primaryMuscle">
        <SelectTrigger>
          <SelectValue placeholder="Select muscle" />
        </SelectTrigger>
        <SelectContent>
          {PRIMARY_MUSCLES.map((muscle) => (
            <SelectItem key={muscle} value={muscle}>
              {muscle}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label htmlFor="equipment">Equipment</Label>
      <Select name="equipment">
        <SelectTrigger>
          <SelectValue placeholder="Select equipment" />
        </SelectTrigger>
        <SelectContent>
          {EQUIPMENT.map((equip) => (
            <SelectItem key={equip} value={equip}>
              {equip}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        className="flex-1"
        onClick={() => setShowNewExerciseForm(false)}
      >
        Cancel
      </Button>
      <Button type="submit" className="flex-1">
        Create Exercise
      </Button>
    </div>
  </form>
) : (
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Exercise</Label>
                <div className="relative">
                  <Input
                    placeholder="Type to search exercises..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setSelectedExercise(null)
                      setShowResults(true)
                    }}
                    onFocus={() => setShowResults(true)}
                  />
                  {showResults && search && !selectedExercise && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredExercises.length > 0 ? (
                        filteredExercises.slice(0, 10).map((exercise) => (
                          <button
                            key={exercise.id}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                            onClick={() => {
                              setSelectedExercise(exercise)
                              setSearch(exercise.name)
                              setShowResults(false)
                            }}
                          >
                            <span className="font-medium">{exercise.name}</span>
                            {exercise.primaryMuscle && (
                              <span className="text-muted-foreground ml-2">
                                ({exercise.primaryMuscle})
                              </span>
                            )}
                            {repeatDays(exercise.id) && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                <AlertTriangle className="h-3 w-3" />
                                Done {repeatDays(exercise.id)}
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No exercises found
                        </div>
                      )}
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-muted text-sm border-t flex items-center gap-2 text-primary"
                        onClick={() => setShowNewExerciseForm(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Create &quot;{search}&quot; as new exercise
                      </button>
                    </div>
                  )}
                </div>
                {selectedExercise && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedExercise.name}
                    {selectedExercise.primaryMuscle && ` (${selectedExercise.primaryMuscle})`}
                  </p>
                )}
                {selectedExercise && repeatDays(selectedExercise.id) && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Already done this week ({repeatDays(selectedExercise.id)}
                      {repeatModifiers(selectedExercise.id).length > 0 &&
                        `, ${repeatModifiers(selectedExercise.id).join(", ")}`}
                      ). Adding anyway is fine.
                    </span>
                  </div>
                )}
              </div>
              <PersonalBestHint
                clientId={clientId}
                exerciseId={selectedExercise?.id ?? null}
                enabled={open}
                liveReps={liveReps}
                liveWeight={liveWeight}
              />
              <div className="space-y-2">
                <Label htmlFor="modifier">Modifier (optional)</Label>
                <Input
                  id="modifier"
                  name="modifier"
                  placeholder="e.g., start at 10, slow tempo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rounds">Rounds</Label>
                <Input
                  id="rounds"
                  name="rounds"
                  type="number"
                  min={1}
                  max={10}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="targetWeight">Weight (lbs)</Label>
                  <Input
                    id="targetWeight"
                    name="targetWeight"
                    type="number"
                    min={0}
                    step="any"
                    onChange={(e) =>
                      setLiveWeight(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetReps">Target Reps</Label>
                  <Input
                    id="targetReps"
                    name="targetReps"
                    type="number"
                    min={0}
                    onChange={(e) =>
                      setLiveReps(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetDuration">Duration (s)</Label>
                  <Input id="targetDuration" name="targetDuration" type="number" min={0} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={!selectedExercise}>
                Add to Circuit
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    )
  }