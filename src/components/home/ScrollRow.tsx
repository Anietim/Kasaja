import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

/**
 * A row that scrolls sideways. When there is more to the right, the edge fades out
 * and a small arrow button appears, so people know it scrolls.
 */
export default function ScrollRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)

  const check = useCallback(() => {
    const el = ref.current
    if (!el) return
    setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 6)
  }, [])

  useEffect(() => {
    check()
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [check, children])

  const fade = 'linear-gradient(to right, #000 calc(100% - 64px), transparent)'
  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={check}
        className={`flex overflow-x-auto no-scrollbar ${className}`}
        style={more ? { WebkitMaskImage: fade, maskImage: fade } : undefined}
      >
        {children}
      </div>
      {more && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => ref.current?.scrollBy({ left: 260, behavior: 'smooth' })}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line2)', color: 'var(--k-text)' }}
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  )
}
