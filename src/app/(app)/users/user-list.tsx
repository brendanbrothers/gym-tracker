"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, UserMinus, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { updateUser, markUserAsFormer, reactivateUser } from "./actions"

type User = {
  id: string
  name: string
  email: string
  status: string
  createdAt: Date
}

export function UserList({
  users,
  showFormer,
  userType,
}: {
  users: User[]
  showFormer: boolean
  userType: "client" | "trainer"
}) {
  const router = useRouter()
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const activeUsers = users.filter((u) => u.status === "ACTIVE")
  const formerUsers = users.filter((u) => u.status === "FORMER")
  const displayedUsers = showFormer ? users : activeUsers

  async function handleEditSubmit(formData: FormData) {
    if (!editingUser) return
    setError("")
    setLoading(true)

    const result = await updateUser(editingUser.id, formData)

    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setEditingUser(null)
      router.refresh()
    }
  }

  async function handleMarkAsFormer(userId: string) {
    const result = await markUserAsFormer(userId)
    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
  }

  async function handleReactivate(userId: string) {
    const result = await reactivateUser(userId)
    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
  }

  if (displayedUsers.length === 0) {
    return (
      <p className="text-muted-foreground">
        No {showFormer ? "" : "active "}{userType}s yet.
        {!showFormer && formerUsers.length > 0 && (
          <span className="ml-1">
            ({formerUsers.length} former {userType}{formerUsers.length > 1 ? "s" : ""} hidden)
          </span>
        )}
      </p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedUsers.map((user) => (
            <TableRow key={user.id} className={user.status === "FORMER" ? "opacity-60" : ""}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    user.status === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {user.status === "ACTIVE" ? "Active" : "Former"}
                </span>
              </TableCell>
              <TableCell>{new Date(user.createdAt).toLocaleDateString("en-US")}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingUser(user)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {user.status === "ACTIVE" ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" title="Mark as Former">
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Mark as Former?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will mark {user.name} as a former {userType}. They will no longer
                            appear in active lists but will still be visible on historical workouts.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleMarkAsFormer(user.id)}>
                            Mark as Former
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReactivate(user.id)}
                      title="Reactivate"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!showFormer && formerUsers.length > 0 && (
        <p className="text-sm text-muted-foreground mt-4">
          {formerUsers.length} former {userType}{formerUsers.length > 1 ? "s" : ""} hidden
        </p>
      )}

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {userType === "client" ? "Client" : "Trainer"}</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form action={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editingUser.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  defaultValue={editingUser.email}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                <Input
                  id="edit-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
