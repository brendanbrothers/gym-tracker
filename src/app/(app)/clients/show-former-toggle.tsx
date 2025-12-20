"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Label } from "@/components/ui/label"

export function ShowFormerToggle({ showFormer }: { showFormer: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleToggle() {
    const params = new URLSearchParams(searchParams.toString())
    if (showFormer) {
      params.delete("showFormer")
    } else {
      params.set("showFormer", "true")
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={showFormer}
        onChange={handleToggle}
        className="rounded border-gray-300"
      />
      <span className="text-muted-foreground">Show former</span>
    </label>
  )
}
