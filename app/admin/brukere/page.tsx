"use client"

import { Users } from "lucide-react"
import { UserManagement } from "@/components/admin/user-management"

export default function UsersPage() {
  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Brukere</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Administrer brukere, roller og skuespillerprofiler</p>
        </div>
      </div>

      <UserManagement />
    </main>
  )
}
