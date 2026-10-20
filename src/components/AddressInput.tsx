import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export interface Place { text: string; lat: number; lng: number }

// Address box with suggestions, like a map app.
export default function AddressInput({
  value, onChange, onPick, placeholder, disabled,
}: {
  value: string
  onChange: (v: string) => void
  onPick: (p: Place) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [items, setItems] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const skip = useRef(false)

  useEffect(() => {
    if (skip.current) { skip.current = false; return }
    if (!TOKEN || value.trim().length < 3) { setItems([]); return }
    const t = setTimeout(() => {
      void (async () => {
        try {
          const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(value)}&country=ng&autocomplete=true&limit=5&proximity=3.3792,6.5244&access_token=${TOKEN}`
          const res = await fetch(url)
          if (!res.ok) return
          const j = await res.json() as { features?: { geometry: { coordinates: [number, number] }; properties: { full_address?: string; name?: string; place_formatted?: string } }[] }
          setItems((j.features ?? []).map(f => ({
            text: f.properties.full_address || [f.properties.name, f.properties.place_formatted].filter(Boolean).join(', '),
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          })))
          setOpen(true)
        } catch { /* ignore */ }
      })()
    }, 300)
    return () => clearTimeout(t)
  }, [value])

  return (
    <div className="relative">
      <input
        className="w-full bg-surface-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && items.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-zinc-900 border border-surface-700 rounded-xl overflow-hidden shadow-xl">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { skip.current = true; onChange(it.text); onPick(it); setOpen(false) }}
              className="w-full flex items-start gap-2 px-3 py-2.5 text-left text-sm text-white hover:bg-surface-800"
            >
              <MapPin size={14} className="text-brand-500 mt-0.5 shrink-0" />
              <span>{it.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}