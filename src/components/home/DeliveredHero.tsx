import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

/**
 * The "receipt moment". Shown at the top of the Receipt page once the buyer
 * has confirmed delivery. `onChain` is true when arc_tx_hash exists.
 */
export default function DeliveredHero({ productTitle, onChain }: { productTitle: string; onChain: boolean }) {
  return (
    <div className="relative text-center pt-8 pb-6 px-4 print:hidden">
      <div
        aria-hidden
        className="absolute left-1/2 top-4 -translate-x-1/2 w-[420px] h-[420px] pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(16,185,129,0.22), rgba(99,102,241,0.12) 60%, transparent)' }}
      />
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="relative inline-flex w-[88px] h-[88px] rounded-full items-center justify-center"
        style={{ background: 'rgba(16,185,129,0.16)', border: '1px solid rgba(16,185,129,0.5)', boxShadow: '0 0 60px rgba(16,185,129,0.35)' }}
      >
        <Check size={40} strokeWidth={2.6} color="#10B981" />
      </motion.span>
      <h2 className="relative text-[32px] leading-[1.05] font-extrabold tracking-tight text-white mt-5">
        Delivered.<br />{onChain ? "It's on record." : 'Receipt on the way.'}
      </h2>
      <p className="relative text-[15px] mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {onChain
          ? `Your ${productTitle} arrived. This delivery now has a public receipt.`
          : `Your ${productTitle} arrived. The public receipt is being recorded.`}
      </p>
    </div>
  )
}