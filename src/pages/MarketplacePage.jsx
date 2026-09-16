import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CircuitBoard, Cpu, HardDrive, Keyboard, LayoutGrid, MemoryStick, Monitor, Package, UserRound, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import wordmark from '../assets/bytesaver-wordmark-primary.png'
import './MarketplacePage.css'

const fallbackCategories = ['All hardware', 'CPU', 'GPU', 'RAM', 'Motherboard', 'Storage', 'Monitor', 'Peripherals']

const previewListings = [
  { id: 'preview-1', title: 'Ryzen 5 5600X', category_name: 'CPU', price: 5850, condition: 'Excellent condition' },
  { id: 'preview-2', title: 'GeForce RTX 3060 12GB', category_name: 'GPU', price: 15900, condition: 'Tested and verified' },
  { id: 'preview-3', title: 'Kingston Fury 16GB DDR4', category_name: 'RAM', price: 1850, condition: 'Like new' },
  { id: 'preview-4', title: 'AOC 24G2 24-inch 144Hz', category_name: 'Monitor', price: 7200, condition: 'Lightly used' },
  { id: 'preview-5', title: 'Samsung 970 EVO Plus 1TB', category_name: 'Storage', price: 3950, condition: 'Healthy drive' },
  { id: 'preview-6', title: 'Keychron K2 Mechanical Keyboard', category_name: 'Peripherals', price: 3100, condition: 'Excellent condition' },
]

const categoryIcons = {
  'All hardware': LayoutGrid,
  CPU: Cpu,
  GPU: CircuitBoard,
  RAM: MemoryStick,
  Motherboard: CircuitBoard,
  Storage: HardDrive,
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

export default function MarketplacePage({ session }) {
  const [listings, setListings] = useState([])
  const [categories, setCategories] = useState([])
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All hardware')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)

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
    const names = categories.map((category) => firstValue(category, ['name', 'title', 'label', 'category_name'])).filter(Boolean)
    return ['All hardware', ...(names.length ? names : fallbackCategories.slice(1))]
  }, [categories])

  const visibleListings = listings.length ? listings : previewListings
  const filteredListings = useMemo(() => visibleListings.filter((listing) => {
    const title = firstValue(listing, ['title', 'name', 'listing_title'], 'Untitled listing')
    const description = firstValue(listing, ['description', 'details'], '')
    const category = firstValue(listing, ['category_name', 'category', 'category_title'], '')
    const searchable = `${title} ${description} ${category}`.toLowerCase()
    const matchesQuery = searchable.includes(query.toLowerCase())
    const matchesCategory = activeCategory === 'All hardware' || category.toLowerCase() === activeCategory.toLowerCase()
    return matchesQuery && matchesCategory
  }), [activeCategory, listings, query])

  const displayName = session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'member'
  const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || session.user.user_metadata?.image_url
  const signOut = async () => {
    setAccountOpen(false)
    await supabase?.auth.signOut()
  }

  return (
    <main className="marketplace-shell">
      <header className="marketplace-header">
        <a className="marketplace-logo" href="#browse" aria-label="ByteSaver marketplace home">
          <img src={wordmark} alt="ByteSaver — Smart Upgrades. Lighter Price." />
        </a>
        <nav className="marketplace-nav" aria-label="Main navigation">
          <a className="active" href="#browse"><span className="nav-icon"><LayoutGrid aria-hidden="true" /></span><span>Browse</span><small>01</small></a>
          <a href="#sell"><span className="nav-icon"><Plus aria-hidden="true" /></span><span>Sell hardware</span><small>02</small></a>
        </nav>
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

      <div className="marketplace-body">
        <aside className="category-rail">
          <span className="rail-label">CATEGORIES</span>
          <div className="category-list">
            {categoryNames.map((category) => <button key={category} className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}><CategoryIcon category={category} /><span>{category}</span></button>)}
          </div>
        </aside>

        <section className="marketplace-content" id="browse">
          <div className="marketplace-intro">
            <div><span className="section-index">MARKETPLACE / 01</span><h1>Smart upgrades.<br /><em>Lighter price.</em></h1><p>Pre-owned computer hardware, checked by people who know the difference.</p></div>
            <div className="intro-signal"><span>STATUS</span><strong>LIVE</strong><small>APPROVED LISTINGS ONLY</small></div>
          </div>

          <div className="browse-toolbar"><span className="toolbar-label">RECENT DEALS</span><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search hardware..." aria-label="Search hardware" /></label></div>

          {loading && <div className="marketplace-state">LOADING LISTINGS…</div>}
          {!loading && error && <div className="marketplace-state marketplace-state--error">{error}</div>}
          {!loading && filteredListings.length === 0 && <div className="marketplace-empty"><span className="empty-code">NO MATCHES / 001</span><h2>No matches found.</h2><p>Try another search or category.</p></div>}
          {!loading && !error && filteredListings.length > 0 && <div className="listing-grid">{filteredListings.map((listing, index) => <ListingCard key={listing.id || index} listing={listing} />)}</div>}
        </section>
      </div>
    </main>
  )
}

function ListingCard({ listing }) {
  const title = firstValue(listing, ['title', 'name', 'listing_title'], 'Untitled listing')
  const category = firstValue(listing, ['category_name', 'category', 'category_title'], 'Hardware')
  const price = firstValue(listing, ['price', 'asking_price', 'amount'], null)
  const condition = firstValue(listing, ['condition', 'item_condition'], 'Pre-owned')
  return <article className="listing-card"><div className="listing-image"><span>{category.slice(0, 3).toUpperCase()}</span></div><div className="listing-meta"><span>{category}</span><strong>{title}</strong><small>{condition}</small><div className="listing-bottom"><b>{price === null ? 'PRICE ON REQUEST' : `₱${Number(price).toLocaleString()}`}</b><button>VIEW ITEM ↗</button></div></div></article>
}
