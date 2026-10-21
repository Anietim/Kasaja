import { ShieldCheck } from 'lucide-react'

/** Reminder at the bottom of Home that every confirmed delivery gets a public receipt. */
export default function TrustCard() {
  return (
    <div className="px-4 pt-7">
      <div className="rounded-3xl p-px" style={{ background: 'linear-gradient(135deg, rgba(255,106,19,0.7), rgba(99,102,241,0.7))' }}>
        <div className="rounded-[23px] p-5 flex gap-4 items-center" style={{ background: '#0A0A0A' }}>
          <span className="w-12 h-12 rounded-full flex items-center justify-center flex-none" style={{ background: 'rgba(52,211,153,0.16)' }}>
            <ShieldCheck size={22} color="#34D399" />
          </span>
          <div>
            <p className="text-base font-extrabold text-white">Every delivery gets a receipt</p>
            <p className="text-sm leading-relaxed mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Confirmed orders are recorded on Arc. Shop knowing it's on record.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
