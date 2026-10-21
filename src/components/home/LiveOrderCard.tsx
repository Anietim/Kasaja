import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import RiderMap from '@/components/RiderMap'
import { useLiveOrder } from '@/hooks/useLiveOrder'

/** Phone/tablet version: the orange "order on the way" card at the top of Home. */
export default function LiveOrderCard() {
  const navigate = useNavigate()
  const o = useLiveOrder()
  if (!o.active) return null

  const line = o.rider ? `${o.line}, rider ${o.rider}` : o.line

  return (
    <div className="px-4 pt-4">
      <button
        onClick={() => void navigate(o.deliveryId ? `/delivery/${o.deliveryId}` : '/orders')}
        className="w-full text-left rounded-3xl p-5 transition-transform active:scale-[0.98]"
        style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}
        aria-label={`Order in progress: ${o.title}. ${o.line}`}
      >
        <span className="text-[11px] font-extrabold tracking-[0.12em]">ORDER ON THE WAY</span>
        <p className="text-xl font-extrabold tracking-tight mt-2">{o.title}</p>
        <p className="text-sm font-medium mt-1">{line}</p>
        <div className="h-2 rounded-full mt-4 mb-3" style={{ background: 'rgba(0,0,0,0.22)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${o.pct}%`, background: 'var(--k-on-accent)' }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold">Confirm on arrival to get your receipt</span>
          <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'var(--k-on-accent)' }}>
            <ArrowRight size={18} style={{ color: 'var(--k-accent)' }} />
          </span>
        </div>
      </button>

      {o.pins.length > 0 && (
        <div className="mt-3 rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <RiderMap center={{ lat: o.pins[0].lat, lng: o.pins[0].lng }} pins={o.pins} height={160} />
        </div>
      )}
    </div>
  )
}
