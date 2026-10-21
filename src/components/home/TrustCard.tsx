import { ShieldCheck } from 'lucide-react'

/** Reminder at the bottom of Home that every confirmed delivery gets a public receipt. */
export default function TrustCard() {
  return (
    <div className="px-4 pt-7">
      <div className="rounded-2xl p-5 flex gap-4 items-center" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}>
        <span className="w-11 h-11 rounded-full flex items-center justify-center flex-none" style={{ background: 'rgba(52,211,153,0.16)' }}>
          <ShieldCheck size={21} style={{ color: 'var(--k-ok)' }} />
        </span>
        <div>
          <p className="text-base font-extrabold" style={{ color: 'var(--k-text)' }}>Every delivery gets a receipt</p>
          <p className="text-sm leading-relaxed mt-1" style={{ color: 'var(--k-muted)' }}>
            Confirmed orders are recorded on Arc. Shop knowing it's on record.
          </p>
        </div>
      </div>
    </div>
  )
}
