'use client'

import React, { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

export function TopShowsChartClient({ initialData }: { initialData?: any[] }) {
  const [data, setData] = useState(initialData || [])

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      try {
  const res = await fetch('/api/admin/stats', { credentials: 'include' })
        if (!res.ok) return
        const json = await res.json()
        if (!mounted) return
        setData(json.seatFill || [])
      } catch (e) {
        // ignore
      }
    }

    fetchData()
  }, [])

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 60, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="title" width={180} />
          <Tooltip />
          <Legend />
          <Bar dataKey="fill_rate" fill="#ef4444" name="Fill rate (%)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
