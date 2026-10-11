/**
 * Biometric auth via WebAuthn (Web Authentication API)
 * Supports: Face ID, Touch ID, Windows Hello, Android fingerprint
 * Falls back gracefully on unsupported browsers.
 */

export type BiometricType = 'face' | 'fingerprint' | 'platform' | 'none'

/** Check what biometric is available on this device */
export async function detectBiometricType(): Promise<BiometricType> {
  if (!window.PublicKeyCredential) return 'none'
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    if (!available) return 'none'
    // Detect likely type from user agent
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|mac/.test(ua)) return 'face' // Face ID on newer iPhones, Touch ID on Mac/older
    if (/android/.test(ua)) return 'fingerprint'
    return 'platform' // Windows Hello, etc.
  } catch {
    return 'none'
  }
}

/** Register a passkey for the current user (call once after first login) */
export async function registerBiometric(userId: string, displayName: string): Promise<boolean> {
  if (!window.PublicKeyCredential) return false
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Kasaja', id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(userId),
          name: displayName,
          displayName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'required',
        },
        timeout: 60000,
      },
    })
    if (!credential) return false
    // Store credential ID locally (in production: send to server for verification)
    const credId = btoa(String.fromCharCode(...new Uint8Array((credential as PublicKeyCredential).rawId)))
    localStorage.setItem(`kasaja_passkey_${userId}`, credId)
    localStorage.setItem('kasaja_biometric_user_id', userId)
    return true
  } catch (err) {
    console.error('Biometric registration failed:', err)
    return false
  }
}

/** Authenticate with biometric — returns true if verified */
export async function authenticateWithBiometric(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false
  const userId = localStorage.getItem('kasaja_biometric_user_id')
  if (!userId) return false
  const credIdB64 = localStorage.getItem(`kasaja_passkey_${userId}`)
  if (!credIdB64) return false
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const credId = Uint8Array.from(atob(credIdB64), c => c.charCodeAt(0))
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: 'public-key', id: credId }],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return !!assertion
  } catch (err) {
    console.error('Biometric auth failed:', err)
    return false
  }
}

/** Check if this device has a registered passkey */
export function hasBiometricRegistered(): boolean {
  const userId = localStorage.getItem('kasaja_biometric_user_id')
  if (!userId) return false
  return !!localStorage.getItem(`kasaja_passkey_${userId}`)
}

/** Remove biometric registration from this device */
export function removeBiometric(): void {
  const userId = localStorage.getItem('kasaja_biometric_user_id')
  if (userId) localStorage.removeItem(`kasaja_passkey_${userId}`)
  localStorage.removeItem('kasaja_biometric_user_id')
}

// ─── PIN / Password ───────────────────────────────────────────────────────────

/** Hash a PIN with SHA-256 before storing */
async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + 'kasaja_salt_v1'))
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

/** Set a 4-6 digit PIN for quick login */
export async function setPin(userId: string, pin: string): Promise<void> {
  const hash = await hashPin(pin)
  localStorage.setItem(`kasaja_pin_${userId}`, hash)
  localStorage.setItem('kasaja_pin_user_id', userId)
}

/** Verify PIN — returns true if correct */
export async function verifyPin(pin: string): Promise<boolean> {
  const userId = localStorage.getItem('kasaja_pin_user_id')
  if (!userId) return false
  const stored = localStorage.getItem(`kasaja_pin_${userId}`)
  if (!stored) return false
  const hash = await hashPin(pin)
  return hash === stored
}

/** Check if a PIN has been set on this device */
export function hasPinSet(): boolean {
  const userId = localStorage.getItem('kasaja_pin_user_id')
  if (!userId) return false
  return !!localStorage.getItem(`kasaja_pin_${userId}`)
}

/** Remove PIN from this device */
export function removePin(): void {
  const userId = localStorage.getItem('kasaja_pin_user_id')
  if (userId) localStorage.removeItem(`kasaja_pin_${userId}`)
  localStorage.removeItem('kasaja_pin_user_id')
}
