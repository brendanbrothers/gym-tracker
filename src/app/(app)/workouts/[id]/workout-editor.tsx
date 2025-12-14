"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  addSet,
  deleteSet,
  addExerciseToSet,
  updateExercise,
  deleteExercise,
  completeWorkout,
} from "./actions"

type Exercise = {
  id: string
  name: string
  category: string | null
  primaryMuscle: string | null
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
  exercise: Exercise
}

type WorkoutSet = {
  id: string
  order: number
  exercises: SetExercise[]
}

type Workout = {
  id: string
  date: Date
  status: string
  client: { name: string }
  trainer: { name: string } | null
  sets: WorkoutSet[]
}

export function WorkoutEditor({
  workout,
  exercises,
}: {
  workout: Workout
  exercises: Exercise[]
}) {
  const router = useRouter()
  const isCompleted = workout.status === "COMPLETED"

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">
            Workout - {workout.date.toLocaleDateString()}
          </h1>
          <p className="text-muted-foreground">
            Client: {workout.client.name}
            {workout.trainer && ` • Trainer: ${workout.trainer.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          {!isCompleted && (
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
        </div>
      </div>

      {workout.sets.map((set) => (
        <SetCard
          key={set.id}
          set={set}
          workoutId={workout.id}
          exercises={exercises}
          disabled={isCompleted}
        />
      ))}

      {!isCompleted && (
        <Button
          variant="outline"
          onClick={() => addSet(workout.id)}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Set
        </Button>
      )}
    </div>
  )
}

function SetCard({
  set,
  workoutId,
  exercises,
  disabled,
}: {
  set: WorkoutSet
  workoutId: string
  exercises: Exercise[]
  disabled: boolean
}) {
  // Group exercises by order (same exercise across rounds)
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
        <CardTitle className="text-lg">Set {set.order}</CardTitle>
        {!disabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteSet(set.id, workoutId)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedExercises).map(([order, rounds]) => (
          <ExerciseGroup
            key={order}
            rounds={rounds}
            workoutId={workoutId}
            disabled={disabled}
          />
        ))}
        {!disabled && (
          <AddExerciseDialog
            setId={set.id}
            workoutId={workoutId}
            exercises={exercises}
          />
        )}
      </CardContent>
    </Card>
  )
}

function ExerciseGroup({
  rounds,
  workoutId,
  disabled,
}: {
  rounds: SetExercise[]
  workoutId: string
  disabled: boolean
}) {
  const first = rounds[0]

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">{first.exercise.name}</p>
          {first.modifier && (
            <p className="text-sm text-muted-foreground">{first.modifier}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Target: {first.targetReps && `${first.targetReps} reps`}
            {first.targetWeight && ` @ ${first.targetWeight} lbs`}
            {first.targetDuration && ` ${first.targetDuration}s`}
            {rounds.length > 1 && ` × ${rounds.length} rounds`}
          </p>
        </div>
        {!disabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              rounds.forEach((r) => deleteExercise(r.id, workoutId))
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="grid gap-2">
        {rounds.map((round) => (
          <RoundRow
            key={round.id}
            round={round}
            workoutId={workoutId}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

function RoundRow({
  round,
  workoutId,
  disabled,
}: {
  round: SetExercise
  workoutId: string
  disabled: boolean
}) {
  const [actualReps, setActualReps] = useState(
    round.actualReps?.toString() || ""
  )
  const [actualWeight, setActualWeight] = useState(
    round.actualWeight?.toString() || ""
  )

  const handleUpdate = async (completed: boolean) => {
    const formData = new FormData()
    formData.set("actualReps", actualReps)
    formData.set("actualWeight", actualWeight)
    formData.set("completed", completed.toString())
    await updateExercise(round.id, workoutId, formData)
  }

  return (
    <div className="flex items-center gap-2 pl-2 border-l-2">
      <span className="text-sm text-muted-foreground w-16">
        Round {round.round}
      </span>
      {!disabled && (
        <>
          <Input
            type="number"
            placeholder="Reps"
            value={actualReps}
            onChange={(e) => setActualReps(e.target.value)}
            className="w-20"
          />
          <Input
            type="number"
            placeholder="Weight"
            value={actualWeight}
            onChange={(e) => setActualWeight(e.target.value)}
            className="w-20"
          />
          <Button
            variant={round.completed ? "default" : "outline"}
            size="sm"
            onClick={() => handleUpdate(!round.completed)}
          >
            <Check className="h-4 w-4" />
          </Button>
        </>
      )}
      {disabled && (
        <span className="text-sm">
          {round.actualReps && `${round.actualReps} reps`}
          {round.actualWeight && ` @ ${round.actualWeight} lbs`}
          {round.completed && " ✓"}
        </span>
      )}
    </div>
  )
}

function AddExerciseDialog({
  setId,
  workoutId,
  exercises,
}: {
  setId: string
  workoutId: string
  exercises: Exercise[]
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filteredExercises = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSubmit(formData: FormData) {
    await addExerciseToSet(setId, workoutId, formData)
    setOpen(false)
    setSearch("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Exercise
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Exercise</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Search Exercise</Label>
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exerciseId">Exercise</Label>
            <Select name="exerciseId" required>
              <SelectTrigger>
                <SelectValue placeholder="Select exercise" />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {filteredExercises.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              defaultValue={3}
              min={1}
              max={10}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="targetReps">Target Reps</Label>
              <Input id="targetReps" name="targetReps" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetWeight">Weight (lbs)</Label>
              <Input id="targetWeight" name="targetWeight" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDuration">Duration (s)</Label>
              <Input id="targetDuration" name="targetDuration" type="number" />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Add to Set
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}