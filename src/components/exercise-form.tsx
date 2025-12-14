"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

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
  EXERCISE_CATEGORIES,
  PRIMARY_MUSCLES,
  EQUIPMENT,
} from "@/lib/constants"

type ExerciseFormProps = {
  onSubmit: (formData: FormData) => Promise<{ success?: boolean; error?: string; exercise?: unknown }>
  trigger?: React.ReactNode
  defaultName?: string
  onSuccess?: (exercise: unknown) => void
}

export function ExerciseForm({
  onSubmit,
  trigger,
  defaultName = "",
  onSuccess,
}: ExerciseFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError("")
    setLoading(true)

    const result = await onSubmit(formData)

    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
      if (onSuccess && result.exercise) {
        onSuccess(result.exercise)
      } else {
        router.refresh()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Add Exercise</Button>}
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
              defaultValue={defaultName}
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