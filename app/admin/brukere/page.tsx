"use client"

import { UserManagement } from "@/components/admin/user-management"

export default function UsersPage() {
  return (
    <main className="container px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Bruker- og skuespilleradministrasjon</h1>
          <p className="text-muted-foreground">Administrer brukere, roller og skuespillerprofiler</p>
        </div>
      </div>

      <UserManagement />
    </main>
  )
}
