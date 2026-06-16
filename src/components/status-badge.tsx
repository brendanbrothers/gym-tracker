type WorkoutStatus = "COMPLETED" | "IN_PROGRESS" | string

const statusStyles: Record<string, string> = {
  SCHEDULED: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-200 text-gray-600",
}

export function StatusBadge({ status }: { status: WorkoutStatus }) {
  const className = statusStyles[status] ?? "bg-gray-100 text-gray-800"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${className}`}>
      {status.replace("_", " ")}
    </span>
  )
}
