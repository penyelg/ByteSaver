import React, { useMemo, useState } from 'react';
import MarketplaceHeader from '../components/MarketplaceHeader';
import MarketplaceIntro from '../components/MarketplaceIntro';
import MarketplaceFilters from '../components/MarketplaceFilters';
import ListingCard from '../components/ListingCard';
import CartDrawer from '../../cart/components/CartDrawer';
import useMarketplace from '../hooks/useMarketplace';
import { fallbackCategories, firstValue, filterListings, sortListings } from '../utils/listingUtils';
import './MarketplacePage.css';

export { fallbackCategories } from '../utils/listingUtils';

export default function MarketplacePage({ session, cartItems = [], onRemoveFromCart, onSell, onViewListing, onReviewIdentities }) {
  const { listings, categories, loading, error } = useMarketplace();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All hardware");
  const [sortBy, setSortBy] = useState("featured");
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [maxPrice, setMaxPrice] = useState(150000);
  const [benchmarkedOnly, setBenchmarkedOnly] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

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
    () => filterListings(listings, { query, activeCategory, selectedConditions, maxPrice, benchmarkedOnly }),
    [listings, query, activeCategory, selectedConditions, maxPrice, benchmarkedOnly],
  );
  const sortedListings = useMemo(
    () => sortListings(filteredListings, sortBy),
    [filteredListings, sortBy],
  );

  const resetFilters = () => {
    setActiveCategory("All hardware");
    setSelectedConditions([]);
    setMaxPrice(150000);
    setBenchmarkedOnly(false);
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
      <MarketplaceHeader session={session} cartItems={cartItems} onSell={onSell} onOpenCart={() => setCartOpen(true)} onReviewIdentities={onReviewIdentities} />
      <MarketplaceIntro onSell={onSell} />

      <div className="marketplace-body">
        <MarketplaceFilters
          categoryNames={categoryNames} activeCategory={activeCategory} setActiveCategory={setActiveCategory}
          selectedConditions={selectedConditions} toggleCondition={toggleCondition}
          maxPrice={maxPrice} setMaxPrice={setMaxPrice} resetFilters={resetFilters}
        />

        <section className="marketplace-content">
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
          {!loading && filteredListings.length === 0 && (
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
