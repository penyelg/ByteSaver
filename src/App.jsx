import React from 'react'
import { useEffect, useState } from 'react'
import AuthPage from './pages/AuthPage'
import MarketplacePage from './pages/MarketplacePage'
import SellListingPage from './pages/SellListingPage'
import ListingDetailsPage from './pages/ListingDetailsPage'
import { supabase } from './lib/supabase'
import { ensureUserProfile } from './lib/profile'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage] = useState('browse')
  const [selectedListing, setSelectedListing] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setSession(null)
      return undefined
    }

    const applySession = async (nextSession) => {
      if (nextSession?.user) {
        const { error } = await ensureUserProfile(nextSession.user)
        if (error) console.warn('Unable to sync public user profile:', error.message)
      }
      setSession(nextSession)
    }

    supabase.auth.getSession().then(({ data }) => applySession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => applySession(nextSession))

    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="auth-loading">CHECKING SESSION…</div>
  if (session) {
    if (page === 'sell') return <SellListingPage session={session} onBack={() => setPage('browse')} />
    if (page === 'details' && selectedListing) return <ListingDetailsPage listing={selectedListing} onBack={() => setPage('browse')} />
    return <MarketplacePage session={session} onSell={() => setPage('sell')} onViewListing={(listing) => { setSelectedListing(listing); setPage('details') }} />
  }
  return <AuthPage />
}
