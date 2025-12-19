"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Trash2, Check } from "lucide-react"

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
  completeWorkout,
  updateAllRoundsTargets,
  deleteWorkout,
  createExercise,
  addRound,
  updateWorkoutDetails,
} from "./actions"

import {
    EXERCISE_CATEGORIES,
    PRIMARY_MUSCLES,
    EQUIPMENT,
  } from "@/lib/constants"

type Exercise = {
  id: string
  name: string
  category: string | null
  primaryMuscle: string | null
}

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

type Workout = {
  id: string
  date: Date
  status: string
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
}: {
  workout: Workout
  exercises: Exercise[]
  trainers: Trainer[]
  isTrainer?: boolean
  isOwner?: boolean
}) {
  const router = useRouter()
  const isCompleted = workout.status === "COMPLETED"
  const [editOpen, setEditOpen] = useState(false)

  // Permission flags
  const canEdit = isTrainer // Can modify workout structure
  const canLog = isTrainer || isOwner // Can log results

  async function handleEditSubmit(formData: FormData) {
    await updateWorkoutDetails(workout.id, formData)
    setEditOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 bg-background pb-4 -mx-6 px-6 -mt-6 pt-6 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">
              {workout.client.name} - {new Date(workout.date).toLocaleDateString("en-US")}
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
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        defaultValue={new Date(workout.date).toISOString().split("T")[0]}
                        required
                      />
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
                      This will permanently delete this workout and all its sets and exercises. This action cannot be undone.
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
          {!isCompleted && canLog && (
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
      </div>

      {workout.sets.map((set) => (
        <SetCard
          key={set.id}
          set={set}
          workoutId={workout.id}
          exercises={exercises}
          disabled={isCompleted}
          canEdit={canEdit}
          canLog={canLog}
        />
      ))}

      {!isCompleted && canEdit && (
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
  canEdit,
  canLog,
}: {
  set: WorkoutSet
  workoutId: string
  exercises: Exercise[]
  disabled: boolean
  canEdit: boolean
  canLog: boolean
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
        <CardTitle className="text-lg">Set {set.order}</CardTitle>
        {!disabled && canEdit && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Set {set.order}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all exercises in this set. This action cannot be undone.
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
            disabled={disabled}
            canEdit={canEdit}
            canLog={canLog}
          />
        ))}
        {!disabled && canEdit && (
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
  canEdit,
  canLog,
}: {
  rounds: SetExercise[]
  workoutId: string
  disabled: boolean
  canEdit: boolean
  canLog: boolean
}) {
  const first = rounds[0]
  const [editOpen, setEditOpen] = useState(false)

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
        {!disabled && canEdit && (
          <div className="flex gap-1">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit {first.exercise.name}</DialogTitle>
                </DialogHeader>
                <form action={handleEditSubmit} className="space-y-4">
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
                      <Label htmlFor="targetReps">Target Reps</Label>
                      <Input
                        id="targetReps"
                        name="targetReps"
                        type="number"
                        min={0}
                        defaultValue={first.targetReps || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetWeight">Weight (lbs)</Label>
                      <Input
                        id="targetWeight"
                        name="targetWeight"
                        type="number"
                        min={0}
                        step="any"
                        defaultValue={first.targetWeight || ""}
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
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
          </div>
        )}
      </div>
      <div className="grid gap-2">
        {rounds.map((round) => (
          <RoundRow
            key={round.id}
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

function RoundRow({
  round,
  workoutId,
  disabled,
  canEdit,
  canLog,
}: {
  round: SetExercise
  workoutId: string
  disabled: boolean
  canEdit: boolean
  canLog: boolean
}) {
  // Default to target values if no actual values have been entered yet
  const [actualReps, setActualReps] = useState(
    round.actualReps?.toString() || round.targetReps?.toString() || ""
  )
  const [actualWeight, setActualWeight] = useState(
    round.actualWeight?.toString() || round.targetWeight?.toString() || ""
  )
  const [notes, setNotes] = useState(round.notes || "")

  const handleUpdate = async (completed: boolean) => {
    const formData = new FormData()
    formData.set("actualReps", actualReps)
    formData.set("actualWeight", actualWeight)
    formData.set("notes", notes)
    formData.set("completed", completed.toString())
    await updateExercise(round.id, workoutId, formData)
  }

  return (
    <div className="flex items-center gap-2 pl-2 border-l-2">
      <span className="text-sm text-muted-foreground w-16">
        Round {round.round}
      </span>
      {!disabled && canLog && (
        <>
          <Input
            type="number"
            min={0}
            placeholder="Reps"
            value={actualReps}
            onChange={(e) => setActualReps(e.target.value)}
            className="w-20"
          />
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
          >
            <Check className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteExercise(round.id, workoutId)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
      {(disabled || !canLog) && (
        <span className="text-sm">
          {round.actualReps && `${round.actualReps} reps`}
          {round.actualWeight && ` @ ${round.actualWeight} lbs`}
          {round.notes && ` - ${round.notes}`}
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
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
    const [showResults, setShowResults] = useState(false)
    const [showNewExerciseForm, setShowNewExerciseForm] = useState(false)
  
    const filteredExercises = exercises.filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase())
    )
  
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
                  <Input id="targetReps" name="targetReps" type="number" min={0} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetWeight">Weight (lbs)</Label>
                  <Input id="targetWeight" name="targetWeight" type="number" min={0} step="any" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetDuration">Duration (s)</Label>
                  <Input id="targetDuration" name="targetDuration" type="number" min={0} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={!selectedExercise}>
                Add to Set
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    )
  }