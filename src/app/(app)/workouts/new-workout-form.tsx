"use client"

import { useState } from "react"
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
import {
  dateAndTimeToISO,
  quarterHourOptions,
  roundToQuarterHour,
  toDateValue,
  toTimeValue,
} from "@/lib/utils"

const TIME_OPTIONS = quarterHourOptions()

import { createWorkout } from "./actions"

type User = {
  id: string
  name: string
  role: string
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

  async function handleSubmit(formData: FormData) {
    setError("")
    setLoading(true)

    // Combine date + time into a UTC instant before sending, so the stored time
    // reflects the trainer's timezone, not the server's.
    const localDate = formData.get("date") as string
    const localTime = (formData.get("time") as string) || "12:00"
    if (localDate) {
      formData.set("date", dateAndTimeToISO(localDate, localTime))
    }

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
          <DialogTitle>Create New Workout</DialogTitle>
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
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={toDateValue(new Date())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Select
                name="time"
                defaultValue={toTimeValue(roundToQuarterHour(new Date()))}
              >
                <SelectTrigger className="w-full">
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
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Workout"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
