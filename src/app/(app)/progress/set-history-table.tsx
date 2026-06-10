"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PbMetric, PersonalBests } from "@/lib/personal-bests"

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
  est1RM: number | null
  // Which all-time PB records this round currently holds.
  pbMetrics: PbMetric[]
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

function PbStar({ label }: { label: string }) {
  return <span title={`Personal best — ${label}`}> ★</span>
}

export function SetHistoryTable({
  rows,
  personalBests,
}: {
  rows: SetHistoryRow[]
  personalBests: PersonalBests
}) {
  if (rows.length === 0) return null

  const hasWeight = rows.some((r) => r.actualWeight !== null)
  const hasDuration = rows.some((r) => r.actualDuration !== null)
  const has1RM = rows.some((r) => r.est1RM !== null)

  // True all-time bests, regardless of the visible date range.
  const summaryParts: string[] = []
  if (personalBests.maxWeight)
    summaryParts.push(`${personalBests.maxWeight.value} lbs`)
  if (personalBests.est1RM)
    summaryParts.push(`est. 1RM ${Math.round(personalBests.est1RM.value)}`)
  if (personalBests.maxRepsUnbroken)
    summaryParts.push(`${personalBests.maxRepsUnbroken.value} reps`)
  if (personalBests.totalRepsTarget)
    summaryParts.push(`${personalBests.totalRepsTarget.value} total reps`)
  if (personalBests.maxDuration)
    summaryParts.push(`${personalBests.maxDuration.value}s`)

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
            {has1RM && <TableHead className="text-right">Est. 1RM</TableHead>}
            {hasDuration && (
              <TableHead className="text-right">Duration</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const pbs = new Set(row.pbMetrics)
            const isBest = pbs.size > 0
            return (
              <TableRow key={row.id} className={isBest ? "bg-muted/50" : ""}>
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell>{row.order}</TableCell>
                <TableCell className="text-right">
                  <ValueWithTarget
                    actual={row.actualReps}
                    target={row.targetReps}
                  />
                  {pbs.has("maxRepsUnbroken") && <PbStar label="most reps" />}
                </TableCell>
                {hasWeight && (
                  <TableCell className="text-right">
                    <ValueWithTarget
                      actual={row.actualWeight}
                      target={row.targetWeight}
                    />
                    {pbs.has("maxWeight") && <PbStar label="heaviest weight" />}
                  </TableCell>
                )}
                {has1RM && (
                  <TableCell className="text-right">
                    {row.est1RM !== null ? Math.round(row.est1RM) : "—"}
                    {pbs.has("est1RM") && <PbStar label="estimated 1-rep max" />}
                  </TableCell>
                )}
                {hasDuration && (
                  <TableCell className="text-right">
                    <ValueWithTarget
                      actual={row.actualDuration}
                      target={row.targetDuration}
                    />
                    {pbs.has("maxDuration") && <PbStar label="longest hold" />}
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
