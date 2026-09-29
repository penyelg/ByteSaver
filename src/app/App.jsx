import React from 'react'
import { useEffect, useState } from 'react'
import AuthPage from '../features/auth/pages/AuthPage'
import MarketplacePage from '../features/marketplace/pages/MarketplacePage'
import SellListingPage from '../features/listings/pages/SellListingPage'
import ListingDetailsPage from '../features/marketplace/pages/ListingDetailsPage'
import { supabase } from '../lib/supabase'
import { ensureUserProfile } from '../lib/profile'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage] = useState('browse')
  const [selectedListing, setSelectedListing] = useState(null)
  const [cartItems, setCartItems] = useState([])

  const loadCart = async (userId) => {
    if (!supabase || !userId) return
    const { data, error } = await supabase
      .from('cart_items')
      .select('id, listing_id, quantity')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (error) {
      console.warn('Unable to load cart:', error.message)
      return
    }
    const listingIds = (data || []).map((item) => item.listing_id)
    if (!listingIds.length) return setCartItems([])
    const { data: listings, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .in('id', listingIds)
    if (listingError) {
      console.warn('Unable to load cart listings:', listingError.message)
      return
    }
    const listingMap = new Map((listings || []).map((listing) => [listing.id, listing]))
    setCartItems((data || []).filter((item) => listingMap.has(item.listing_id)).map((item) => ({ ...item, listing: listingMap.get(item.listing_id) })))
  }

  useEffect(() => {
    if (!supabase) {
      setSession(null)
      return undefined
    }

    const applySession = async (nextSession) => {
      if (nextSession?.user) {
        const { error } = await ensureUserProfile(nextSession.user)
        if (error) console.warn('Unable to sync public user profile:', error.message)
        await loadCart(nextSession.user.id)
      } else {
        setCartItems([])
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
    const addToCart = async (listing) => {
      if (cartItems.some((item) => item.listing_id === listing.id)) return { alreadyInCart: true }
      const { data, error } = await supabase.from('cart_items').insert({ user_id: session.user.id, listing_id: listing.id, quantity: 1 }).select('id, listing_id, quantity').single()
      if (error) return { error: error.message }
      setCartItems((current) => [...current, { ...data, listing }])
      return { added: true }
    }
    const removeFromCart = async (item) => {
      const { error } = await supabase.from('cart_items').delete().eq('id', item.id).eq('user_id', session.user.id)
      if (!error) setCartItems((current) => current.filter((cartItem) => cartItem.id !== item.id))
      return error
    }
    if (page === 'details' && selectedListing) return <ListingDetailsPage listing={selectedListing} onBack={() => setPage('browse')} onAddToCart={addToCart} />
    return <MarketplacePage session={session} cartItems={cartItems} onRemoveFromCart={removeFromCart} onSell={() => setPage('sell')} onViewListing={(listing) => { setSelectedListing(listing); setPage('details') }} />
  }
  return <AuthPage />
}
