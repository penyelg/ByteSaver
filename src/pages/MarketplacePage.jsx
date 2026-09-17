import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CircuitBoard, Cpu, HardDrive, Heart, Keyboard, LayoutGrid, MemoryStick, Monitor, Package, Search, ShieldCheck, ShoppingBag, UserRound, Plus, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import wordmark from '../assets/bytesaver-wordmark-primary.png'
import './MarketplacePage.css'

export const fallbackCategories = ['All hardware', 'CPU', 'GPU', 'RAM', 'Motherboard', 'Storage', 'Power Supply', 'Monitor', 'Peripherals']

const categoryIcons = {
  'All hardware': LayoutGrid,
  CPU: Cpu,
  GPU: CircuitBoard,
  RAM: MemoryStick,
  Motherboard: CircuitBoard,
  Storage: HardDrive,
  'Power Supply': Zap,
  Monitor,
  Peripherals: Keyboard,
}

function CategoryIcon({ category }) {
  const Icon = categoryIcons[category] || Package
  return <Icon aria-hidden="true" strokeWidth={1.8} />
}

function firstValue(row, keys, fallback = '') {
  for (const key of keys) {
    if (row?.[key] !== undefined && row[key] !== null && row[key] !== '') return row[key]
  }
  return fallback
}

export default function MarketplacePage({ session, onSell, onViewListing }) {
  const [listings, setListings] = useState([])
  const [categories, setCategories] = useState([])
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All hardware')
  const [sortBy, setSortBy] = useState('featured')
  const [selectedConditions, setSelectedConditions] = useState([])
  const [maxPrice, setMaxPrice] = useState(150000)
  const [benchmarkedOnly, setBenchmarkedOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)


  // use for fetching the data from Supabase
  useEffect(() => {
    let mounted = true

    const loadMarketplace = async () => {
      if (!supabase) {
        setError('Supabase is not configured.')
        setLoading(false)
        return
      }

      const [listingResult, categoryResult] = await Promise.all([
        supabase.from('listings').select('*'),
        supabase.from('categories').select('*'),
      ])

      if (!mounted) return
      if (!listingResult.error) setListings(listingResult.data || [])
      if (!categoryResult.error) setCategories(categoryResult.data || [])
      setLoading(false)
    }

    loadMarketplace()
    return () => { mounted = false }
  }, [])

  // used as action event listener for account menu button
  useEffect(() => {
    const closeAccountMenu = (event) => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false)
    }

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setAccountOpen(false)
    }

    document.addEventListener('mousedown', closeAccountMenu)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeAccountMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const categoryNames = useMemo(() => {
    const names = categories
      .map((category) =>
         firstValue(
          category,
           ['name', 'title', 'label', 'category_name']
          )
        ).filter(Boolean)

    return ['All hardware', ...(names.length ? names : fallbackCategories.slice(1))]
  }, [categories])

  const visibleListings = listings
  const filteredListings = useMemo(() => visibleListings.filter((listing) => {
    const title = firstValue(listing, ['title', 'name', 'listing_title'], 'Untitled listing')

    const description = firstValue(listing, ['description', 'details'], '')

    const category = firstValue(listing, ['category_name', 'category', 'category_title'], '')

    const searchable = `${title} ${description} ${category}`.toLowerCase()
    const matchesQuery = searchable.includes(query.toLowerCase())
    const matchesCategory = activeCategory === 'All hardware' || category.toLowerCase() === activeCategory.toLowerCase()
    const price = Number(firstValue(listing, ['price', 'asking_price', 'amount'], 0))
    const condition = firstValue(listing, ['condition', 'item_condition'], '').toLowerCase()
    const matchesCondition = selectedConditions.length === 0 || selectedConditions.some((selected) => condition.includes(selected.toLowerCase()))
    const matchesPrice = price <= maxPrice
    const matchesBenchmark = !benchmarkedOnly || listing.benchmarked === true || listing.is_benchmarked === true
    return matchesQuery && matchesCategory && matchesCondition && matchesPrice && matchesBenchmark
  }), [activeCategory, benchmarkedOnly, listings, maxPrice, query, selectedConditions])

  const sortedListings = useMemo(() => {
    const sorted = [...filteredListings]
    if (sortBy === 'price-low') sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    if (sortBy === 'price-high') sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
    if (sortBy === 'recent') sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    return sorted
  }, [filteredListings, sortBy])

  const displayName = session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'member'
  const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || session.user.user_metadata?.image_url
  const signOut = async () => {
    setAccountOpen(false)
    await supabase?.auth.signOut()
  }

  const resetFilters = () => {
    setActiveCategory('All hardware')
    setSelectedConditions([])
    setMaxPrice(150000)
    setBenchmarkedOnly(false)
  }

  const toggleCondition = (condition) => {
    setSelectedConditions((current) => current.includes(condition) ? current.filter((item) => item !== condition) : [...current, condition])
  }

  return (
    <main className="marketplace-shell">
      <header className="marketplace-header">
        <a className="marketplace-logo" href="#browse" aria-label="ByteSaver marketplace home">
          <img src={wordmark} alt="ByteSaver — Smart Upgrades. Lighter Price." />
        </a>
        <nav className="marketplace-nav" aria-label="Main navigation">
          <a className="active" href="#browse"><span className="nav-icon"><LayoutGrid aria-hidden="true" /></span><span>Browse</span><small>01</small></a>
          <a href="#sell" onClick={(event) => { event.preventDefault(); onSell() }}><span className="nav-icon"><Plus aria-hidden="true" /></span><span>Sell hardware</span><small>02</small></a>
          <a href="#verified"><span className="nav-icon"><ShieldCheck aria-hidden="true" /></span><span>Tech verified</span></a>
        </nav>
        <div className="header-actions">
          <label className="header-search"><Search aria-hidden="true" /><input placeholder="Search GPUs, CPUs, DDR5" aria-label="Search GPUs, CPUs, DDR5" /></label>
          <button className="header-icon-button" type="button" aria-label="Favorites"><Heart aria-hidden="true" /></button>
          <button className="header-icon-button header-bag-button" type="button" aria-label="Shopping bag"><ShoppingBag aria-hidden="true" /><span>0</span></button>
        </div>
        <div className="account-menu" ref={accountRef}>
          <button className={`profile-trigger ${accountOpen ? 'open' : ''}`} type="button" aria-label={`Open account menu for ${displayName}`} aria-expanded={accountOpen} aria-haspopup="menu" onClick={() => setAccountOpen((isOpen) => !isOpen)}>
            <span className="profile-trigger-icon">{avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : <UserRound aria-hidden="true" />}</span><span className="online-dot" />
          </button>
          {accountOpen && <div className="account-dropdown" role="menu">
            <div className="account-summary"><span className="account-avatar">{avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : displayName.slice(0, 1).toUpperCase()}</span><span><strong>{displayName}</strong><small>{session.user.email}</small></span></div>
            <div className="account-divider" />
            <button className="sign-out-button" type="button" role="menuitem" onClick={signOut}><span>↪</span> Sign out</button>
          </div>}
        </div>
      </header>

      <section className="marketplace-intro" id="browse">
        <div className="intro-copy"><div className="intro-badges"><span className="section-index">● MARKETPLACE / 01</span><span className="verified-badge">♢ VERIFIED LISTINGS ONLY</span></div><h1>Smart upgrades.<br /><em>Lighter price.</em></h1><p>Pre-owned computer hardware, checked by people who know the difference.</p><div className="intro-actions"><a className="primary-action" href="#recent-deals">⚡ EXPLORE HARDWARE</a><button className="secondary-action" type="button" onClick={onSell}>＋ LIST YOUR GEAR</button></div></div>
        <div className="intro-stats"><div className="intro-stat"><span>STATUS</span><strong>● LIVE</strong><small>APPROVED LISTINGS</small></div><div className="intro-stat"><span>SAVINGS AVG.</span><strong>SMART PRICES</strong><small>FOR PINOY BUILDERS</small></div></div>
      </section>

      <div className="marketplace-body">
        <aside className="category-rail">
          <div className="filter-heading"><span>☷ &nbsp; FILTER HARDWARE</span><button type="button" onClick={resetFilters}>RESET ALL</button></div>
          <span className="rail-label">CATEGORIES</span>
          <div className="category-list">
            {categoryNames.map((category) => <button key={category} className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}><CategoryIcon category={category} /><span>{category}</span></button>)}
          </div>
          <div className="filter-group"><span className="rail-label">CONDITION GRADE</span><label><input type="checkbox" checked={selectedConditions.includes('brand new')} onChange={() => toggleCondition('brand new')} /> Brand New / Open Box</label><label><input type="checkbox" checked={selectedConditions.includes('like new')} onChange={() => toggleCondition('like new')} /> Like New (Mint)</label><label><input type="checkbox" checked={selectedConditions.includes('excellent')} onChange={() => toggleCondition('excellent')} /> Excellent (Minor Use)</label><label><input type="checkbox" checked={selectedConditions.includes('good')} onChange={() => toggleCondition('good')} /> Good (Tested Working)</label></div>
          <div className="filter-group price-filter"><span className="rail-label">MAX PRICE</span><strong>₱{maxPrice.toLocaleString()}</strong><input type="range" min="1000" max="150000" step="1000" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /><div><small>₱1,000</small><small>₱150,000+</small></div></div>
          <label className="benchmark-filter"><input type="checkbox" checked={benchmarkedOnly} onChange={(event) => setBenchmarkedOnly(event.target.checked)} /> <span>◉ &nbsp;3DMark Benchmarked Only</span></label>
        </aside>

        <section className="marketplace-content">
          <div className="browse-toolbar" id="recent-deals"><div className="active-deals"><span>ACTIVE DEALS:</span><strong>{sortedListings.length} items</strong><i>•</i><b>{activeCategory}</b></div><label className="sort-control"><span>SORT BY:</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="featured">Featured / Recent</option><option value="recent">Most Recent</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option></select></label></div>

          {loading && <div className="marketplace-state">LOADING LISTINGS…</div>}
          {!loading && error && <div className="marketplace-state marketplace-state--error">{error}</div>}
          {!loading && filteredListings.length === 0 && <div className="marketplace-empty"><span className="empty-code">NO MATCHES / 001</span><h2>No matches found.</h2><p>Try another search or category.</p></div>}
          {!loading && !error && sortedListings.length > 0 && <div className="listing-grid">{sortedListings.map((listing, index) => <ListingCard key={listing.id || index} listing={listing} onView={() => onViewListing(listing)} />)}</div>}

        </section>
      </div>
    </main>
  )
}

function ListingCard({ listing, onView }) {
  const brand = firstValue(listing, ['brand'], '')
  const model = firstValue(listing, ['model'], '')
  const title = firstValue(listing, ['title', 'name', 'listing_title'], `${brand} ${model}`.trim() || 'Untitled listing')
  const category = firstValue(listing, ['category_name', 'category', 'category_title'], 'Hardware')
  const price = firstValue(listing, ['price', 'asking_price', 'amount'], null)
  const condition = firstValue(listing, ['condition', 'item_condition'], 'Pre-owned')
  const imageUrl = firstValue(listing, ['image_url', 'image', 'thumbnail_url'], '')
  return <article className="listing-card"><div className="listing-image">{imageUrl ? <img src={imageUrl} alt="" /> : <span>{category.slice(0, 3).toUpperCase()}</span>}</div><div className="listing-meta"><span>{category}</span><strong>{title}</strong><small>{condition}</small><div className="listing-bottom"><b>{price === null ? 'PRICE ON REQUEST' : `₱${Number(price).toLocaleString()}`}</b><button type="button" onClick={onView}>VIEW ITEM ↗</button></div></div></article>
}
