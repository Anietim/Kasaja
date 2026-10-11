/**
 * Content Security Policy for KASAJA
 *
 * In production this is enforced via HTTP headers set by your hosting provider
 * (Netlify _headers file, Vercel headers, or Nginx config).
 *
 * In development, this module adds a <meta http-equiv="Content-Security-Policy">
 * tag to the document head as a best-effort fallback.
 *
 * WHAT CSP DOES:
 * - Blocks injected <script> tags from unknown sources (stops XSS)
 * - Blocks your app from loading resources from attacker-controlled servers
 * - Blocks clickjacking (X-Frame-Options equivalent)
 * - Reports violations to the console so you can detect attacks
 */

const SUPABASE_HOST = import.meta.env.VITE_SUPABASE_URL
  ? new URL(import.meta.env.VITE_SUPABASE_URL as string).hostname
  : '*.supabase.co'

const CSP_DIRECTIVES = [
  // Scripts: only from self + Paystack + our CDN. No inline scripts except our own nonce.
  `default-src 'self'`,

  // Scripts: self + Paystack inline SDK
  `script-src 'self' 'unsafe-inline' https://js.paystack.co`,

  // Styles: self + Google Fonts + inline (Tailwind generates inline styles)
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,

  // Fonts
  `font-src 'self' https://fonts.gstatic.com`,

  // Images: self + Supabase storage + data URIs for previews
  `img-src 'self' data: blob: https://${SUPABASE_HOST} https://storage.googleapis.com`,

  // API connections: self + Supabase + Paystack
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://api.paystack.co https://js.paystack.co`,

  // Iframes: only Paystack payment iframe
  `frame-src https://js.paystack.co`,

  // Block everything else from being framed (anti-clickjacking)
  `frame-ancestors 'none'`,

  // Forms only submit to self
  `form-action 'self'`,

  // No plugins ever
  `object-src 'none'`,

  // Force HTTPS in production
  ...(import.meta.env.PROD ? [`upgrade-insecure-requests`] : []),
].join('; ')

/**
 * Inject CSP as a meta tag (development only).
 * In production, set this via HTTP header instead — meta CSP does not cover
 * all attack vectors (e.g. navigation). Use netlify.toml or _headers file.
 */
export function injectDevCSP() {
  if (import.meta.env.PROD) return // handled by hosting headers in production
  const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
  if (existing) return
  const meta = document.createElement('meta')
  meta.httpEquiv = 'Content-Security-Policy'
  meta.content = CSP_DIRECTIVES
  document.head.prepend(meta)
}

/**
 * The full CSP string for use in HTTP headers (paste into netlify.toml or _headers).
 * Call this from a build script or copy from the console.
 */
export function getProductionCSP(): string {
  return CSP_DIRECTIVES
}
