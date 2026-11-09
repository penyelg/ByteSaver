import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import MarketplaceHeader from '../components/MarketplaceHeader';
import MarketplaceIntro from '../components/MarketplaceIntro';
import MarketplaceFilters from '../components/MarketplaceFilters';
import ListingCard from '../components/ListingCard';
import CartDrawer from '../../cart/components/CartDrawer';
import useMarketplace from '../hooks/useMarketplace';
import { fallbackCategories, firstValue, filterListings, sortListings } from '../utils/listingUtils';
import '../styles/marketplace.css';
import '../styles/MarketplacePage.css';

export { fallbackCategories } from '../utils/listingUtils';

export default function MarketplacePage({ session, cartItems = [], onRemoveFromCart, onSell, onViewListing, onReviewIdentities }) {
  const { listings, categories, loading, error } = useMarketplace();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All hardware");
  const [sortBy, setSortBy] = useState("featured");
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [maxPrice, setMaxPrice] = useState(150000);
  const [cartOpen, setCartOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const filteredListings = useMemo(
    () => filterListings(listings, { query, activeCategory, selectedConditions, maxPrice }),
    [listings, query, activeCategory, selectedConditions, maxPrice],
  );
  const sortedListings = useMemo(
    () => sortListings(filteredListings, sortBy),
    [filteredListings, sortBy],
  );

  const resetFilters = () => {
    setActiveCategory("All hardware");
    setSelectedConditions([]);
    setMaxPrice(150000);
  };

  const toggleCondition = (condition) => {
    setSelectedConditions((current) =>
      current.includes(condition)
        ? current.filter((item) => item !== condition)
        : [...current, condition],
    );
  };

  return (
    <main className="marketplace-shell">
      <MarketplaceHeader session={session} cartItems={cartItems} onSell={onSell} onOpenCart={() => setCartOpen(true)} onReviewIdentities={onReviewIdentities} query={query} onSearch={setQuery} />
      <div className="mobile-browse-tools">
        <label><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search hardware" aria-label="Search hardware" /></label>
        <button type="button" aria-label="Filters" aria-expanded={filtersOpen} aria-controls="marketplace-filters" onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal aria-hidden="true" /></button>
      </div>
      <MarketplaceIntro onSell={onSell} />

      <div className="marketplace-body">
        <MarketplaceFilters
          categoryNames={categoryNames} activeCategory={activeCategory} setActiveCategory={setActiveCategory}
          selectedConditions={selectedConditions} toggleCondition={toggleCondition}
          maxPrice={maxPrice} setMaxPrice={setMaxPrice} resetFilters={resetFilters}
          filtersOpen={filtersOpen}
        />

        <section className="marketplace-content">
          <h2 className="mobile-browse-title">Available hardware</h2>
          <div className="browse-toolbar" id="recent-deals">
            <div className="active-deals">
              <span>ACTIVE DEALS:</span>
              <strong>{sortedListings.length} items</strong>
              <i>•</i>
              <b>{activeCategory}</b>
            </div>
            <label className="sort-control">
              <span>SORT BY:</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="featured">Featured / Recent</option>
                <option value="recent">Most Recent</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </label>
          </div>

          {loading && (
            <div className="marketplace-state">LOADING LISTINGS…</div>
          )}
          {!loading && error && (
            <div className="marketplace-state marketplace-state--error">
              {error}
            </div>
          )}
          {!loading && !error && filteredListings.length === 0 && (
            <div className="marketplace-empty">
              <span className="empty-code">NO MATCHES / 001</span>
              <h2>No matches found.</h2>
              <p>Try another search or category.</p>
            </div>
          )}
          {!loading && !error && sortedListings.length > 0 && (
            <div className="listing-grid">
              {sortedListings.map((listing, index) => (
                <ListingCard
                  key={listing.id || index}
                  listing={listing}
                  onView={() => onViewListing(listing)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
      {cartOpen && (
        <CartDrawer cartItems={cartItems} onRemoveFromCart={onRemoveFromCart} onClose={() => setCartOpen(false)} />
      )}
    </main>
  );
}
