"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateGym, uploadLogo } from "./actions"
import { Upload, Building2 } from "lucide-react"

interface GymSettingsFormProps {
  gym: {
    id: string
    name: string
    slug: string
    logo: string | null
  }
  canEdit: boolean
}

export function GymSettingsForm({ gym, canEdit }: GymSettingsFormProps) {
  const [name, setName] = useState(gym.name)
  const [logo, setLogo] = useState(gym.logo)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsSaving(true)

    const formData = new FormData()
    formData.set("name", name)
    if (logo) {
      formData.set("logo", logo)
    }

    const result = await updateGym(formData)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }

    setIsSaving(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB")
      return
    }

    setError(null)
    setIsUploading(true)

    const formData = new FormData()
    formData.set("file", file)

    const result = await uploadLogo(formData)

    if (result.error) {
      setError(result.error)
    } else if (result.logo) {
      setLogo(result.logo)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }

    setIsUploading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gym Profile</CardTitle>
        <CardDescription>
          {canEdit
            ? "Update your gym's name and logo"
            : "View your gym's information"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted">
              {logo ? (
                <img
                  src={logo}
                  alt={`${name} logo`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-10 h-10 text-muted-foreground" />
              )}
            </div>

            {canEdit && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? "Uploading..." : "Upload Logo"}
                </Button>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Gym Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter gym name"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={gym.slug}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              The URL-friendly identifier for your gym (cannot be changed)
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {success && (
            <p className="text-sm text-green-600">Settings saved successfully!</p>
          )}

          {canEdit && (
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
