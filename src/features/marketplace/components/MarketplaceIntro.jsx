import React from 'react';

export default function MarketplaceIntro({ onSell }) {
  return (
    <section className="marketplace-intro" id="browse">
      <div className="intro-copy">
        <div className="intro-badges">
          <span className="section-index">● MARKETPLACE / 01</span>
        </div>
        <h1>
          Smart upgrades.
          <br />
          <em>Lighter price.</em>
        </h1>
        <p>
          Pre-owned computer hardware, checked by people who know the
          difference.
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
