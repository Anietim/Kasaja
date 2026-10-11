/**
 * KASAJA Security Library
 * Centralises all client-side security utilities.
 * Server-side enforcement (RLS, Supabase Edge Functions) is the final gate —
 * this layer provides a fast, user-facing feedback loop.
 */

import { supabase } from './supabase'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

export const TRANSACTION_PIN_THRESHOLD = 5000   // ₦5,000 — require PIN above this
export const MAX_FILE_SIZE_MB           = 5      // 5 MB max per upload
export const MAX_FILE_SIZE_BYTES        = MAX_FILE_SIZE_MB * 1024 * 1024
export const OTP_RATE_WINDOW_MS         = 60_000 // 1 minute window
export const OTP_MAX_PER_WINDOW         = 3      // max 3 OTP requests per minute
export const WITHDRAWAL_COOLDOWN_HOURS  = 24     // hours after bank account change
export const BANK_CHANGE_LOCK_KEY       = 'kasaja_bank_change_ts'
export const ACTIVITY_LOG_KEY           = 'kasaja_activity_log'
export const OTP_RATE_KEY               = 'kasaja_otp_rate'
export const PIN_STORAGE_KEY            = 'kasaja_txn_pin_hash'
export const PIN_ATTEMPTS_KEY           = 'kasaja_pin_attempts'
export const PIN_LOCKOUT_KEY            = 'kasaja_pin_lockout_until'
export const MAX_PIN_ATTEMPTS           = 5
export const PIN_LOCKOUT_MS             = 15 * 60 * 1000 // 15 minutes

// ─── ALLOWED FILE TYPES ───────────────────────────────────────────────────────

// Magic bytes (file signatures) for allowed image types.
// An attacker renaming evil.php to image.jpg is stopped here —
// we check the actual bytes, not just the extension or MIME header.
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg':  [[0xFF, 0xD8, 0xFF]],
  'image/png':   [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp':  [[0x52, 0x49, 0x46, 0x46]], // RIFF....WEBP
  'image/gif':   [[0x47, 0x49, 0x46, 0x38]],
  'image/heic':  [[0x00, 0x00, 0x00]], // HEIC is complex — allow by MIME only
  'image/heif':  [[0x00, 0x00, 0x00]],
}
const ALLOWED_MIME_TYPES = Object.keys(MAGIC_BYTES)

export interface FileValidationResult {
  ok: boolean
  error?: string
}

/**
 * Validates a file before upload.
 * Checks: MIME type, magic bytes, file size.
 * Prevents: disguised executables, oversized uploads, non-image content.
 */
export async function validateImageFile(file: File): Promise<FileValidationResult> {
  // 1. MIME type whitelist
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { ok: false, error: `File type "${file.type}" is not allowed. Only JPEG, PNG, WebP, GIF, and HEIC images are accepted.` }
  }

  // 2. File size limit
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.` }
  }

  // 3. Magic bytes check — read first 12 bytes and verify signature
  try {
    const header = await readFileHeader(file, 12)
    const signatures = MAGIC_BYTES[file.type]
    if (!signatures) return { ok: false, error: 'Unsupported file type.' }

    // HEIC/HEIF are complex containers — skip magic byte check, rely on MIME
    if (file.type === 'image/heic' || file.type === 'image/heif') {
      return { ok: true }
    }

    const matches = signatures.some(sig =>
      sig.every((byte, i) => header[i] === byte)
    )

    if (!matches) {
      return {
        ok: false,
        error: 'File content does not match its extension. This file may be disguised as an image.'
      }
    }

    // 4. Extra check for WebP: bytes 8-11 must spell "WEBP"
    if (file.type === 'image/webp') {
      const webp = [0x57, 0x45, 0x42, 0x50]
      const isWebp = webp.every((byte, i) => header[8 + i] === byte)
      if (!isWebp) {
        return { ok: false, error: 'Invalid WebP file.' }
      }
    }
  } catch {
    return { ok: false, error: 'Could not read file. Please try again.' }
  }

  return { ok: true }
}

/** Reads the first `bytes` bytes of a File as a Uint8Array. */
function readFileHeader(file: File, bytes: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(e.target.result))
      } else {
        reject(new Error('Could not read file'))
      }
    }
    reader.onerror = () => reject(new Error('FileReader error'))
    reader.readAsArrayBuffer(file.slice(0, bytes))
  })
}

// ─── INPUT SANITISATION ───────────────────────────────────────────────────────

/**
 * Strips HTML tags and dangerous characters from user-submitted text.
 * Use on ALL text inputs before saving to Supabase.
 */
export function sanitiseText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')          // strip HTML tags
    .replace(/javascript:/gi, '')      // remove JS protocol
    .replace(/on\w+\s*=/gi, '')       // remove event handlers
    .replace(/[<>"'`]/g, c => ({      // encode remaining dangerous chars
      '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#x27;', '`': '&#x60;'
    }[c] ?? c))
    .trim()
    .slice(0, 5000)                    // hard cap — no textarea bomb
}

/** Sanitises a phone number — digits only, optional leading +. */
export function sanitisePhone(input: string): string {
  return input.replace(/[^\d+]/g, '').slice(0, 15)
}

/** Sanitises a Nigerian bank account number — 10 digits only. */
export function sanitiseBankAccount(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10)
}

/** Validates a Nigerian bank account number. */
export function isValidBankAccount(input: string): boolean {
  return /^\d{10}$/.test(input)
}

// ─── OTP RATE LIMITING ────────────────────────────────────────────────────────

interface OtpRateRecord {
  count: number
  windowStart: number
}

/**
 * Client-side OTP rate limiter.
 * Returns true if the request is allowed, false if rate-limited.
 * Server-side Supabase rate limits are the real gate — this prevents
 * accidental UI double-taps and gives instant user feedback.
 */
export function checkOtpRateLimit(): { allowed: boolean; waitSeconds?: number } {
  const raw = localStorage.getItem(OTP_RATE_KEY)
  const now = Date.now()

  let record: OtpRateRecord = raw
    ? (JSON.parse(raw) as OtpRateRecord)
    : { count: 0, windowStart: now }

  // Reset window if expired
  if (now - record.windowStart > OTP_RATE_WINDOW_MS) {
    record = { count: 0, windowStart: now }
  }

  if (record.count >= OTP_MAX_PER_WINDOW) {
    const waitMs = OTP_RATE_WINDOW_MS - (now - record.windowStart)
    return { allowed: false, waitSeconds: Math.ceil(waitMs / 1000) }
  }

  record.count++
  localStorage.setItem(OTP_RATE_KEY, JSON.stringify(record))
  return { allowed: true }
}

/** Resets the OTP rate counter (call on successful login). */
export function resetOtpRateLimit(): void {
  localStorage.removeItem(OTP_RATE_KEY)
}

// ─── TRANSACTION PIN ──────────────────────────────────────────────────────────

/** Simple hash — PIN is never stored in plain text. */
async function hashPin(pin: string): Promise<string> {
  const salt = 'kasaja-txn-pin-v1'
  const data = new TextEncoder().encode(pin + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function setTransactionPin(pin: string): Promise<void> {
  const hash = await hashPin(pin)
  localStorage.setItem(PIN_STORAGE_KEY, hash)
  localStorage.removeItem(PIN_ATTEMPTS_KEY)
  localStorage.removeItem(PIN_LOCKOUT_KEY)
}

export function hasTransactionPin(): boolean {
  return !!localStorage.getItem(PIN_STORAGE_KEY)
}

export async function verifyTransactionPin(pin: string): Promise<boolean> {
  // Check lockout
  const lockoutUntil = localStorage.getItem(PIN_LOCKOUT_KEY)
  if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
    return false
  }

  const stored = localStorage.getItem(PIN_STORAGE_KEY)
  if (!stored) return true // no PIN set — allow through

  const hash = await hashPin(pin)
  const correct = hash === stored

  if (!correct) {
    const attempts = parseInt(localStorage.getItem(PIN_ATTEMPTS_KEY) ?? '0') + 1
    localStorage.setItem(PIN_ATTEMPTS_KEY, String(attempts))
    if (attempts >= MAX_PIN_ATTEMPTS) {
      localStorage.setItem(PIN_LOCKOUT_KEY, String(Date.now() + PIN_LOCKOUT_MS))
      localStorage.removeItem(PIN_ATTEMPTS_KEY)
    }
  } else {
    localStorage.removeItem(PIN_ATTEMPTS_KEY)
    localStorage.removeItem(PIN_LOCKOUT_KEY)
  }

  return correct
}

export function getPinLockoutInfo(): { locked: boolean; secondsLeft?: number } {
  const lockoutUntil = localStorage.getItem(PIN_LOCKOUT_KEY)
  if (!lockoutUntil) return { locked: false }
  const remaining = parseInt(lockoutUntil) - Date.now()
  if (remaining <= 0) {
    localStorage.removeItem(PIN_LOCKOUT_KEY)
    return { locked: false }
  }
  return { locked: true, secondsLeft: Math.ceil(remaining / 1000) }
}

export function getPinAttemptsLeft(): number {
  const attempts = parseInt(localStorage.getItem(PIN_ATTEMPTS_KEY) ?? '0')
  return Math.max(0, MAX_PIN_ATTEMPTS - attempts)
}

// ─── WITHDRAWAL COOLDOWN ──────────────────────────────────────────────────────

/** Call this whenever a user changes their bank account. */
export function recordBankAccountChange(): void {
  localStorage.setItem(BANK_CHANGE_LOCK_KEY, String(Date.now()))
}

/** Returns true if the user can withdraw (no recent bank account change). */
export function canWithdraw(): { allowed: boolean; hoursLeft?: number } {
  const changedAt = localStorage.getItem(BANK_CHANGE_LOCK_KEY)
  if (!changedAt) return { allowed: true }
  const elapsed = Date.now() - parseInt(changedAt)
  const cooldownMs = WITHDRAWAL_COOLDOWN_HOURS * 60 * 60 * 1000
  if (elapsed >= cooldownMs) return { allowed: true }
  const msLeft = cooldownMs - elapsed
  return { allowed: false, hoursLeft: Math.ceil(msLeft / (60 * 60 * 1000)) }
}

// ─── ACCOUNT ACTIVITY LOG ─────────────────────────────────────────────────────

export type ActivityEventType =
  | 'login'
  | 'logout'
  | 'pin_set'
  | 'pin_failed'
  | 'biometric_registered'
  | 'biometric_login'
  | 'bank_account_added'
  | 'bank_account_changed'
  | 'withdrawal_requested'
  | 'password_changed'
  | 'email_changed'
  | 'profile_updated'
  | 'otp_sent'
  | 'suspicious_login'

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  label: string
  device: string
  browser: string
  timestamp: number
  ip?: string
  suspicious?: boolean
}

function getDeviceInfo(): { device: string; browser: string } {
  const ua = navigator.userAgent
  let device = 'Unknown device'
  let browser = 'Unknown browser'

  if (/iPhone/.test(ua)) device = 'iPhone'
  else if (/iPad/.test(ua)) device = 'iPad'
  else if (/Android/.test(ua)) {
    const m = ua.match(/Android[^;]*;\s*([^)]+)/)
    device = m ? m[1].trim() : 'Android device'
  } else if (/Windows/.test(ua)) device = 'Windows PC'
  else if (/Mac/.test(ua)) device = 'Mac'
  else if (/Linux/.test(ua)) device = 'Linux PC'

  if (/Chrome/.test(ua) && !/Chromium|Edge/.test(ua)) browser = 'Chrome'
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari'
  else if (/Firefox/.test(ua)) browser = 'Firefox'
  else if (/Edge/.test(ua)) browser = 'Edge'
  else if (/Opera|OPR/.test(ua)) browser = 'Opera'

  return { device, browser }
}

const EVENT_LABELS: Record<ActivityEventType, string> = {
  login:                'Signed in',
  logout:               'Signed out',
  pin_set:              'Transaction PIN set',
  pin_failed:           'Wrong PIN entered',
  biometric_registered: 'Biometric login registered',
  biometric_login:      'Signed in with biometrics',
  bank_account_added:   'Bank account added',
  bank_account_changed: 'Bank account changed',
  withdrawal_requested: 'Withdrawal requested',
  password_changed:     'Password changed',
  email_changed:        'Email address changed',
  profile_updated:      'Profile updated',
  otp_sent:             'OTP sent',
  suspicious_login:     '⚠️ Suspicious login detected',
}

export function logActivity(type: ActivityEventType, extra?: Partial<ActivityEvent>): void {
  const { device, browser } = getDeviceInfo()
  const event: ActivityEvent = {
    id: crypto.randomUUID(),
    type,
    label: EVENT_LABELS[type],
    device,
    browser,
    timestamp: Date.now(),
    suspicious: type === 'suspicious_login' || type === 'pin_failed',
    ...extra,
  }

  const raw = localStorage.getItem(ACTIVITY_LOG_KEY)
  const log: ActivityEvent[] = raw ? (JSON.parse(raw) as ActivityEvent[]) : []
  log.unshift(event)
  // Keep last 100 events
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(log.slice(0, 100)))

  // Also persist to Supabase (best effort — don't await)
  void supabase.from('account_activity').insert({
    type: event.type,
    label: event.label,
    device: event.device,
    browser: event.browser,
    suspicious: event.suspicious ?? false,
  }).then(() => {})
}

export function getActivityLog(): ActivityEvent[] {
  const raw = localStorage.getItem(ACTIVITY_LOG_KEY)
  return raw ? (JSON.parse(raw) as ActivityEvent[]) : []
}

export function clearActivityLog(): void {
  localStorage.removeItem(ACTIVITY_LOG_KEY)
}
