"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dumbbell, Users, ClipboardList } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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
  EXERCISE_CATEGORIES,
  PRIMARY_MUSCLES,
  EQUIPMENT,
} from "@/lib/constants"

import { createWorkout, getRecentWorkoutsForClient } from "./workouts/actions"
import { createExercise } from "./exercises/actions"
import { createUser } from "./users/actions"

type User = {
  id: string
  name: string
  role: string
}

type RecentWorkout = {
  id: string
  date: Date
  sets: {
    exercises: {
      exercise: {
        name: string
      }
    }[]
  }[]
}

export function HomeActions({
  clients,
  trainers,
  isTrainer,
}: {
  clients: User[]
  trainers: User[]
  isTrainer: boolean
}) {
  return (
    <>
      <NewWorkoutCard clients={clients} trainers={trainers} />
      <NewExerciseCard />
      {isTrainer && <NewUserCard />}
    </>
  )
}

function NewWorkoutCard({ clients, trainers }: { clients: User[]; trainers: User[] }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([])
  const [loadingWorkouts, setLoadingWorkouts] = useState(false)

  useEffect(() => {
    if (!selectedClient) {
      setRecentWorkouts([])
      return
    }

    setLoadingWorkouts(true)
    getRecentWorkoutsForClient(selectedClient).then((workouts) => {
      setRecentWorkouts(workouts)
      setLoadingWorkouts(false)
    })
  }, [selectedClient])

  async function handleSubmit(formData: FormData) {
    setError("")
    setLoading(true)

    const result = await createWorkout(formData)

    setLoading(false)

    if (result?.error) {
      setError(result.error)
    }
  }

  function formatWorkoutSummary(workout: RecentWorkout) {
    const exerciseNames = new Set<string>()
    workout.sets.forEach((set) => {
      set.exercises.forEach((ex) => {
        exerciseNames.add(ex.exercise.name)
      })
    })
    const names = Array.from(exerciseNames).slice(0, 3).join(", ")
    const more = exerciseNames.size > 3 ? ` +${exerciseNames.size - 3} more` : ""
    return `${new Date(workout.date).toLocaleDateString()} - ${names}${more}`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              New Workout
            </CardTitle>
            <CardDescription>Start a new workout session</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create a workout for a client, optionally copying from a previous session.
            </p>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start New Workout</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">Client</Label>
            <Select
              name="clientId"
              required
              value={selectedClient}
              onValueChange={setSelectedClient}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trainerId">Trainer (optional)</Label>
            <Select name="trainerId">
              <SelectTrigger>
                <SelectValue placeholder="Select trainer" />
              </SelectTrigger>
              <SelectContent>
                {trainers.map((trainer) => (
                  <SelectItem key={trainer.id} value={trainer.id}>
                    {trainer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="copyFromId">Copy from previous workout (optional)</Label>
            <Select name="copyFromId" disabled={!selectedClient || loadingWorkouts}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedClient
                      ? "Select a client first"
                      : loadingWorkouts
                      ? "Loading..."
                      : "Start fresh"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Start fresh</SelectItem>
                {recentWorkouts.map((workout) => (
                  <SelectItem key={workout.id} value={workout.id}>
                    {formatWorkoutSummary(workout)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Start Workout"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NewExerciseCard() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError("")
    setLoading(true)

    const result = await createExercise(formData)

    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-6 w-6" />
              New Exercise
            </CardTitle>
            <CardDescription>Add to the exercise library</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create a custom exercise with category, muscle group, and equipment info.
            </p>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Exercise</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Exercise Name</Label>
            <Input
              id="name"
              name="name"
              required
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
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Exercise"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NewUserCard() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError("")
    setLoading(true)

    const result = await createUser(formData)

    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              New User
            </CardTitle>
            <CardDescription>Add a client or trainer</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create a new user account with role-based access.
            </p>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select name="role" required>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLIENT">Client</SelectItem>
                <SelectItem value="TRAINER">Trainer</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create User"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
