"use client"

import { useEffect, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { getProgressData } from "./actions"

type Exercise = {
  id: string
  name: string
}

type Client = {
  id: string
  name: string
}

type ProgressData = {
  date: string
  clientName: string
  avgWeight: number
  maxWeight: number
  avgReps: number
  totalReps: number
  sets: number
}

export function ProgressChart({
  exercises,
  clients,
}: {
  exercises: Exercise[]
  clients: Client[]
}) {
  const [selectedExercise, setSelectedExercise] = useState<string>("")
  const [selectedClient, setSelectedClient] = useState<string>("all")
  const [data, setData] = useState<ProgressData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedExercise) return

    setLoading(true)
    getProgressData(
      selectedExercise,
      selectedClient === "all" ? undefined : selectedClient
    ).then((result) => {
      setData(result)
      setLoading(false)
    })
  }, [selectedExercise, selectedClient])

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-1 ${clients.length > 0 ? "md:grid-cols-2" : ""} gap-4 max-w-xl`}>
        <div className="space-y-2">
          <Label>Exercise</Label>
          <Select value={selectedExercise} onValueChange={setSelectedExercise}>
            <SelectTrigger>
              <SelectValue placeholder="Select exercise" />
            </SelectTrigger>
            <SelectContent>
              {exercises.map((exercise) => (
                <SelectItem key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {clients.length > 0 && (
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!selectedExercise && (
        <p className="text-muted-foreground">
          Select an exercise to view progress over time.
        </p>
      )}

      {selectedExercise && loading && (
        <p className="text-muted-foreground">Loading...</p>
      )}

      {selectedExercise && !loading && data.length === 0 && (
        <p className="text-muted-foreground">
          No data found for this exercise.
        </p>
      )}

      {selectedExercise && !loading && data.length > 0 && (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-medium mb-4">Weight Progress (lbs)</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="maxWeight"
                    stroke="#2563eb"
                    name="Max Weight"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgWeight"
                    stroke="#7c3aed"
                    name="Avg Weight"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Reps Progress</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalReps"
                    stroke="#059669"
                    name="Total Reps"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgReps"
                    stroke="#d97706"
                    name="Avg Reps/Set"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}