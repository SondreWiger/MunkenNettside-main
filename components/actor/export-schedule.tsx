"use client"

import { Button } from "@/components/ui/button"

export default function ExportSchedule({ dataJson }: { dataJson: string }) {
  function download() {
    const blob = new Blob([dataJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'actor-schedule.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2">
      <Button onClick={download} variant="outline">Eksporter plan (JSON)</Button>
    </div>
  )
}
