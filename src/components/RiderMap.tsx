import { useEffect, useRef, useState } from 'react'
import Map, { Marker, NavigationControl, Source, Layer, type MapRef } from 'react-map-gl/mapbox'
import { Plus, Minus, LocateFixed, Maximize2 } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export interface MapPin {
  id: string
  lat: number
  lng: number
  kind: 'rider' | 'job' | 'me' | 'pickup' | 'dropoff'
  label?: string
}

const BTN = 'w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform active:scale-90 backdrop-blur'
const BTN_STYLE = { background: 'rgba(9,7,11,0.78)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 6px 18px rgba(0,0,0,0.35)' }

export default function RiderMap({
  center, pins, onMapClick, height = 300, fit = true, controls = 'basic',
}: {
  center: { lat: number; lng: number }
  pins: MapPin[]
  onMapClick?: (lat: number, lng: number) => void
  height?: number
  fit?: boolean
  /** 'basic' = the old zoom control. 'full' = round zoom / locate / fit-all buttons. */
  controls?: 'basic' | 'full'
}) {
  const ref = useRef<MapRef>(null)
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null)
  const signature = pins.map(p => `${p.id}:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|')

  function fitAll() {
    const m = ref.current
    if (!m || pins.length === 0) return
    if (pins.length === 1) { m.flyTo({ center: [pins[0].lng, pins[0].lat], zoom: 13, duration: 600 }); return }
    const lngs = pins.map(p => p.lng), lats = pins.map(p => p.lat)
    m.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 70, maxZoom: 15, duration: 600 })
  }

  function locate() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMe(c)
        ref.current?.flyTo({ center: [c.lng, c.lat], zoom: 15, duration: 700 })
      },
      () => { /* permission denied: nothing to do */ },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  // Zoom the map so every pin is visible
  useEffect(() => {
    if (!fit) return
    fitAll()
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

  const a = pins.find(p => p.kind === 'pickup')
  const b = pins.find(p => p.kind === 'dropoff')

  return (
    <div className="relative rounded-2xl overflow-hidden border border-surface-800 shadow-lg" style={{ height }}>
      <Map
        ref={ref}
        mapboxAccessToken={TOKEN}
        initialViewState={{ latitude: center.lat, longitude: center.lng, zoom: 12 }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
        onClick={e => onMapClick?.(e.lngLat.lat, e.lngLat.lng)}
      >
        {controls === 'basic' && <NavigationControl position="top-right" showCompass={false} />}

        {a && b && (
          <Source id="route" type="geojson" data={{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[a.lng, a.lat], [b.lng, b.lat]] } }}>
            <Layer id="route-line" type="line" paint={{ 'line-color': '#FF8A3D', 'line-width': 3.5, 'line-dasharray': [1.5, 1.5] }} layout={{ 'line-cap': 'round' }} />
          </Source>
        )}

        {me && (
          <Marker latitude={me.lat} longitude={me.lng} anchor="center">{pin({ id: 'me', kind: 'me', lat: me.lat, lng: me.lng })}</Marker>
        )}
        {pins.map(p => (
          <Marker key={p.id} latitude={p.lat} longitude={p.lng} anchor={p.kind === 'pickup' || p.kind === 'dropoff' ? 'bottom' : 'center'}>
            {pin(p)}
          </Marker>
        ))}
      </Map>

      {controls === 'full' && (
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button type="button" aria-label="Zoom in" className={BTN} style={BTN_STYLE} onClick={() => ref.current?.zoomIn({ duration: 200 })}><Plus size={18} /></button>
          <button type="button" aria-label="Zoom out" className={BTN} style={BTN_STYLE} onClick={() => ref.current?.zoomOut({ duration: 200 })}><Minus size={18} /></button>
          <button type="button" aria-label="Show my location" className={BTN} style={{ ...BTN_STYLE, color: '#FF9A4D' }} onClick={locate}><LocateFixed size={18} /></button>
          {pins.length > 0 && (
            <button type="button" aria-label="Show everything on the map" className={BTN} style={BTN_STYLE} onClick={fitAll}><Maximize2 size={16} /></button>
          )}
        </div>
      )}
    </div>
  )
}
