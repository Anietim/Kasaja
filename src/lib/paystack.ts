/**
 * Paystack inline checkout helper.
 * Replace VITE_PAYSTACK_PUBLIC_KEY in .env with your real test/live key.
 */

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: PaystackConfig) => { openIframe: () => void }
    }
  }
}

export interface PaystackConfig {
  key: string
  email: string
  amount: number          // kobo (₦1 = 100 kobo)
  currency?: string
  ref?: string
  metadata?: Record<string, unknown>
  callback: (response: { reference: string }) => void
  onClose: () => void
}

let scriptLoaded = false

export function loadPaystackScript(): Promise<void> {
  if (scriptLoaded || typeof window.PaystackPop !== 'undefined') {
    scriptLoaded = true
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    script.onload  = () => { scriptLoaded = true; resolve() }
    script.onerror = () => reject(new Error('Failed to load Paystack script'))
    document.head.appendChild(script)
  })
}

export async function openPaystackCheckout(config: Omit<PaystackConfig, 'key'>): Promise<void> {
  await loadPaystackScript()
  const pk = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string
  if (!pk || pk === 'pk_test_placeholder') {
    console.warn('KASAJA: Add your Paystack public key to VITE_PAYSTACK_PUBLIC_KEY in .env')
  }
  const handler = window.PaystackPop.setup({ key: pk || 'pk_test_placeholder', ...config })
  handler.openIframe()
}

/** Generate a unique payment reference */
export function generateRef(prefix = 'KASAJA'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

/** Convert Naira to kobo */
export function toKobo(naira: number): number {
  return Math.round(naira * 100)
}

/** Convert kobo to Naira */
export function toNaira(kobo: number): number {
  return kobo / 100
}

/** Format Naira for display */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
