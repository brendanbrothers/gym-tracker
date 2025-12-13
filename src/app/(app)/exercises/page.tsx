import { prisma } from "@/lib/db"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function ExercisesPage() {
  const exercises = await prisma.exercise.findMany({
    orderBy: { name: "asc" },
    take: 50,
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Exercises</h1>
      <p className="text-muted-foreground mb-4">
        Showing first 50 exercises. We&apos;ll add search and pagination later.
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