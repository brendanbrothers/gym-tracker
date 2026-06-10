"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
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

function formatWorkoutSummary(workout: RecentWorkout) {
  const exerciseNames = new Set<string>()
  workout.sets.forEach((set) => {
    set.exercises.forEach((ex) => {
      exerciseNames.add(ex.exercise.name)
    })
  })
  const names = Array.from(exerciseNames).join(", ")
  return `${new Date(workout.date).toLocaleDateString(undefined, {
    timeZone: "UTC",
  })} — ${names}`
}

export function NewWorkoutForm({
  clients,
  trainers,
  trigger,
}: {
  clients: User[]
  trainers: User[]
  trigger?: ReactNode
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>New Workout</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
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
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent position="popper">
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
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select trainer" />
              </SelectTrigger>
              <SelectContent position="popper">
                {trainers.map((trainer) => (
                  <SelectItem key={trainer.id} value={trainer.id}>
                    {trainer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              // Local today (en-CA yields YYYY-MM-DD); a UTC date here can land
              // on the wrong day near midnight for viewers off UTC.
              defaultValue={new Date().toLocaleDateString("en-CA")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="copyFromId">Copy from previous workout (optional)</Label>
            <Select name="copyFromId" disabled={!selectedClient || loadingWorkouts}>
              <SelectTrigger className="w-full">
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
              <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="none">Start fresh</SelectItem>
                {recentWorkouts.map((workout) => (
                  <SelectItem key={workout.id} value={workout.id} className="whitespace-normal">
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
