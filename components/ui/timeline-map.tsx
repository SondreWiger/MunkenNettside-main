import React, { useRef, useState } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export interface TimelineNode {
  id: string
  title: string
  notes?: string | null
  event_type?: string
  occurred_at?: string
}

interface TimelineMapProps {
  items: TimelineNode[]
  onNodeClick?: (item: TimelineNode) => void
}

export function TimelineMap({ items, onNodeClick }: TimelineMapProps) {
  // Sort by occurred_at ascending
  const sorted = [...items].sort((a, b) => (a.occurred_at || '').localeCompare(b.occurred_at || ''))
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isDown = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  const [hovered, setHovered] = useState<string | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    isDown.current = true
    startX.current = e.clientX
    scrollLeft.current = containerRef.current?.scrollLeft || 0
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDown.current || !containerRef.current) return
    const dx = e.clientX - startX.current
    containerRef.current.scrollLeft = scrollLeft.current - dx
  }

  function onPointerUp(e: React.PointerEvent) {
    isDown.current = false
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
  }

  return (
    <div className="overflow-x-auto w-full py-8">
      <div
        ref={containerRef}
        className="flex items-center min-w-[600px] gap-4 px-4 select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (isDown.current = false)}
      >
        {sorted.map((item, i) => (
          <React.Fragment key={item.id}>
            <div className="flex flex-col items-center" onClick={() => onNodeClick?.(item)}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onMouseEnter={() => setHovered(item.id)}
                    onMouseLeave={() => setHovered(null)}
                    className={`rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white w-14 h-14 flex items-center justify-center text-lg font-bold shadow-lg transform transition-transform ${hovered === item.id ? 'scale-105 ring-4 ring-[var(--color-primary)]/20' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    {i + 1}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="font-medium">{item.title}</div>
                    {item.occurred_at && <div className="text-muted-foreground">{new Date(item.occurred_at).toLocaleString()}</div>}
                    {item.notes && <div className="mt-1">{item.notes}</div>}
                  </div>
                </TooltipContent>
              </Tooltip>

              <div className="mt-3 text-center min-w-[140px]">
                <div className="font-semibold text-sm">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.event_type}</div>
                {item.occurred_at && <div className="text-xs text-muted-foreground">{new Date(item.occurred_at).toLocaleDateString()}</div>}
                {item.notes && <div className="text-xs mt-1">{item.notes}</div>}
              </div>
            </div>
            {i < sorted.length - 1 && (
              <div className="flex-1 h-1 mx-2 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="h-1 w-full rounded-full bg-gradient-to-r from-[var(--color-primary)]/30 to-[var(--color-accent)]/30"></div>
                  <div className="absolute right-0 -translate-x-1/2 -translate-y-1/2 top-1/2 w-4 h-4 bg-[var(--color-accent)] rounded-full shadow-md transform rotate-45"></div>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
