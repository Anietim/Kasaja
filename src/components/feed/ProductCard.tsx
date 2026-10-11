import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, MapPin, ShoppingCart } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatNaira } from '../../lib/utils'
import { VerifiedBadge, TrendingBadge } from '../ui/Badge'
import type { Product } from '../../types/database'

interface Props {
  product: Product
  onLike?: (id: string) => void
  onCart?: (product: Product) => void
}

export default function ProductCard({ product, onLike, onCart }: Props) {
  const navigate  = useNavigate()
  const [liked, setLiked] = useState(product.user_liked ?? false)
  const [likeCount, setLikeCount] = useState(product.like_count ?? 0)
  const thumb = product.media_urls?.[0]

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation()
    setLiked(!liked)
    setLikeCount(c => liked ? c - 1 : c + 1)
    onLike?.(product.id)
  }

  function handleCart(e: React.MouseEvent) {
    e.stopPropagation()
    onCart?.(product)
  }

  const isVerified = product.store?.verified_until
    ? new Date(product.store.verified_until) > new Date()
    : false
  const isTrending = (product.store?.trending_score ?? 0) > 10

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { void navigate(`/product/${product.id}`) }}
      className="bg-surface rounded-2xl overflow-hidden cursor-pointer hover:bg-surface-raised transition"
    >
      {/* image */}
      <div className="relative aspect-square bg-surface-overlay">
        {thumb ? (
          <img src={thumb} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart size={32} className="text-neutral-600" />
          </div>
        )}
        {/* price tag */}
        <div className="absolute bottom-2 left-2">
          <span className={cn(
            'px-2 py-1 rounded-lg text-xs font-semibold font-mono',
            product.price_type === 'negotiable'
              ? 'bg-brand-500/90 text-white'
              : 'bg-canvas/90 text-white backdrop-blur-sm'
          )}>
            {product.price_type === 'negotiable'
              ? `From ${formatNaira(product.base_price_ngn)}`
              : formatNaira(product.base_price_ngn)}
          </span>
        </div>
        {/* wishlist heart */}
        <button
          onClick={handleLike}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-canvas/70 backdrop-blur-sm
            flex items-center justify-center transition hover:scale-110 active:scale-95"
        >
          <Heart
            size={16}
            className={cn('transition', liked ? 'fill-red-500 text-red-500' : 'text-white')}
          />
        </button>
      </div>

      {/* info */}
      <div className="p-3">
        <div className="flex items-start gap-1 mb-1">
          <h3 className="font-body font-medium text-white text-sm line-clamp-2 flex-1">{product.name}</h3>
        </div>

        {/* store + badges */}
        {product.store && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className="text-neutral-400 text-xs truncate max-w-[120px]">{product.store.name}</span>
            {isVerified && <VerifiedBadge />}
            {isTrending && <TrendingBadge />}
          </div>
        )}

        {/* location */}
        {product.location_text && (
          <div className="flex items-center gap-1 mb-2">
            <MapPin size={11} className="text-neutral-500 flex-shrink-0" />
            <span className="text-neutral-500 text-xs truncate">{product.location_text}</span>
          </div>
        )}

        {/* social + cart */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <Heart size={12} /> {likeCount}
            </span>
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <MessageCircle size={12} /> {product.comment_count ?? 0}
            </span>
          </div>
          <button
            onClick={handleCart}
            className="px-2.5 py-1.5 rounded-xl bg-brand-500/15 text-brand-400 text-xs font-semibold
              hover:bg-brand-500/25 transition flex items-center gap-1"
          >
            <ShoppingCart size={12} /> Add
          </button>
        </div>
      </div>
    </motion.div>
  )
}
