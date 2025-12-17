"use client"

import { useEffect, useState, useTransition } from "react"
import { Pencil, Trash2 } from "lucide-react"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ExerciseForm } from "@/components/exercise-form"
import { getExercises, createExercise, deleteExercise, updateExercise } from "./actions"
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
  equipment: string | null
  createdBy: { id: string; name: string } | null
}

type FilterOptions = {
  categories: string[]
  muscles: string[]
  equipment: string[]
}

export function ExerciseFilters({
  initialExercises,
  filterOptions,
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
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  async function handleDelete(exerciseId: string) {
    setDeleteError(null)
    const result = await deleteExercise(exerciseId)
    if (result.error) {
      setDeleteError(result.error)
    } else {
      setExercises(exercises.filter((e) => e.id !== exerciseId))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1 mr-4">
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
        <ExerciseForm 
  onSubmit={createExercise} 
  onSuccess={() => {
    // Re-fetch the exercises
    startTransition(async () => {
      const results = await getExercises({
        search: search || undefined,
        category: category || undefined,
        primaryMuscle: muscle || undefined,
        equipment: equipment || undefined,
      })
      setExercises(results)
    })
  }}
/>      </div>
      <p className="text-sm text-muted-foreground">
        Showing {exercises.length} exercises {isPending && "(loading...)"}
      </p>
      {deleteError && (
        <p className="text-sm text-red-500">{deleteError}</p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Primary Muscle</TableHead>
            <TableHead>Equipment</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exercises.map((exercise) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              onDelete={handleDelete}
              onUpdate={(updated) => {
                setExercises(exercises.map((e) => (e.id === updated.id ? updated : e)))
              }}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ExerciseRow({
  exercise,
  onDelete,
  onUpdate,
}: {
  exercise: Exercise
  onDelete: (id: string) => void
  onUpdate: (exercise: Exercise) => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleEdit(formData: FormData) {
    setError("")
    setLoading(true)
    const result = await updateExercise(exercise.id, formData)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else if (result.exercise) {
      onUpdate(result.exercise as Exercise)
      setEditOpen(false)
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{exercise.name}</TableCell>
      <TableCell>{exercise.category || "-"}</TableCell>
      <TableCell>{exercise.primaryMuscle || "-"}</TableCell>
      <TableCell>{exercise.equipment || "-"}</TableCell>
      <TableCell>{exercise.createdBy?.name || "-"}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Exercise</DialogTitle>
              </DialogHeader>
              <form action={handleEdit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Exercise Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={exercise.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select name="category" defaultValue={exercise.category || "none"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
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
                  <Select name="primaryMuscle" defaultValue={exercise.primaryMuscle || "none"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select muscle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
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
                  <Select name="equipment" defaultValue={exercise.equipment || "none"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
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
                  {loading ? "Saving..." : "Save Changes"}
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
                <AlertDialogTitle>Delete {exercise.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this exercise. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(exercise.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  )
}