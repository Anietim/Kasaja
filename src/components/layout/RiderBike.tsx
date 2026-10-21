/**
 * A little delivery rider on a bike, riding along a moving road.
 * Pure SVG + CSS, no images. Stops moving when `moving` is false
 * or when the person has "reduce motion" turned on.
 */
export default function RiderBike({ moving = true, className }: { moving?: boolean; className?: string }) {
  const run = moving ? 'running' : 'paused'
  return (
    <svg viewBox="0 -6 220 90" className={className} role="img" aria-label="A rider on a bike delivering your order">
      <style>{`
        @keyframes kb-road { to { stroke-dashoffset: -28; } }
        @keyframes kb-spin { to { transform: rotate(360deg); } }
        @keyframes kb-bob  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.6px); } }
        @keyframes kb-wind { 0% { transform: translateX(14px); opacity: 0; } 30% { opacity: .7; } 100% { transform: translateX(-16px); opacity: 0; } }
        @keyframes kb-pedal { to { transform: rotate(360deg); } }
        .kb-road  { animation: kb-road .55s linear infinite; animation-play-state: ${run}; }
        .kb-wheel { animation: kb-spin .5s linear infinite; animation-play-state: ${run}; }
        .kb-bob   { animation: kb-bob .5s ease-in-out infinite; animation-play-state: ${run}; }
        .kb-wind  { animation: kb-wind 1s linear infinite; animation-play-state: ${run}; }
        .kb-pedal { animation: kb-pedal .5s linear infinite; animation-play-state: ${run}; }
        @media (prefers-reduced-motion: reduce) { .kb-road,.kb-wheel,.kb-bob,.kb-wind,.kb-pedal { animation: none; } }
      `}</style>
      <defs>
        <linearGradient id="kb-warm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF8A3D" /><stop offset="1" stopColor="#F0506E" />
        </linearGradient>
      </defs>

      {/* road */}
      <line x1="0" y1="72" x2="220" y2="72" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
      <line className="kb-road" x1="0" y1="78" x2="220" y2="78" stroke="rgba(255,255,255,0.28)" strokeWidth="2" strokeDasharray="14 14" />

      {/* speed lines */}
      <g stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round">
        <line className="kb-wind" x1="40" y1="30" x2="58" y2="30" />
        <line className="kb-wind" style={{ animationDelay: '.35s' }} x1="30" y1="46" x2="52" y2="46" />
        <line className="kb-wind" style={{ animationDelay: '.7s' }} x1="46" y1="58" x2="62" y2="58" />
      </g>

      <g className="kb-bob">
        {/* parcel on the back */}
        <path d="M60 47H106 M76 47L90 56" fill="none" stroke="#F6F3F1" strokeWidth="3" strokeLinecap="round" />
        <rect x="64" y="26" width="28" height="21" rx="4" fill="url(#kb-warm)" />
        <path d="M64 35h28" stroke="rgba(26,11,5,0.45)" strokeWidth="2" />
        <path d="M78 26v9" stroke="rgba(26,11,5,0.45)" strokeWidth="2" />

        {/* frame */}
        <path d="M92 62 L112 38 L146 38 L158 62 M112 38 L104 62 M112 38 L118 28" fill="none" stroke="#F6F3F1" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        {/* handlebar */}
        <path d="M146 38 L150 26 L160 25" fill="none" stroke="#F6F3F1" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        {/* seat */}
        <path d="M104 33h18" stroke="#F6F3F1" strokeWidth="4" strokeLinecap="round" />

        {/* rider */}
        <circle cx="124" cy="8" r="6.5" fill="#FF9A4D" />
        <path d="M119 3.5c2-3.2 8-3.4 10.5.4" fill="none" stroke="#8B5CF6" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M118 14 L112 31" stroke="#8B5CF6" strokeWidth="7" strokeLinecap="round" />
        <path d="M118 16 L146 24 L156 25" fill="none" stroke="#8B5CF6" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M112 32 L126 42 L120 56" fill="none" stroke="#FF9A4D" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* pedals */}
      <g className="kb-pedal" style={{ transformOrigin: '118px 62px', transformBox: 'view-box' }}>
        <line x1="118" y1="62" x2="118" y2="70" stroke="#F6F3F1" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* wheels: rear, front */}
      {[92, 158].map(cx => (
        <g key={cx}>
          <circle cx={cx} cy="62" r="13" fill="none" stroke="#F6F3F1" strokeWidth="3.4" />
          <g className="kb-wheel" style={{ transformOrigin: `${cx}px 62px`, transformBox: 'view-box' }}>
            <line x1={cx} y1="50" x2={cx} y2="74" stroke="rgba(246,243,241,0.7)" strokeWidth="1.6" />
            <line x1={cx - 12} y1="62" x2={cx + 12} y2="62" stroke="rgba(246,243,241,0.7)" strokeWidth="1.6" />
            <line x1={cx - 8.5} y1="53.5" x2={cx + 8.5} y2="70.5" stroke="rgba(246,243,241,0.5)" strokeWidth="1.4" />
            <line x1={cx - 8.5} y1="70.5" x2={cx + 8.5} y2="53.5" stroke="rgba(246,243,241,0.5)" strokeWidth="1.4" />
          </g>
          <circle cx={cx} cy="62" r="2.6" fill="#FF8A3D" />
        </g>
      ))}
    </svg>
  )
}
