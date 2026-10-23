import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'

// Layout
import AppLayout from './components/layout/AppLayout'
import AuthGuard from './components/layout/AuthGuard'
import StaffGuard from './components/StaffGuard'

// Auth (not lazy — needed immediately)
import GroupFeed     from './pages/GroupFeed'
import QuickLogin    from './pages/QuickLogin'
import SecuritySetup from './pages/SecuritySetup'
import Settings      from './pages/Settings'
import Splash        from './pages/auth/Splash'
import Login         from './pages/Login'
import AccountType   from './pages/AccountType'
import Onboarding    from './pages/Onboarding'
import ActivityLog   from './pages/ActivityLog'
import PostStory     from './pages/PostStory'
import Referral      from './pages/Referral'
import DisputeDetail from './pages/DisputeDetail'
import LiveSell from './pages/LiveSell'
import AuthCallback  from './pages/AuthCallback'
import Interests     from './pages/auth/Interests'
import OnboardBuyer  from './pages/auth/OnboardBuyer'
import OnboardSeller from './pages/auth/OnboardSeller'
import OnboardRider  from './pages/auth/OnboardRider'

// Lazy-load all heavy pages so a single page crash doesn't kill the whole app
const Home               = lazy(() => import('./pages/Home'))
const MyOrders           = lazy(() => import('./pages/MyOrders'))
const Checkout           = lazy(() => import('./pages/Checkout'))
const Cart               = lazy(() => import('./pages/Cart'))
const StoreProfile       = lazy(() => import('./pages/StoreProfile'))
const StoreOwnerDashboard = lazy(() => import('./pages/StoreOwnerDashboard'))
const ProductDetail      = lazy(() => import('./pages/product/ProductDetail'))
const ProductForm        = lazy(() => import('./pages/ProductForm'))
const MarketBrowser      = lazy(() => import('./pages/MarketBrowser'))
const MarketPage         = lazy(() => import('./pages/markets/MarketPage'))
const Inbox              = lazy(() => import('./pages/Inbox'))
const ChatThread         = lazy(() => import('./pages/ChatThread'))
const RequestDelivery    = lazy(() => import('./pages/RequestDelivery'))
const RiderRadar         = lazy(() => import('./pages/delivery/RiderRadar'))
const RiderDashboard     = lazy(() => import('./pages/RiderDashboard'))
const RiderWallet        = lazy(() => import('./pages/rider/RiderWallet'))
const WalletPage         = lazy(() => import('./pages/Wallet'))
const GroupsDiscovery    = lazy(() => import('./pages/GroupsDiscovery'))
const Search             = lazy(() => import('./pages/Search'))
const Profile            = lazy(() => import('./pages/Profile'))
const AdminOrders        = lazy(() => import('./pages/AdminOrders'))
const AdminHome          = lazy(() => import('./pages/AdminHome'))
const AdminStaff         = lazy(() => import('./pages/AdminStaff'))
const AdminAudit         = lazy(() => import('./pages/AdminAudit'))
const AdminGroups        = lazy(() => import('./pages/AdminGroups'))
const AdminDisputes      = lazy(() => import('./pages/AdminDisputes'))
const AdminAnalytics     = lazy(() => import('./pages/AdminAnalytics'))
const AdminUsers         = lazy(() => import('./pages/AdminUsers'))
const AdminVerifications = lazy(() => import('./pages/AdminVerifications'))
const VerifyId = lazy(() => import('./pages/VerifyId'))
const AdminIdChecks = lazy(() => import('./pages/AdminIdChecks'))
const SellerVerification = lazy(() => import('./pages/SellerVerification'))
const RiderVerification  = lazy(() => import('./pages/RiderVerification'))
const DeliveryFlow       = lazy(() => import('./pages/DeliveryFlow'))
const Trending           = lazy(() => import('./pages/Trending'))
const PublicProfile      = lazy(()=> import('./pages/PublicProfile'))
const FindPeople         = lazy(() => import('./pages/FindPeople'))
const FindRider           = lazy(() => import('./pages/FindRider'))
const Receipt             = lazy(() => import('./pages/Receipt'))
const RiderJobs           = lazy(() => import('./pages/RiderJobs'))
const RequestRider        = lazy(() => import('./pages/RequestRider'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 size={28} className="animate-spin text-brand-500" />
    </div>
  )
}

function AdminOnly() {
  const { profile, loading } = useAuth()
  if (loading) return <PageLoader />
  const isAdmin = (profile?.roles ?? []).some(r => ['admin', 'investigation_admin', 'super_admin'].includes(r))
  return isAdmin ? <Outlet /> : <Navigate to="/home" replace />
}

function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-canvas flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-brand-500" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Auth flow */}
          <Route path="/"                         element={<Splash />} />
          <Route path="/login"                    element={<Login />} />
          <Route path="/onboarding"               element={<Onboarding />} />
          <Route path="/onboard/account-type"     element={<AccountType />} />
          <Route path="/onboard/interests"        element={<Interests />} />
          <Route path="/onboard/buyer"            element={<OnboardBuyer />} />
          <Route path="/onboard/seller"           element={<OnboardSeller />} />
          <Route path="/onboard/rider"            element={<OnboardRider />} />

          {/* OAuth callback — Supabase redirects here after social login */}
          <Route path="/auth/callback"            element={<AuthCallback />} />
          <Route path="/quick-login"              element={<QuickLogin />} />
          <Route path="/security-setup"           element={<SecuritySetup />} />
          <Route path="/activity-log"             element={<ActivityLog />} />
          <Route path="/post-story"               element={<StaffGuard><PostStory /></StaffGuard>} />
          <Route path="/referral"                 element={<StaffGuard><Referral /></StaffGuard>} />
          <Route path="/dispute/:id"              element={<DisputeDetail />} />
          <Route path="/live"                     element={<StaffGuard><LiveSell /></StaffGuard>} />

          {/* Main app — auth guard + shared layout */}
          <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/home"              element={<Suspense fallback={<PageLoader />}><Home /></Suspense>} />
            <Route path="/orders"            element={<StaffGuard><Suspense fallback={<PageLoader />}><MyOrders /></Suspense></StaffGuard>} />
            <Route path="/cart"              element={<StaffGuard><Suspense fallback={<PageLoader />}><Cart /></Suspense></StaffGuard>} />
            <Route path="/checkout"          element={<StaffGuard><Suspense fallback={<PageLoader />}><Checkout /></Suspense></StaffGuard>} />
            <Route path="/store/:id"         element={<Suspense fallback={<PageLoader />}><StoreProfile /></Suspense>} />
            <Route path="/product/:id"       element={<Suspense fallback={<PageLoader />}><ProductDetail /></Suspense>} />
            <Route path="/markets"           element={<Suspense fallback={<PageLoader />}><MarketBrowser /></Suspense>} />
            <Route path="/markets/:id"       element={<Suspense fallback={<PageLoader />}><MarketPage /></Suspense>} />
            <Route path="/search"            element={<Suspense fallback={<PageLoader />}><Search /></Suspense>} />
            <Route path="/trending"          element={<Suspense fallback={<PageLoader />}><Trending /></Suspense>} />
            <Route path="/groups"            element={<Suspense fallback={<PageLoader />}><GroupsDiscovery /></Suspense>} />
            <Route path="/groups/:id"        element={<GroupFeed />} />
            <Route path="/inbox"             element={<Suspense fallback={<PageLoader />}><Inbox /></Suspense>} />
            <Route path="/inbox/:id"         element={<Suspense fallback={<PageLoader />}><ChatThread /></Suspense>} />
            <Route path="/request-delivery"  element={<StaffGuard><Suspense fallback={<PageLoader />}><RequestDelivery /></Suspense></StaffGuard>} />
            <Route path="/delivery/new"      element={<StaffGuard><Suspense fallback={<PageLoader />}><RequestDelivery /></Suspense></StaffGuard>} />
            <Route path="/delivery/radar"    element={<StaffGuard><Suspense fallback={<PageLoader />}><RiderRadar /></Suspense></StaffGuard>} />
            <Route path="/delivery/:id"      element={<Suspense fallback={<PageLoader />}><DeliveryFlow /></Suspense>} />
            <Route path="/rider"             element={<StaffGuard><Suspense fallback={<PageLoader />}><RiderDashboard /></Suspense></StaffGuard>} />
            <Route path="/wallet"            element={<StaffGuard><Suspense fallback={<PageLoader />}><WalletPage /></Suspense></StaffGuard>} />
            <Route path="/wallet/rider"      element={<StaffGuard><Suspense fallback={<PageLoader />}><RiderWallet /></Suspense></StaffGuard>} />
            <Route path="/sell"              element={<StaffGuard><Suspense fallback={<PageLoader />}><ProductForm /></Suspense></StaffGuard>} />
            <Route path="/sell/product"      element={<StaffGuard><Suspense fallback={<PageLoader />}><ProductForm /></Suspense></StaffGuard>} />
            <Route path="/receipt/:id"       element={<Suspense fallback={<PageLoader />}><Receipt /></Suspense>} />
            <Route path="/request-rider"     element={<StaffGuard><Suspense fallback={<PageLoader />}><RequestRider /></Suspense></StaffGuard>} />
            <Route path="/rider/jobs"        element={<StaffGuard><Suspense fallback={<PageLoader />}><RiderJobs /></Suspense></StaffGuard>} />
            <Route path="/find-rider/:id"    element={<StaffGuard><Suspense fallback={<PageLoader />}><FindRider /></Suspense></StaffGuard>} />
            <Route path="/store/dashboard"   element={<StaffGuard><Suspense fallback={<PageLoader />}><StoreOwnerDashboard /></Suspense></StaffGuard>} />
            <Route path="/profile"           element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
            <Route path="/profile/:id"       element={<Suspense fallback={<PageLoader />}><PublicProfile /></Suspense>} />
            <Route path="/people"            element={<Suspense fallback={<PageLoader />}><FindPeople /></Suspense>} />
            <Route path="/settings"          element={<Settings />} />
            <Route element={<AdminOnly />}>
            <Route path="/admin"             element={<Suspense fallback={<PageLoader />}><AdminHome /></Suspense>} />
            <Route path="/admin/orders"      element={<Suspense fallback={<PageLoader />}><AdminOrders /></Suspense>} />
            <Route path="/admin/staff"       element={<Suspense fallback={<PageLoader />}><AdminStaff /></Suspense>} />
            <Route path="/admin/audit"       element={<Suspense fallback={<PageLoader />}><AdminAudit /></Suspense>} />
            <Route path="/admin/groups"      element={<Suspense fallback={<PageLoader />}><AdminGroups /></Suspense>} />
            <Route path="/admin/disputes"    element={<Suspense fallback={<PageLoader />}><AdminDisputes /></Suspense>} />
            <Route path="/admin/analytics"   element={<Suspense fallback={<PageLoader />}><AdminAnalytics /></Suspense>} />
            <Route path="/admin/users"          element={<Suspense fallback={<PageLoader />}><AdminUsers /></Suspense>} />
            <Route path="/admin/id-checks"    element={<Suspense fallback={<PageLoader />}><AdminIdChecks /></Suspense>} />
            <Route path="/admin/verifications" element={<Suspense fallback={<PageLoader />}><AdminVerifications /></Suspense>} />
            </Route> 
            <Route path="/verify-id"         element={<StaffGuard><Suspense fallback={<PageLoader />}><VerifyId /></Suspense></StaffGuard>} />
            <Route path="/seller-verification" element={<StaffGuard><Suspense fallback={<PageLoader />}><SellerVerification /></Suspense></StaffGuard>} />
            <Route path="/rider-verification"  element={<StaffGuard><Suspense fallback={<PageLoader />}><RiderVerification /></Suspense></StaffGuard>} />
          </Route>
          </Route>{/* /AuthGuard */}

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
