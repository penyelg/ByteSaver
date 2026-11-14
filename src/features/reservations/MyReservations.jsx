import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Clock3, MessageSquare, Phone, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { MobileBrand } from '../../components/mobile/MobileNavigation';
import { peso, reservationDate, reservationRequest } from './reservationService';
import '../marketplace/styles/ListingDetailsPage.css';
import './MyReservations.css';

const labels = {
  pending: 'Awaiting payment confirmation',
  reserved: 'Reserved',
  sold: 'Sold',
  expired: 'Expired',
  failed: 'Checkout failed',
  payment_review: 'Payment needs review',
};
export default function MyReservations({ onBack }) {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState('buying');
  const [params] = useSearchParams();
  const selectedId = params.get('reservation');
  const visibleRecords = records?.filter((record) => Boolean(record.is_seller) === (view === 'selling'))
    .sort((left, right) => Number(right.id === selectedId) - Number(left.id === selectedId));

  const refresh = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const data = await reservationRequest('list');
      setRecords(data.reservations);
    } catch (failure) {
      setRecords(null);
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!records?.some((record) => record.status === 'pending' || record.status === 'reserved')) return;
    const timer = window.setTimeout(refresh, 8000);
    return () => window.clearTimeout(timer);
  }, [records, refresh]);

  async function markSold(record) {
    if (!window.confirm('Confirm you received payment directly and handed over the item. Mark this listing sold?')) return;
    setBusy(true);
    try {
      await reservationRequest('sold', { id: record.id });
      await refresh();
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  }

  return (
    <main className="details-page reservations-page">
      <MobileBrand />
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Back to marketplace</button>
      <div className="reservations-heading">
        <div><h1>Reservations</h1><p className="shop-help">Keep track of your purchases and sales.</p></div>
        <button type="button" aria-label="Refresh reservations" disabled={busy} onClick={refresh}><RefreshCw aria-hidden="true" /></button>
      </div>
      <div className="reservation-views" role="group" aria-label="Reservation type">
        <button type="button" aria-pressed={view === 'buying'} onClick={() => setView('buying')}>Buying</button>
        <button type="button" aria-pressed={view === 'selling'} onClick={() => setView('selling')}>Selling</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!records && !error && <p>Loading reservations…</p>}
      {visibleRecords?.length === 0 && <p className="reservations-empty">{view === 'buying' ? 'You haven’t reserved any items yet.' : 'Your listings have no reservations yet.'}</p>}
      {visibleRecords?.map((record) => (
        <section className="details-section reservation-card" key={record.id}>
          <div className="shop-reservation-title"><h2>{record.item_name || 'Hardware listing'}</h2><span className="reservation-status" data-status={record.status}>{labels[record.status] || record.status}</span></div>
          <strong className="shop-reservation-price">{peso.format(record.item_price)}</strong>
          {['pending', 'reserved'].includes(record.status) && <p className="shop-reservation-expiry"><Clock3 aria-hidden="true" /> Ends {reservationDate.format(new Date(record.expires_at))} (Philippine time)</p>}
          <dl className="reservation-amounts">
            <div><dt>Reservation fee</dt><dd>{peso.format(record.fee)}</dd></div>
            <div><dt>{record.is_seller ? 'Item price · Buyer pays you' : 'Item price · Pay seller directly'}</dt><dd>{peso.format(record.item_price)}</dd></div>
          </dl>
          {record.checkout_url && <p><a href={record.checkout_url}>Resume checkout</a></p>}
          {!record.is_seller && ['reserved', 'sold'].includes(record.status) && (
            <Link className="reservation-payment-link" to={`/reservations/payment?reservation=${record.id}`}>Payment details</Link>
          )}
          {record.seller_phone && Date.parse(record.expires_at) > Date.now() && (
            <div className="reservation-contact">
              <a href={'tel:' + record.seller_phone}><Phone aria-hidden="true" /> Call Seller</a>
              <a href={'sms:' + record.seller_phone}><MessageSquare aria-hidden="true" /> Text Seller</a>
            </div>
          )}
          {record.is_seller && record.status === 'reserved' && (
            <div className="shop-handover"><p><strong>Completed the handover?</strong>Confirm after receiving payment.</p><button className="details-add-cart" type="button" disabled={busy} onClick={() => markSold(record)}>Mark as sold</button></div>
          )}
        </section>
      ))}
    </main>
  );
}
