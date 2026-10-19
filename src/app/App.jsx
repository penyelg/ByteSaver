import React from 'react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthPage from '../features/auth/pages/AuthPage'
import MarketplacePage from '../features/marketplace/pages/MarketplacePage'
import SellListingPage from '../features/listings/pages/SellListingPage'
import ListingDetailsPage from '../features/marketplace/pages/ListingDetailsPage'
import ProfileSetupPage from '../features/account/pages/ProfileSetupPage'
import VerificationPendingPage from '../features/account/pages/VerificationPendingPage'
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage'
import { isIdentityApproved } from '../features/account/utils/verification'
import useSession from '../features/auth/hooks/useSession'
import useCart from '../features/cart/hooks/useCart'

export default function App() {
  const [page, setPage] = useState('home')
  const location = useLocation()
  const navigate = useNavigate()
  const openAdmin = () => { setPage('admin'); navigate('/admin'); }
  const openMarketplace = () => { setPage('browse'); navigate('/'); }
  const verifyOwnAccount = () => { setPage('verify'); navigate('/'); }
  const [selectedListing, setSelectedListing] = useState(null)
  const { cartItems, loadCart, clearCart, addToCart, removeFromCart } = useCart()
  const { session, profile, profileError, completeProfile, refreshProfile } = useSession({ loadCart, clearCart })

  if (session === undefined) return <div className="auth-loading">CHECKING SESSION…</div>
  if (session) {
    const approved = isIdentityApproved(profile);
    // Reviewers can reach their queue without approving their own identity.
    if (profile?.is_admin && (location.pathname.startsWith('/admin') || page === 'admin' || page === 'home' || !approved && page !== 'verify')) {
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
    if (page === 'sell') return <SellListingPage session={session} onBack={() => setPage('browse')} />
    if (page === 'details' && selectedListing) return <ListingDetailsPage listing={selectedListing} onBack={() => setPage('browse')} onAddToCart={(listing) => addToCart(session.user.id, listing)} />
    return <MarketplacePage session={session} onReviewIdentities={profile.is_admin ? openAdmin : undefined} cartItems={cartItems} onRemoveFromCart={(item) => removeFromCart(session.user.id, item)} onSell={() => setPage('sell')} onViewListing={(listing) => { setSelectedListing(listing); setPage('details') }} />
  }
  return <AuthPage />
}
