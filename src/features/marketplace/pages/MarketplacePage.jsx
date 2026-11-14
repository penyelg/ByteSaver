import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import MarketplaceHeader from '../components/MarketplaceHeader';
import MarketplaceIntro from '../components/MarketplaceIntro';
import MarketplaceFilters from '../components/MarketplaceFilters';
import ListingCard from '../components/ListingCard';
import CartDrawer from '../../cart/components/CartDrawer';
import useMarketplace from '../hooks/useMarketplace';
import { fallbackCategories, firstValue } from '../utils/listingUtils';
import { BROWSE_PAGE_SIZE } from '../services/marketplaceService';
import '../styles/marketplace.css';
import '../styles/MarketplacePage.css';

export { fallbackCategories } from '../utils/listingUtils';

export default function MarketplacePage({ session, cartItems = [], onRemoveFromCart, onSell, onViewListing, onReviewIdentities }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All hardware");
  const [sortBy, setSortBy] = useState("featured");
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [maxPrice, setMaxPrice] = useState(150000);
  const [cartOpen, setCartOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { listings, categories, total, loading, error, reload } = useMarketplace({ page, query, activeCategory, sortBy, selectedConditions, maxPrice });
  const pageCount = Math.max(1, Math.ceil(total / BROWSE_PAGE_SIZE));
  useEffect(() => {
    if (!loading && !error && page > pageCount) setPage(pageCount);
  }, [loading, error, page, pageCount]);
  const updateSearch = (value) => { setQuery(value); setPage(1); };
  const changePage = (next) => {
    setPage(next);
    document.getElementById('recent-deals')?.scrollIntoView({ block: 'start' });
  };

  const categoryNames = useMemo(() => {
    const names = categories
      .map((category) =>
        firstValue(category, ["name", "title", "label", "category_name"]),
      )
      .filter(Boolean);

    return [
      "All hardware",
      ...(names.length ? names : fallbackCategories.slice(1)),
    ];
  }, [categories]);

  const resetFilters = () => {
    setPage(1);
    setActiveCategory("All hardware");
    setSelectedConditions([]);
    setMaxPrice(150000);
  };

  const toggleCondition = (condition) => {
    setPage(1);
    setSelectedConditions((current) =>
      current.includes(condition)
        ? current.filter((item) => item !== condition)
        : [...current, condition],
    );
  };

  return (
    <main className="marketplace-shell">
      <MarketplaceHeader session={session} cartItems={cartItems} onSell={onSell} onOpenCart={() => setCartOpen(true)} onReviewIdentities={onReviewIdentities} query={query} onSearch={updateSearch} />
      <div className="mobile-browse-tools">
        <label><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => updateSearch(event.target.value)} placeholder="Search hardware" aria-label="Search hardware" /></label>
        <button type="button" aria-label="Filters" aria-expanded={filtersOpen} aria-controls="marketplace-filters" onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal aria-hidden="true" /></button>
      </div>

      <div className="marketplace-body">
        <MarketplaceFilters
          categoryNames={categoryNames} activeCategory={activeCategory} setActiveCategory={(value) => { setActiveCategory(value); setPage(1); }}
          selectedConditions={selectedConditions} toggleCondition={toggleCondition}
          maxPrice={maxPrice} setMaxPrice={(value) => { setMaxPrice(value); setPage(1); }} resetFilters={resetFilters}
          filtersOpen={filtersOpen}
        />

        <section className="marketplace-content">
          {!query && activeCategory === 'All hardware' && page === 1 && <MarketplaceIntro onSell={onSell} listing={loading ? undefined : listings.find((listing) => listing.image_url)} onViewListing={onViewListing} />}
          <h2 className="mobile-browse-title">{query || activeCategory !== 'All hardware' ? 'Find your next upgrade' : 'Fresh finds'}</h2>
          <div className="browse-toolbar" id="recent-deals">
            <div className="active-deals">
              <span>ACTIVE DEALS:</span>
              <strong>{loading ? 'Loading…' : `${total} items`}</strong>
              <i>•</i>
              <b>{activeCategory}</b>
            </div>
            <label className="sort-control">
              <span>SORT BY:</span>
              <select
                value={sortBy}
                onChange={(event) => { setSortBy(event.target.value); setPage(1); }}
              >
                <option value="featured">Featured / Recent</option>
                <option value="recent">Most Recent</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </label>
          </div>

          <p className="browse-result-summary" role="status">{loading ? 'Loading listings…' : error ? '' : total > 0 ? `Showing ${(page - 1) * BROWSE_PAGE_SIZE + 1}–${Math.min(page * BROWSE_PAGE_SIZE, total)} of ${total} listings` : '0 listings'}</p>
          <div aria-busy={loading}>
          {loading && (
            <div className="marketplace-state">LOADING LISTINGS…</div>
          )}
          {!loading && error && (
            <div className="marketplace-state marketplace-state--error">
              {error}
              <button className="browse-retry" type="button" onClick={reload}>Try again</button>
            </div>
          )}
          {!loading && !error && listings.length === 0 && (
            <div className="marketplace-empty">
              <span className="empty-code">NO MATCHES / 001</span>
              <h2>No matches found.</h2>
              <p>Try another search or category.</p>
            </div>
          )}
          {!loading && !error && listings.length > 0 && (
            <div className="listing-grid">
              {listings.map((listing, index) => (
                <ListingCard
                  key={listing.id || index}
                  listing={listing}
                  onView={() => onViewListing(listing)}
                />
              ))}
            </div>
          )}
          </div>
          {!error && total > 0 && <nav className="browse-pagination" aria-label="Browse pages">
            <button type="button" disabled={loading || page <= 1} onClick={() => changePage(page - 1)}>Previous</button>
            <span>Page {Math.min(page, pageCount)} of {pageCount}</span>
            <button type="button" disabled={loading || page >= pageCount} onClick={() => changePage(page + 1)}>Next</button>
          </nav>}
        </section>
      </div>
      {cartOpen && (
        <CartDrawer cartItems={cartItems} onRemoveFromCart={onRemoveFromCart} onViewListing={onViewListing} onClose={() => setCartOpen(false)} />
      )}
    </main>
  );
}
