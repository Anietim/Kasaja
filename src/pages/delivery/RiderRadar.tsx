import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import Map, { Marker, Popup } from 'react-map-gl/mapbox'
import { Bike, X, MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { RiderLocation } from '../../types/database'
import 'mapbox-gl/dist/mapbox-gl.css'
import { UserTicks } from '@/components/Tick'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export default function RiderRadar() {
  const navigate  = useNavigate()
  const { theme } = useTheme()
  const { user }  = useAuth()
  const [riders,   setRiders]   = useState<RiderLocation[]>([])
  const [selected, setSelected] = useState<RiderLocation | null>(null)
  const [viewport, setViewport] = useState({
    latitude:  6.5244,
    longitude: 3.3792,
    zoom:      12,
  })

  const loadRiders = useCallback(async () => {
    const { data } = await supabase
      .from('rider_locations')
      .select('*, rider:profiles(id, display_name, avatar_url)')
      .eq('is_online', true)
    setRiders(data ?? [])
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    void loadRiders()
    const channel = supabase.channel('rider_radar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_locations' }, () => { void loadRiders() })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [loadRiders])

  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'placeholder') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center mb-4">
          <Bike size={28} className="text-brand-400" />
        </div>
        <h2 className="font-display text-xl font-bold text-white mb-2">Rider Radar</h2>
        <p className="text-neutral-400 text-sm max-w-xs">
          Add your Mapbox token to <span className="font-mono text-brand-400">VITE_MAPBOX_TOKEN</span> in .env to enable the live rider map.
        </p>
        <button onClick={() => { void navigate(-1) }}
          className="mt-6 px-6 py-3 bg-surface border border-surface-border text-white rounded-2xl text-sm font-semibold">
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="relative h-[calc(100dvh-56px-64px)]">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={viewport}
        onMove={(e: { viewState: { latitude: number; longitude: number; zoom: number } }) => setViewport(e.viewState)}
        mapStyle={theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12'}
        style={{ width: '100%', height: '100%' }}
      >
        {riders.map(r => (
          <Marker
            key={r.rider_id}
            latitude={r.lat}
            longitude={r.lng}
            onClick={(e: { originalEvent: MouseEvent }) => { e.originalEvent.stopPropagation(); setSelected(r) }}
          >
            <div className="w-8 h-8 rounded-full bg-brand-500 border-2 border-white shadow-glow-sm
              flex items-center justify-center cursor-pointer hover:scale-110 transition">
              <Bike size={14} className="text-white" />
            </div>
          </Marker>
        ))}

        {selected && (
          <Popup
            latitude={selected.lat}
            longitude={selected.lng}
            anchor="bottom"
            onClose={() => setSelected(null)}
            closeButton={false}
            className="!bg-surface !text-white !rounded-2xl !border !border-surface-border"
          >
            <div className="p-3 min-w-[160px]">
              <button onClick={() => setSelected(null)} className="absolute top-2 right-2 text-neutral-400">
                <X size={14} />
              </button>
              <div className="font-semibold text-white text-sm mb-2 flex items-center gap-1">
                {selected.rider?.display_name ?? 'Rider'}<UserTicks userId={selected.rider_id} size={14} />
              </div>
              <div className="flex items-center gap-1 mb-3">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="text-success text-xs">Online</span>
              </div>
              <button
                onClick={() => {
                  if (!user || !selected.rider) return
                  void supabase.from('conversations').insert({
                    participant_ids: [user.id, selected.rider_id],
                    source: 'direct',
                  }).select('id').single().then(({ data }) => {
                    const id = (data as { id?: string } | null)?.id
                    if (id) void navigate(`/inbox/${id}`)
                  })
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-brand-500 rounded-xl text-white text-xs font-semibold hover:bg-brand-600 transition"
              >
                <MessageCircle size={12} /> Invite to deliver
              </button>
            </div>
          </Popup>
        )}
      </Map>

      {/* rider count pill */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-canvas/90 backdrop-blur-md rounded-full px-4 py-2
        flex items-center gap-2 border border-surface-border shadow-lg">
        <span className="w-2 h-2 rounded-full bg-success" />
        <span className="text-white text-sm font-semibold">{riders.length} riders online</span>
      </div>
    </div>
  )
}
