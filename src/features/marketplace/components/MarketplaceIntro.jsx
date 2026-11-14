import React from 'react';
import '../styles/marketplace.css';
import '../styles/MarketplaceIntro.css';

export default function MarketplaceIntro({ onSell, listing, onViewListing }) {
  return (
    <section className="marketplace-intro" id="browse">
      <div className="intro-copy">
        <div className="intro-badges">
          <span className="section-index">● MARKETPLACE / 01</span>
        </div>
        <h1>
          Your next upgrade
          <br />
          <em>starts here.</em>
        </h1>
        <p>
          Find pre-owned hardware for your next build.
        </p>
        <div className="intro-actions">
          <a className="primary-action" href="#recent-deals">
            ⚡ EXPLORE HARDWARE
          </a>
          <button className="secondary-action" type="button" onClick={onSell}>
            ＋ LIST YOUR GEAR
          </button>
        </div>
      </div>
      {listing?.image_url && <button type="button" className="shop-featured-product" onClick={() => onViewListing(listing)} aria-label={`View ${listing.brand || ''} ${listing.model || 'featured hardware'}`}><img src={listing.image_url} alt="" /></button>}
      <div className="intro-stats">
        <div className="intro-stat">
          <span>STATUS</span>
          <strong>● LIVE</strong>
          <small>APPROVED LISTINGS</small>
        </div>
        <div className="intro-stat">
          <span>SAVINGS AVG.</span>
          <strong>SMART PRICES</strong>
          <small>FOR PINOY BUILDERS</small>
        </div>
      </div>
    </section>
  );
}
