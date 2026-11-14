import React, { useEffect, useState } from 'react';
import { peso, reservationRequest } from './reservationService';
import { Clock3, ShieldCheck, ShoppingBag } from 'lucide-react';
import ShopDialog from '../../components/mobile/ShopDialog';

export default function ReserveListing({ listingId, listing, onAddToCart, cartMessage }) {
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [savingCart, setSavingCart] = useState(false);
  const canReserve = quote?.status === 'available' && !quote.seller && quote.enabled && Number(quote.price) > 0;

  useEffect(() => {
    let active = true;
    reservationRequest('quote', { id: listingId })
      .then((data) => { if (active) setQuote(data); })
      .catch((failure) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [listingId]);

  async function checkout() {
    setBusy(true);
    setError('');
    try {
      const { checkoutUrl } = await reservationRequest('checkout', {
        id: listingId, fee: quote.fee, holdMinutes: quote.holdMinutes, price: Number(quote.price),
      });
      window.location.assign(checkoutUrl);
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  }

  return (
    <section className="details-section reserve-panel">
      <h2>Availability</h2>
      {error && !canReserve && <p role="alert">{error}</p>}
      {!quote && !error && <p>Checking availability…</p>}
      {quote?.status === 'sold' && <p>Sold</p>}
      {quote?.status === 'reserved' && <p>Reserved. Check My Reservations for your reservation details.</p>}
      {quote?.status === 'pending' && (
        quote.checkoutUrl ? <a href={quote.checkoutUrl}>Resume checkout</a> : <p>A checkout is in progress.</p>
      )}
      {quote?.status === 'available' && quote.seller && (
        quote.enabled
          ? <p>Buyers can reserve this listing. Your profile phone number is shared with the buyer during their paid hold.</p>
          : <p>This listing needs an active, approved seller account with a valid contact number to accept reservations.</p>
      )}
      {quote?.status === 'available' && !quote.seller && (
        canReserve ? (
          <>
            <p className="shop-availability"><ShieldCheck aria-hidden="true" /> Available to reserve</p>
            <p>Reserve for {peso.format(quote.fee)}. Pay the item price directly to the seller.</p>
          </>
        ) : <p>This listing can accept reservations once the seller meets the account and contact requirements.</p>
      )}
      <div className="shop-product-actions">
        {cartMessage && <p role="status" className="details-cart-message">{cartMessage}</p>}
        <div>
          <button className="shop-secondary" type="button" disabled={savingCart} onClick={async () => { setSavingCart(true); try { await onAddToCart(); } finally { setSavingCart(false); } }}><ShoppingBag aria-hidden="true" />{savingCart ? 'Saving…' : 'Save to cart'}</button>
          <button className="shop-primary" type="button" disabled={!canReserve || busy} onClick={() => setOpen(true)}>{quote?.status === 'sold' ? 'Sold' : quote?.status === 'reserved' ? 'Reserved' : 'Reserve item'}</button>
        </div>
      </div>
      {open && canReserve && <ShopDialog title="Reserve this item" onClose={() => { if (!busy) setOpen(false); }} className="reservation-sheet">
        <div className="shop-reserve-product">
          {listing?.image_url && <img src={listing.image_url} alt="" />}
          <div><strong>{listing?.brand} {listing?.model}</strong><span>{peso.format(quote.price)}</span></div>
        </div>
        <dl className="shop-costs">
          <div><dt>Reservation fee</dt><dd>{peso.format(quote.fee)}</dd></div>
          <div><dt><Clock3 aria-hidden="true" /> Hold duration</dt><dd>{quote.holdMinutes % 60 === 0 ? `${quote.holdMinutes / 60} hours` : `${quote.holdMinutes} minutes`}</dd></div>
          <div><dt>Item price · pay seller directly</dt><dd>{peso.format(quote.price)}</dd></div>
          <div className="shop-due"><dt>Due now</dt><dd>{peso.format(quote.fee)}</dd></div>
        </dl>
        <p className="shop-help">Your hold starts after payment. Find the seller’s contact details in My Reservations.</p>
        <p className="shop-test-note">Xendit Test Mode · uses virtual funds</p>
        {error && <p role="alert" className="shop-error">{error}</p>}
        <button className="shop-primary" type="button" disabled={busy} onClick={checkout}>{busy ? 'Opening checkout…' : 'Continue to payment'}</button>
      </ShopDialog>}
    </section>
  );
}
