import React from 'react';
import { ShoppingBag, X } from 'lucide-react';
import ShopDialog from '../../../components/mobile/ShopDialog';
import '../styles/CartDrawer.css';

export default function CartDrawer({ cartItems, onRemoveFromCart, onViewListing, onClose }) {
  return (
    <ShopDialog title="Your cart" className="shop-cart" onClose={onClose}>
        <p className="shop-help">Keep your next upgrades in one place.</p>
        {cartItems.length === 0 ? (
          <div className="cart-empty"><ShoppingBag aria-hidden="true" /><p>Your cart is empty.</p><small>Add a listing to keep it here.</small></div>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map((item) => {
                const cartListing = item.listing || {};
                const cartTitle = `${cartListing.brand || ''} ${cartListing.model || ''}`.trim() || 'Untitled listing';
                return <div className="cart-item" key={item.id}>
                  <div className="cart-item-image">{cartListing.image_url ? <img src={cartListing.image_url} alt="" /> : <span>{(cartListing.category || 'HW').slice(0, 2)}</span>}</div>
                  <div className="cart-item-copy"><span>{cartListing.category || 'Hardware'}</span><strong>{cartTitle}</strong><b>{cartListing.price == null ? 'PRICE ON REQUEST' : `₱${Number(cartListing.price).toLocaleString()}`}</b>{cartListing.id && <button type="button" className="shop-view-item" onClick={() => { onClose(); onViewListing?.(cartListing); }}>View item</button>}</div>
                  <button className="cart-remove" type="button" aria-label={`Remove ${cartTitle}`} onClick={() => onRemoveFromCart?.(item)}><X aria-hidden="true" /></button>
                </div>;
              })}
            </div>
            <div className="cart-drawer-note">Open a listing to check availability and reserve it.</div>
          </>
        )}
        <button className="shop-primary" type="button" onClick={onClose}>Continue browsing</button>
    </ShopDialog>
  );
}
