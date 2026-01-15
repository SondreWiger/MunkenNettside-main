import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/utils/booking"
import type { Show } from "@/lib/types"
import AttendanceToggle from '@/components/session/attendance-toggle'

export default function KursSessionList({ sessions }: { sessions: Show[] }) {
  if (!sessions || sessions.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Øvinger og møtedager</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-start justify-between">
              <div>
                <p className="font-medium">{s.title || "Øving"}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(s.show_datetime)}</p>
                {s.venue && s.venue.name && (
                  <p className="text-sm text-muted-foreground">Sted: {s.venue.name}</p>
                )}
                <p className="mt-2"><Link href={`/ovinger/${s.id}`} className="text-primary hover:underline">Se øving</Link></p>
              </div>
              <div className="text-sm text-muted-foreground flex flex-col items-end gap-2">
                <div>{s.team ? s.team : null}</div>
                <AttendanceToggle showId={s.id} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
