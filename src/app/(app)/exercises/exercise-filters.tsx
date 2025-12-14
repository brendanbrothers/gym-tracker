"use client"

import { Button } from "@/components/ui/button"

import { useEffect, useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getExercises } from "./actions"

type Exercise = {
  id: string
  name: string
  category: string | null
  primaryMuscle: string | null
  equipment: string | null
  source: string
}

type FilterOptions = {
  categories: string[]
  muscles: string[]
  equipment: string[]
}

export function ExerciseFilters({ 
  initialExercises,
  filterOptions 
}: { 
  initialExercises: Exercise[]
  filterOptions: FilterOptions
}) {
  const [exercises, setExercises] = useState(initialExercises)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [muscle, setMuscle] = useState("all")
  const [equipment, setEquipment] = useState("all")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(async () => {
        const results = await getExercises({
          search: search || undefined,
          category: category || undefined,
          primaryMuscle: muscle || undefined,
          equipment: equipment || undefined,
        })
        setExercises(results)
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [search, category, muscle, equipment])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
    <Input
        placeholder="Search exercises..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
    />
    <Select value={category} onValueChange={setCategory}>
        <SelectTrigger>
        <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="all">All Categories</SelectItem>
        {filterOptions.categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
            {cat}
            </SelectItem>
        ))}
        </SelectContent>
    </Select>
    <Select value={muscle} onValueChange={setMuscle}>
        <SelectTrigger>
        <SelectValue placeholder="Muscle" />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="all">All Muscles</SelectItem>
        {filterOptions.muscles.map((m) => (
            <SelectItem key={m} value={m}>
            {m}
            </SelectItem>
        ))}
        </SelectContent>
    </Select>
    <Select value={equipment} onValueChange={setEquipment}>
        <SelectTrigger>
        <SelectValue placeholder="Equipment" />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="all">All Equipment</SelectItem>
        {filterOptions.equipment.map((e) => (
            <SelectItem key={e} value={e}>
            {e}
            </SelectItem>
        ))}
        </SelectContent>
    </Select>
    <Button
        variant="outline"
        onClick={() => {
        setSearch("")
        setCategory("all")
        setMuscle("all")
        setEquipment("all")
        }}
    >
        Clear Filters
    </Button>
    </div>
      <p className="text-sm text-muted-foreground">
        Showing {exercises.length} exercises {isPending && "(loading...)"}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Primary Muscle</TableHead>
            <TableHead>Equipment</TableHead>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exercises.map((exercise) => (
            <TableRow key={exercise.id}>
              <TableCell className="font-medium">{exercise.name}</TableCell>
              <TableCell>{exercise.category || "-"}</TableCell>
              <TableCell>{exercise.primaryMuscle || "-"}</TableCell>
              <TableCell>{exercise.equipment || "-"}</TableCell>
              <TableCell>{exercise.source}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}