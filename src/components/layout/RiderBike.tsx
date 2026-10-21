/**
 * A little delivery rider on a bike, riding along a moving road.
 * Pure SVG + CSS. Colours follow the dark / light mood. Stops when `moving` is false
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
        .kb-road  { animation: kb-road .55s linear infinite; animation-play-state: ${run}; }
        .kb-wheel { animation: kb-spin .5s linear infinite; animation-play-state: ${run}; }
        .kb-bob   { animation: kb-bob .5s ease-in-out infinite; animation-play-state: ${run}; }
        .kb-wind  { animation: kb-wind 1s linear infinite; animation-play-state: ${run}; }
        .kb-frame { stroke: var(--k-text); }
        .kb-body  { stroke: var(--k-muted); }
        .kb-leg   { stroke: var(--k-accent); }
        .kb-line  { stroke: var(--k-line2); }
        @media (prefers-reduced-motion: reduce) { .kb-road,.kb-wheel,.kb-bob,.kb-wind { animation: none; } }
      `}</style>
      <defs>
        <linearGradient id="kb-warm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF8A3D" /><stop offset="1" stopColor="#F0506E" />
        </linearGradient>
      </defs>

      <line className="kb-line" x1="0" y1="72" x2="220" y2="72" strokeWidth="2" />
      <line className="kb-road kb-line" x1="0" y1="78" x2="220" y2="78" strokeWidth="2" strokeDasharray="14 14" />

      <g className="kb-line" strokeWidth="2" strokeLinecap="round">
        <line className="kb-wind" x1="40" y1="30" x2="58" y2="30" />
        <line className="kb-wind" style={{ animationDelay: '.35s' }} x1="30" y1="46" x2="52" y2="46" />
        <line className="kb-wind" style={{ animationDelay: '.7s' }} x1="46" y1="58" x2="62" y2="58" />
      </g>

      <g className="kb-bob">
        <path className="kb-frame" d="M60 47H106 M76 47L90 56" fill="none" strokeWidth="3" strokeLinecap="round" />
        <rect x="64" y="26" width="28" height="21" rx="4" fill="url(#kb-warm)" />
        <path d="M64 35h28 M78 26v9" stroke="rgba(26,11,5,0.45)" strokeWidth="2" />
        <path className="kb-frame" d="M92 62L112 38H146L158 62M112 38L104 62M112 38L118 28" fill="none" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <path className="kb-frame" d="M146 38L150 26L160 25" fill="none" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <path className="kb-frame" d="M104 33h18" strokeWidth="4" strokeLinecap="round" />
        <circle cx="124" cy="8" r="6.5" fill="#FF9A4D" />
        <path className="kb-body" d="M119 3.5c2-3.2 8-3.4 10.5.4" fill="none" strokeWidth="3.4" strokeLinecap="round" />
        <path className="kb-body" d="M118 14L112 31" strokeWidth="7" strokeLinecap="round" />
        <path className="kb-body" d="M118 16L146 24L156 25" fill="none" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
        <path className="kb-leg" d="M112 32L126 42L120 56" fill="none" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {[92, 158].map(cx => (
        <g key={cx}>
          <circle className="kb-frame" cx={cx} cy="62" r="13" fill="none" strokeWidth="3.4" />
          <g className="kb-wheel" style={{ transformOrigin: `${cx}px 62px`, transformBox: 'view-box' }}>
            <path className="kb-frame" d={`M${cx} 50v24M${cx - 12} 62h24M${cx - 8.5} 53.5l17 17M${cx - 8.5} 70.5l17-17`} strokeWidth="1.4" opacity=".55" />
          </g>
          <circle cx={cx} cy="62" r="2.6" style={{ fill: 'var(--k-accent)' }} />
        </g>
      ))}
    </svg>
  )
}
