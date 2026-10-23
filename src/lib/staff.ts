export const ADMIN_ROLES = ['admin', 'investigation_admin', 'super_admin']
export const isStaff = (roles?: string[] | null) => (roles ?? []).some(r => ADMIN_ROLES.includes(r))

/** Staff accounts moderate the platform. They never buy, sell, post, ride or request. */
export const STAFF_BLOCKED = [
  '/post-story', '/live', '/sell', '/sell/product', '/cart', '/checkout', '/orders',
  '/request-rider', '/request-delivery', '/delivery/new', '/delivery/radar', '/rider', '/rider/jobs',
  '/wallet', '/wallet/rider', '/store/dashboard', '/find-rider', '/seller-verification', '/rider-verification', '/verify-id', '/referral',
]
export const SUPER_ONLY = ['/admin/staff', '/admin/audit']
export const staffBlocked = (path: string) => STAFF_BLOCKED.some(p => path === p || path.startsWith(p + '/'))
