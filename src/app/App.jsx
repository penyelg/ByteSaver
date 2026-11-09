import React from 'react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthPage from '../features/auth/pages/AuthPage'
import MarketplacePage from '../features/marketplace/pages/MarketplacePage'
import SellListingPage from '../features/listings/pages/SellListingPage'
import ManageListingsPage from '../features/listings/pages/ManageListingsPage'
import ListingDetailsPage from '../features/marketplace/pages/ListingDetailsPage'
import ProfileSetupPage from '../features/account/pages/ProfileSetupPage'
import VerificationPendingPage from '../features/account/pages/VerificationPendingPage'
import AccountSuspendedPage from '../features/account/pages/AccountSuspendedPage'
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage'
import { isIdentityApproved } from '../features/account/utils/verification'
import useSession from '../features/auth/hooks/useSession'
import useCart from '../features/cart/hooks/useCart'
import MyReservations from '../features/reservations/MyReservations'
import ReservationPaymentPage from '../features/reservations/ReservationPaymentPage'
import AccountPage from '../features/account/pages/AccountPage'
import MobileNavigation from '../components/mobile/MobileNavigation'

export default function App() {
  const [page, setPage] = useState('home')
  const location = useLocation()
  const navigate = useNavigate()
  const openAdmin = () => { setPage('admin'); navigate('/admin'); }
  const openMarketplace = () => { setPage('browse'); navigate('/'); }
  const openSell = () => navigate('/listings/new')
  const verifyOwnAccount = () => { setPage('verify'); navigate('/'); }
  const [selectedListing, setSelectedListing] = useState(null)
  const { cartItems, loadCart, clearCart, addToCart, removeFromCart } = useCart()
  const { session, profile, profileError, completeProfile, refreshProfile } = useSession({ loadCart, clearCart })

  if (session === undefined) return <div className="auth-loading">CHECKING SESSION…</div>
  if (session) {
    if (profile?.access?.status === 'suspended') return <AccountSuspendedPage access={profile.access} onRefresh={refreshProfile} />
    const approved = isIdentityApproved(profile);
    // Reviewers can reach their queue without approving their own identity.
    if (profile?.is_admin && (location.pathname.startsWith('/admin') || page === 'admin' || page === 'home' && location.pathname === '/' || !approved && page !== 'verify')) {
      return <AdminDashboardPage session={session} onMarketplace={approved ? openMarketplace : undefined} onVerify={!approved ? verifyOwnAccount : undefined} />
    }
    if (location.pathname.startsWith('/admin') && !profileError) {
      return <main className="profile-setup-shell"><section className="profile-setup-panel"><h1>Administrator access required.</h1><p className="profile-setup-intro">This workspace is available to authorized administrators.</p><button className="profile-setup-submit" onClick={openMarketplace}>Back to your account</button></section></main>
    }
    if (!profileError && profile?.verification?.status === 'pending_review') {
      return <VerificationPendingPage verification={profile.verification} onRefresh={refreshProfile} onReviewIdentities={profile.is_admin ? openAdmin : undefined} />
    }
    if (profileError || !approved) {
      // A confirmed submission advances to pending review; approval unlocks browsing.
      return <ProfileSetupPage
        session={session}
        profile={profile}
        loadError={profileError}
        onReviewIdentities={profile?.is_admin ? openAdmin : undefined}
        onComplete={(updatedProfile) => {
          completeProfile(updatedProfile)
          setPage('browse')
        }}
      />
    }
    const memberView = (screen, content) => (
      <MobileNavigation screen={screen} onBrowse={openMarketplace}>{content}</MobileNavigation>
    )

    if (location.pathname === '/reservations') return memberView('reservations', <MyReservations onBack={openMarketplace} />)
    if (location.pathname === '/reservations/payment') {
      const reservationId = new URLSearchParams(location.search).get('reservation') || ''
      return memberView('payment', <ReservationPaymentPage key={reservationId} reservationId={reservationId} onBrowse={openMarketplace} />)
    }
    if (location.pathname === '/account') return memberView('account', <AccountPage session={session} profile={profile} onBack={openMarketplace} onAdmin={profile.is_admin ? openAdmin : undefined} />)
    if (location.pathname === '/listings/manage') return memberView('manage', <ManageListingsPage key={session.user.id} sellerId={session.user.id} onBack={openMarketplace} onSell={openSell} />)
    if (location.pathname === '/listings/new') return memberView('sell', <SellListingPage session={session} onBack={openMarketplace} />)
    if (page === 'details' && selectedListing) return memberView('details', <ListingDetailsPage listing={selectedListing} onBack={openMarketplace} onAddToCart={(listing) => addToCart(session.user.id, listing)} />)
    return memberView('browse', <MarketplacePage session={session} onReviewIdentities={profile.is_admin ? openAdmin : undefined} cartItems={cartItems} onRemoveFromCart={(item) => removeFromCart(session.user.id, item)} onSell={openSell} onViewListing={(listing) => { setSelectedListing(listing); setPage('details') }} />)
  }
  return <AuthPage />
}
