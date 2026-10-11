/**
 * KASAJA — TypeScript type definitions
 * These mirror the schema in src/lib/schema.sql
 */

export type UserRole = 'buyer' | 'seller' | 'rider'
export type OrderStatus = 'pending' | 'paid' | 'completed' | 'refunded' | 'disputed' | 'cancelled'
export type PaymentRoute = 'kaja_escrow' | 'direct_bank'
export type DeliveryStatus = 'open' | 'counter_offered' | 'agreed' | 'locked' | 'in_transit' | 'completed' | 'cancelled'
export type BidStatus = 'pending' | 'accepted' | 'declined'
export type MessageType = 'text' | 'image' | 'video' | 'file' | 'offer' | 'call_incoming' | 'call_summary'
export type PriceType = 'fixed' | 'negotiable'
export type GroupRole = 'buyer' | 'seller'
export type GroupTier = 'daily' | 'weekly' | 'monthly'
export type SubscriptionType = 'verified' | 'ad'

export interface Profile {
  id: string
  roles: UserRole[]
  interest_categories: string[]
  display_name: string
  phone: string | null
  avatar_url: string | null
  bio: string | null
  location_text: string | null
  delivery_address_text: string | null
  delivery_lat: number | null
  delivery_lng: number | null
  messaging_banned: boolean
  status: 'active' | 'suspended' | 'banned'
  created_at: string
}

export interface Store {
  id: string
  owner_id: string
  name: string
  description: string | null
  category: string
  logo_url: string | null
  banner_url: string | null
  location_text: string | null
  location_lat: number | null
  location_lng: number | null
  verified_until: string | null
  ad_active_until: string | null
  avg_rating: number
  rating_count: number
  trending_score: number
  accepts_refunds: boolean
  refund_window_days: number
  refund_policy_text: string | null
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  store_id: string
  name: string
  description: string | null
  base_price_ngn: number
  price_type: PriceType
  media_urls: string[]
  location_text: string | null
  is_available: boolean
  created_at: string
  // joins
  store?: Store
  variants?: ProductVariant[]
  like_count?: number
  comment_count?: number
  user_liked?: boolean
  user_wishlisted?: boolean
}

export interface ProductVariant {
  id: string
  product_id: string
  label: string
  price_ngn: number
  stock_qty: number
  is_available: boolean
}

export interface Order {
  id: string
  buyer_id: string
  store_id: string
  items: OrderItem[]
  total_ngn: number
  paystack_ref: string | null
  status: OrderStatus
  payment_route: PaymentRoute
  escrow_opted_in: boolean
  created_at: string
  // joins
  store?: Store
  buyer?: Profile
}

export interface OrderItem {
  product_id: string
  product_name: string
  variant_id: string | null
  variant_label: string | null
  price_ngn: number
  quantity: number
}

export interface DeliveryJob {
  id: string
  order_id: string | null
  buyer_id: string
  rider_id: string | null
  buyer_offered_price_ngn: number
  agreed_price_ngn: number | null
  status: DeliveryStatus
  escrow_ref: string | null
  pickup_address_text: string
  pickup_lat: number | null
  pickup_lng: number | null
  dropoff_address_text: string
  dropoff_lat: number | null
  dropoff_lng: number | null
  expires_at: string | null
  created_at: string
  accepted_at: string | null
  confirmed_at: string | null
  // joins
  buyer?: Profile
  rider?: Profile
  bids?: DeliveryBid[]
}

export interface DeliveryBid {
  id: string
  job_id: string
  rider_id: string
  proposed_amount_ngn: number
  status: BidStatus
  created_at: string
  rider?: Profile
}

export interface RiderLocation {
  rider_id: string
  lat: number
  lng: number
  is_online: boolean
  updated_at: string
  rider?: Profile
}

export interface Conversation {
  id: string
  participant_ids: string[]
  order_id: string | null
  source: 'direct' | 'group_reply' | 'post_purchase'
  created_at: string
  deleted_at_by: Record<string, string>
  // joins
  other_participant?: Profile
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  type: MessageType
  content: string | null
  media_urls: string[]
  offer_amount_ngn: number | null
  sent_at: string
  deleted_by: string[]
  sender?: Profile
}

export interface NigerianState {
  id: string
  name: string
}

export interface Market {
  id: string
  state_id: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  is_active: boolean
  state?: NigerianState
  store_count?: number
}

export interface Group {
  id: string
  name: string
  type: 'market' | 'category' | 'city'
  market_id: string | null
  description: string | null
  cover_image_url: string | null
  daily_price_ngn: number
  weekly_price_ngn: number
  monthly_price_ngn: number
  is_active: boolean
  market?: Market
  member_count?: number
  user_subscription?: GroupSubscription | null
}

export interface GroupSubscription {
  id: string
  user_id: string
  group_id: string
  tier: GroupTier
  paystack_ref: string | null
  amount_ngn: number
  subscribed_at: string
  expires_at: string
}

export interface GroupPost {
  id: string
  group_id: string
  poster_id: string
  description: string
  media_urls: string[]
  created_at: string
  deleted_at: string | null
  poster?: Profile
  replies?: GroupReply[]
  reply_count?: number
}

export interface GroupReply {
  id: string
  post_id: string
  seller_id: string
  price_ngn: number
  availability: 'in_stock' | 'can_source'
  note: string | null
  media_urls: string[]
  created_at: string
  seller?: Profile
  store?: Store
}

export interface StoreRating {
  id: string
  store_id: string
  buyer_id: string
  order_id: string
  score: number
  review_text: string | null
  created_at: string
  buyer?: Profile
}

export interface WalletBalance {
  user_id: string
  withdrawable_balance_kobo: number
  flagged_balance_kobo: number
  total_balance_kobo: number
}

export interface Subscription {
  id: string
  store_id: string
  type: SubscriptionType
  tier: string
  amount_ngn: number
  paystack_ref: string | null
  active_until: string
}

// Lightweight Supabase Database type — row types only
// Insert/Update generics are not required since the Supabase client
// allows plain objects for insert/update; strict row types are used for reads.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = Record<string, any>
