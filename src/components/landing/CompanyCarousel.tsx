'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface CompanyItem {
  id?: string
  name: string
  logo_url: string | null
}

interface CompanyCarouselProps {
  companies: CompanyItem[]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function CompanyCarousel({ companies }: CompanyCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const dragState = useRef({ startX: 0, scrollLeft: 0 })
  const rafRef = useRef<number | undefined>(undefined)
  const lastTimestamp = useRef<number | undefined>(undefined)

  useEffect(() => {
    const container = containerRef.current
    if (!container || companies.length === 0) return

    const animate = (timestamp: number) => {
      if (!isPaused) {
        if (!lastTimestamp.current) lastTimestamp.current = timestamp
        const delta = timestamp - lastTimestamp.current
        lastTimestamp.current = timestamp
        container.scrollLeft += delta * 0.05
        if (container.scrollLeft >= container.scrollWidth / 2) {
          container.scrollLeft = 0
        }
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [companies.length, isPaused])

  const handleDragStart = useCallback((clientX: number) => {
    const container = containerRef.current
    if (!container) return
    setIsDragging(true)
    setIsPaused(true)
    dragState.current = { startX: clientX, scrollLeft: container.scrollLeft }
    lastTimestamp.current = undefined
  }, [])

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return
    const container = containerRef.current
    if (!container) return
    const delta = clientX - dragState.current.startX
    container.scrollLeft = dragState.current.scrollLeft - delta
  }, [isDragging])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    setTimeout(() => setIsPaused(false), 3000)
  }, [])

  if (companies.length === 0) return null

  const duplicated = [...companies, ...companies]

  return (
    <div className="relative max-w-5xl mx-auto">
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div
        ref={containerRef}
        className={`overflow-x-auto scrollbar-hide ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={(e) => handleDragStart(e.pageX)}
        onMouseMove={(e) => handleDragMove(e.pageX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={(e) => handleDragStart(e.touches[0].pageX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].pageX)}
        onTouchEnd={handleDragEnd}
      >
        <div className="flex gap-6 px-4">
          {duplicated.map((item, i) => {
            const initials = getInitials(item.name)
            return (
              <div
                key={`${item.id || i}-${i}`}
                className="flex flex-col items-center gap-3 shrink-0 select-none w-[200px]"
              >
                <div className="w-[160px] h-[160px] rounded-[var(--radius-xl)] bg-white border border-[var(--border)] shadow-[var(--shadow-card)] flex items-center justify-center overflow-hidden">
                  {item.logo_url ? (
                    <img src={item.logo_url} alt={item.name} className="w-full h-full object-contain p-5 pointer-events-none" />
                  ) : (
                    <span className="text-2xl font-bold text-[var(--primary)]">{initials}</span>
                  )}
                </div>
                <span className="text-sm font-medium text-[var(--ink-secondary)] text-center leading-tight">{item.name}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
