import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Format a Naira amount: ₦1,500 */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Format a relative time: "2 mins ago" */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)   return 'just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

/** Truncate text with ellipsis */
export function truncate(text: string, len: number): string {
  return text.length <= len ? text : text.slice(0, len) + '…'
}

/** Get initials from a display name */
export function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

/** Nigerian phone: 08012345678 → +2348012345678 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('234')) return `+${digits}`
  if (digits.startsWith('0'))   return `+234${digits.slice(1)}`
  return `+234${digits}`
}

/** Product categories used throughout the app */
export const PRODUCT_CATEGORIES = [
  'Fashion & Clothing',
  'Electronics',
  'Phones & Accessories',
  'Food & Groceries',
  'Beauty & Skincare',
  'Furniture & Home',
  'Vehicles & Parts',
  'Building Materials',
  'Books & Education',
  'Sports & Fitness',
  'Baby & Kids',
  'Health & Medical',
  'Agriculture',
  'Services',
  'Other',
] as const

export type ProductCategory = typeof PRODUCT_CATEGORIES[number]

/** Verification & ad pricing tiers */
export const SUBSCRIPTION_TIERS = [
  { id: 'daily',     label: 'Daily',     days: 1,   price_ngn: 200   },
  { id: 'weekly',    label: 'Weekly',    days: 7,   price_ngn: 1000  },
  { id: 'monthly',   label: 'Monthly',   days: 30,  price_ngn: 3000  },
  { id: 'quarterly', label: 'Quarterly', days: 90,  price_ngn: 6000  },
  { id: 'yearly',    label: 'Yearly',    days: 365, price_ngn: 20000 },
] as const

/** Max wallet transaction cap (₦100,000) */
export const MAX_WALLET_TX_NGN = 100_000

/** Convert kobo to Naira */
export function toNaira(kobo: number): number {
  return kobo / 100
}
