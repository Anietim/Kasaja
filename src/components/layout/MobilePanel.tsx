import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { OrderOnTheWayButton, FlashDealsButton, TopGroups } from '@/components/layout/RightPanel'
import WhoToFollow from '@/components/home/WhoToFollow'

/**
 * Phone + tablet version of the computer right panel: order tracker, flash deals,
 * top market groups and who to follow. Opens from the button in the top bar,
 * so the home page itself stays all about products.
 */
export default function MobilePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation()
  useEffect(() => { onClose() }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[22rem] max-w-[92vw] flex flex-col"
            style={{ background: 'var(--k-bg)', borderLeft: '1px solid var(--k-line)' }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <span className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--k-text)' }}>Discover</span>
              <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--k-surface2)', color: 'var(--k-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-8 space-y-6">
              <div className="space-y-3">
                <OrderOnTheWayButton />
                <FlashDealsButton />
              </div>
              <TopGroups />
              <WhoToFollow />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
