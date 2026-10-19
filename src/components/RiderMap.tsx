import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export interface MapPin {
  id: string
  lat: number
  lng: number
  kind: 'rider' | 'job' | 'me' | 'pickup' | 'dropoff'
  label?: string
}

const STYLE: Record<MapPin['kind'], { emoji: string; bg: string }> = {
  rider:   { emoji: '🏍️', bg: '#F97316' },
  job:     { emoji: '📦', bg: '#3B82F6' },
  me:      { emoji: '📍', bg: '#EF4444' },
  pickup:  { emoji: 'A',  bg: '#F97316' },
  dropoff: { emoji: 'B',  bg: '#22C55E' },
}

export default function RiderMap({
  center, pins, onMapClick, height = 260,
}: {
  center: { lat: number; lng: number }
  pins: MapPin[]
  onMapClick?: (lat: number, lng: number) => void
  height?: number
}) {
  if (!TOKEN || TOKEN === 'placeholder') {
    return (
      <div style={{ height }} className="rounded-2xl bg-surface-900 flex items-center justify-center text-center px-4 text-sm text-amber-300">
        Map unavailable: the Mapbox key (VITE_MAPBOX_TOKEN) is missing from this build.
      </div>
    )
  }
  return (
    <div className="rounded-2xl overflow-hidden" style={{ height }}>
      <Map
        key={`${center.lat.toFixed(3)},${center.lng.toFixed(3)}`}
        mapboxAccessToken={TOKEN}
        initialViewState={{ latitude: center.lat, longitude: center.lng, zoom: 11 }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: '100%', height: '100%' }}
        onClick={e => onMapClick?.(e.lngLat.lat, e.lngLat.lng)}
      >
        <NavigationControl position="top-right" />
        {pins.map(p => (
          <Marker key={p.id} latitude={p.lat} longitude={p.lng} anchor="center">
            <div
              title={p.label}
              style={{ background: STYLE[p.kind].bg }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg border-2 border-white"
            >
              {STYLE[p.kind].emoji}
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  )
}