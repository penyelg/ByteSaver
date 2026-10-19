import React from 'react';
import { ShoppingBag } from 'lucide-react';

export default function CartDrawer({ cartItems, onRemoveFromCart, onClose }) {
  return (
    <div className="cart-overlay" role="presentation" onClick={() => onClose()}>
      <aside className="cart-drawer" role="dialog" aria-label="Shopping cart" onClick={(event) => event.stopPropagation()}>
        <div className="cart-drawer-heading">
          <div><span className="section-index">YOUR BAG / 04</span><h2>Saved hardware.</h2></div>
          <button type="button" className="cart-close" aria-label="Close cart" onClick={() => onClose()}>×</button>
        </div>
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
                  <div className="cart-item-copy"><span>{cartListing.category || 'Hardware'}</span><strong>{cartTitle}</strong><b>{cartListing.price == null ? 'PRICE ON REQUEST' : `₱${Number(cartListing.price).toLocaleString()}`}</b></div>
                  <button className="cart-remove" type="button" aria-label={`Remove ${cartTitle}`} onClick={() => onRemoveFromCart?.(item)}>×</button>
                </div>;
              })}
            </div>
            <div className="cart-drawer-note">Checkout and seller contact will be available in the next step.</div>
          </>
        )}
      </aside>
    </div>
  );
}
