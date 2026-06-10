"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type SetHistoryRow = {
  id: string
  date: string
  clientName: string
  round: number
  order: number
  targetReps: number | null
  targetWeight: number | null
  targetDuration: number | null
  actualReps: number | null
  actualWeight: number | null
  actualDuration: number | null
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// Show the actual value with the target in muted text, e.g. "12 / 10"
function ValueWithTarget({
  actual,
  target,
}: {
  actual: number | null
  target: number | null
}) {
  if (actual === null && target === null) return <span>—</span>
  return (
    <span>
      {actual ?? "—"}
      {target !== null && (
        <span className="text-muted-foreground"> / {target}</span>
      )}
    </span>
  )
}

export function SetHistoryTable({ rows }: { rows: SetHistoryRow[] }) {
  if (rows.length === 0) return null

  const hasWeight = rows.some((r) => r.actualWeight !== null)
  const hasDuration = rows.some((r) => r.actualDuration !== null)

  const maxWeight = hasWeight
    ? Math.max(...rows.map((r) => r.actualWeight ?? -Infinity))
    : null
  const maxReps = rows.some((r) => r.actualReps !== null)
    ? Math.max(...rows.map((r) => r.actualReps ?? -Infinity))
    : null
  const maxDuration = hasDuration
    ? Math.max(...rows.map((r) => r.actualDuration ?? -Infinity))
    : null

  const summaryParts: string[] = []
  if (maxWeight !== null) summaryParts.push(`${maxWeight} lbs`)
  if (maxReps !== null) summaryParts.push(`${maxReps} reps`)
  if (maxDuration !== null) summaryParts.push(`${maxDuration}s`)

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="text-lg font-medium">Set History</h3>
        {summaryParts.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Best:{" "}
            <span className="font-medium text-foreground">
              {summaryParts.join(" · ")}
            </span>
          </p>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Set</TableHead>
            <TableHead className="text-right">Reps</TableHead>
            {hasWeight && <TableHead className="text-right">Weight</TableHead>}
            {hasDuration && (
              <TableHead className="text-right">Duration</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isMaxWeight =
              maxWeight !== null && row.actualWeight === maxWeight
            const isMaxReps = maxReps !== null && row.actualReps === maxReps
            const isMaxDuration =
              maxDuration !== null && row.actualDuration === maxDuration
            const isBest = isMaxWeight || isMaxReps || isMaxDuration
            return (
              <TableRow key={row.id} className={isBest ? "bg-muted/50" : ""}>
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell>{row.order}</TableCell>
                <TableCell className="text-right">
                  <ValueWithTarget
                    actual={row.actualReps}
                    target={row.targetReps}
                  />
                  {isMaxReps && <span title="Best reps"> ★</span>}
                </TableCell>
                {hasWeight && (
                  <TableCell className="text-right">
                    <ValueWithTarget
                      actual={row.actualWeight}
                      target={row.targetWeight}
                    />
                    {isMaxWeight && <span title="Best weight"> ★</span>}
                  </TableCell>
                )}
                {hasDuration && (
                  <TableCell className="text-right">
                    <ValueWithTarget
                      actual={row.actualDuration}
                      target={row.targetDuration}
                    />
                    {isMaxDuration && <span title="Best duration"> ★</span>}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
