import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, initials } from '../../lib/utils'
import { VerifiedBadge, TrendingBadge, SecuredBadge, StarRating } from '../ui/Badge'
import type { Store } from '../../types/database'

interface Props {
  store: Store
  onFollow?: (id: string) => void
  isFollowing?: boolean
}

export default function StoreCard({ store, onFollow, isFollowing }: Props) {
  const navigate   = useNavigate()
  const isVerified = store.verified_until ? new Date(store.verified_until) > new Date() : false
  const isTrending = store.trending_score > 10
  const isSecured  = store.avg_rating >= 4.5 && store.rating_count >= 20

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => { void navigate(`/store/${store.id}`) }}
      className="flex items-center gap-3 p-4 bg-surface rounded-2xl cursor-pointer hover:bg-surface-raised transition"
    >
      {/* logo */}
      <div className={cn(
        'w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0',
        'bg-surface-overlay text-neutral-400 font-display font-bold text-lg'
      )}>
        {store.logo_url
          ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
          : initials(store.name)
        }
      </div>

      {/* details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="font-display font-semibold text-white text-sm truncate">{store.name}</h3>
          {isVerified && <VerifiedBadge />}
          {isTrending && <TrendingBadge />}
          {isSecured  && <SecuredBadge />}
        </div>
        <p className="text-neutral-400 text-xs mt-0.5">{store.category}</p>
        {store.location_text && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={11} className="text-neutral-500" />
            <span className="text-neutral-500 text-xs truncate">{store.location_text}</span>
          </div>
        )}
        {store.rating_count > 0 && (
          <div className="mt-1">
            <StarRating score={store.avg_rating} count={store.rating_count} />
          </div>
        )}
      </div>

      {/* follow */}
      <button
        onClick={e => { e.stopPropagation(); onFollow?.(store.id) }}
        className={cn(
          'px-3 py-1.5 rounded-xl text-xs font-semibold transition flex-shrink-0',
          isFollowing
            ? 'bg-surface-overlay text-neutral-300 hover:bg-surface-border'
            : 'bg-brand-500/15 text-brand-400 hover:bg-brand-500/25'
        )}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </button>
    </motion.div>
  )
}
