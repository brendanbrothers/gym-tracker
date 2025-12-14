"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { createWorkout, getRecentWorkoutsForClient } from "./actions"

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

export function NewWorkoutForm({
  clients,
  trainers,
}: {
  clients: User[]
  trainers: User[]
}) {
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
        <Button>New Workout</Button>
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