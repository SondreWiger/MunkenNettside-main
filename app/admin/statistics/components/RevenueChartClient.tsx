'use client'

import React, { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Area,
  AreaChart,
  CartesianGrid,
} from 'recharts'

type SeriesPoint = { date: string; bookings: number; purchases: number; total: number }

export function RevenueChartClient({ initialData }: { initialData?: SeriesPoint[] }) {
  const [data, setData] = useState<SeriesPoint[]>(initialData || [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/stats')
        if (!res.ok) return
        const json = await res.json()
        if (!mounted) return
        setData((json.monthlyTimeseries || json.revenueTimeseries) || [])
      } catch (err) {
        // ignore
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const id = setInterval(fetchData, 60 * 1000) // refresh every minute
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="bookings" stroke="#60a5fa" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="purchases" stroke="#34d399" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="total" stroke="#7c3aed" fill="#a78bfa" fillOpacity={0.2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
