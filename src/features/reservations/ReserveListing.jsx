import React, { useEffect, useState } from 'react';
import { peso, reservationRequest } from './reservationService';

export default function ReserveListing({ listingId }) {
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
      <h2>Reserve this item</h2>
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
            <dl className="reservation-costs">
              <div><dt>Reservation fee</dt><dd>{peso.format(quote.fee)} online</dd></div>
              <div><dt>Item price</dt><dd>{peso.format(quote.price)} to seller</dd></div>
            </dl>
            <p>{quote.holdMinutes % 60 === 0 ? `${quote.holdMinutes / 60}-hour` : `${quote.holdMinutes}-minute`} hold after payment. Contact details appear in My Reservations.</p>
            <p>Xendit Test Mode uses virtual funds.</p>
            <div className="reserve-actions">
              {error && <p role="alert">{error}</p>}
              <button className="details-add-cart" type="button" disabled={busy} onClick={checkout}>
                {busy ? 'Opening checkout…' : 'Reserve Item'}
              </button>
            </div>
          </>
        ) : <p>This listing can accept reservations once the seller meets the account and contact requirements.</p>
      )}
    </section>
  );
}
