"use client"

import { useEffect, useRef, useState } from "react"

export default function RawImageTest({ src }: { src: string }) {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [info, setInfo] = useState<any>(null)

  useEffect(() => {
    if (!src) return
    const img = imgRef.current
    const handle = () => {
      const comp = img ? getComputedStyle(img) : null
      setInfo({
        naturalWidth: img?.naturalWidth ?? 0,
        naturalHeight: img?.naturalHeight ?? 0,
        displayedWidth: img?.width ?? 0,
        displayedHeight: img?.height ?? 0,
        filter: comp?.filter || null,
        opacity: comp?.opacity || null,
        background: comp?.background || null,
      })
    }
    img?.addEventListener("load", handle)
    img?.addEventListener("error", handle)
    // Try to trigger once if already loaded
    if (img?.complete) handle()
    return () => {
      img?.removeEventListener("load", handle)
      img?.removeEventListener("error", handle)
    }
  }, [src])

  if (!src) return <div className="p-4 rounded bg-muted">No src provided</div>

  return (
    <div className="space-y-4">
      <div className="rounded overflow-hidden border bg-card p-4">
        <img ref={imgRef} src={src} alt="test" style={{ maxWidth: '100%', display: 'block' }} />
      </div>

      <div className="p-4 rounded bg-muted">
        <div className="font-mono text-sm">src: {src}</div>
        <div className="mt-2 text-sm">natural: {info ? `${info.naturalWidth}×${info.naturalHeight}` : '—'}</div>
        <div className="text-sm">displayed: {info ? `${info.displayedWidth}×${info.displayedHeight}` : '—'}</div>
        <div className="text-sm">filter: {info?.filter ?? 'none'}</div>
        <div className="text-sm">opacity: {info?.opacity ?? '1'}</div>
      </div>
    </div>
  )
}
