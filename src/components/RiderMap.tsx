import { useEffect, useRef } from 'react'
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export interface MapPin {
  id: string
  lat: number
  lng: number
  kind: 'rider' | 'job' | 'me' | 'pickup' | 'dropoff'
  label?: string
}

export default function RiderMap({
  center, pins, onMapClick, height = 300, fit = true,
}: {
  center: { lat: number; lng: number }
  pins: MapPin[]
  onMapClick?: (lat: number, lng: number) => void
  height?: number
  fit?: boolean
}) {
  const ref = useRef<MapRef>(null)
  const signature = pins.map(p => `${p.id}:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|')

  // Zoom the map so every pin is visible
  useEffect(() => {
    const m = ref.current
    if (!fit || !m || pins.length === 0) return
    if (pins.length === 1) { m.flyTo({ center: [pins[0].lng, pins[0].lat], zoom: 13, duration: 600 }); return }
    const lngs = pins.map(p => p.lng), lats = pins.map(p => p.lat)
    m.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 70, maxZoom: 15, duration: 600 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, fit])

  if (!TOKEN || TOKEN === 'placeholder') {
    return (
      <div style={{ height }} className="rounded-2xl bg-surface-900 flex items-center justify-center text-center px-4 text-sm text-amber-300">
        Map unavailable: the Mapbox key (VITE_MAPBOX_TOKEN) is missing from this build.
      </div>
    )
  }

  const pin = (p: MapPin) => {
    if (p.kind === 'job') {
      return (
        <div className="px-2.5 py-1 rounded-full bg-white text-[12px] font-extrabold shadow-lg border-2 border-orange-500" style={{ color: '#EA580C' }}>
          {p.label}
        </div>
      )
    }
    if (p.kind === 'me') {
      return (
        <div className="relative w-5 h-5">
          <span className="absolute inset-0 rounded-full bg-blue-500/40 animate-ping" />
          <span className="absolute inset-0 rounded-full bg-blue-500 border-[3px] border-white shadow-lg" />
        </div>
      )
    }
    if (p.kind === 'rider') {
      return (
        <div title={p.label} className="w-9 h-9 rounded-full bg-orange-500 border-[3px] border-white shadow-lg flex items-center justify-center text-base">🏍️</div>
      )
    }
    const isA = p.kind === 'pickup'
    return (
      <div className="flex flex-col items-center" title={p.label}>
        <div className={`w-8 h-8 rounded-full border-[3px] border-white shadow-lg flex items-center justify-center text-white text-sm font-extrabold ${isA ? 'bg-orange-500' : 'bg-green-600'}`}>
          {isA ? 'A' : 'B'}
        </div>
        <div className={`w-0 h-0 -mt-0.5 border-x-[6px] border-x-transparent border-t-[8px] ${isA ? 'border-t-orange-500' : 'border-t-green-600'}`} />
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-surface-800 shadow-lg" style={{ height }}>
      <Map
        ref={ref}
        mapboxAccessToken={TOKEN}
        initialViewState={{ latitude: center.lat, longitude: center.lng, zoom: 12 }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
        onClick={e => onMapClick?.(e.lngLat.lat, e.lngLat.lng)}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {pins.map(p => (
          <Marker key={p.id} latitude={p.lat} longitude={p.lng} anchor={p.kind === 'pickup' || p.kind === 'dropoff' ? 'bottom' : 'center'}>
            {pin(p)}
          </Marker>
        ))}
      </Map>
    </div>
  )
}