import React from 'react';
import { ClipboardList, Heart, LayoutGrid, Plus, Search, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import wordmark from '../../../assets/bytesaver-wordmark-primary.png';
import AccountMenu from '../../account/components/AccountMenu';
import '../styles/marketplace.css';
import '../styles/MarketplaceHeader.css';

export default function MarketplaceHeader({ session, cartItems, onSell, onOpenCart, onReviewIdentities, query, onSearch }) {
  return (
    <header className="marketplace-header">
      <a
        className="marketplace-logo"
        href="#browse"
        aria-label="ByteSaver marketplace home"
      >
        <img
          src={wordmark}
          alt="ByteSaver — Smart Upgrades. Lighter Price."
        />
      </a>
      <nav className="marketplace-nav" aria-label="Main navigation">
        <a className="active" href="#browse">
          <span className="nav-icon">
            <LayoutGrid aria-hidden="true" />
          </span>
          <span>Browse</span>
          <small>01</small>
        </a>
        <a
          href="#sell"
          onClick={(event) => {
            event.preventDefault();
            onSell();
          }}
        >
          <span className="nav-icon">
            <Plus aria-hidden="true" />
          </span>
          <span>Sell hardware</span>
          <small>02</small>
        </a>
        <Link to="/listings/manage">
          <span className="nav-icon">
            <ClipboardList aria-hidden="true" />
          </span>
          <span>Manage Listings</span>
        </Link>
      </nav>
      <div className="header-actions">
        <label className="header-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search GPUs, CPUs, DDR5"
            aria-label="Search GPUs, CPUs, DDR5"
          />
        </label>
        <button
          className="header-icon-button header-favorites-button"
          type="button"
          aria-label="Favorites"
        >
          <Heart aria-hidden="true" />
        </button>
        <button
          className="header-icon-button header-bag-button"
          type="button"
          aria-label="Shopping bag"
          onClick={() => onOpenCart()}
        >
          <ShoppingBag aria-hidden="true" />
          <span>{cartItems.length}</span>
        </button>
      </div>
      <AccountMenu session={session} onReviewIdentities={onReviewIdentities} />
    </header>
  );
}
