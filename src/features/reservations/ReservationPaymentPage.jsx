import React, { useEffect, useState } from 'react';
import { CircleCheck, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MobileBrand } from '../../components/mobile/MobileNavigation';
import { peso, reservationDate, reservationRequest } from './reservationService';
import '../marketplace/styles/ListingDetailsPage.css';
import './ReservationPaymentPage.css';

const reservationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ReservationPaymentPage({ reservationId, onBrowse }) {
  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const [check, setCheck] = useState(0);

  useEffect(() => {
    if (!reservationIdPattern.test(reservationId)) {
      setError('Open My Reservations to find your payment.');
      setChecking(false);
      return;
    }

    let active = true;
    let timer;
    const deadline = Date.now() + 30000;

    async function loadPayment() {
      try {
        const { reservation } = await reservationRequest('payment-status', { id: reservationId });
        if (!active) return;
        setReservation(reservation);
        const pending = reservation.status === 'pending' && Date.parse(reservation.expires_at) > Date.now();
        if (pending && Date.now() < deadline) timer = window.setTimeout(loadPayment, 2000);
        else setChecking(false);
      } catch (failure) {
        if (!active) return;
        setError(failure.message);
        setChecking(false);
      }
    }

    loadPayment();
    return () => { active = false; window.clearTimeout(timer); };
  }, [reservationId, check]);

  const confirmed = Boolean(reservation?.paid_at && reservation?.xendit_payment_id &&
    ['reserved', 'sold', 'expired'].includes(reservation.status));
  const expired = reservation?.status === 'expired' ||
    (['pending', 'reserved'].includes(reservation?.status) && Date.parse(reservation.expires_at) <= Date.now());
  const pending = reservation?.status === 'pending' && !expired;
  const canCheckAgain = error ? reservationIdPattern.test(reservationId) : pending;

  let title = 'Payment confirmation';
  let message = error;
  if (confirmed) {
    title = 'Payment Successful';
    message = expired ? 'Your reservation hold has ended.' : reservation.status === 'sold' ? 'The seller marked this item sold.' : 'Your item is reserved.';
  } else if (checking) {
    title = 'Confirming payment…';
    message = 'Waiting for Xendit to confirm your reservation fee.';
  } else if (!error) {
    if (reservation?.status === 'payment_review') message = 'Your payment was received and the reservation needs review.';
    else if (expired) message = 'This checkout expired before ByteSaver confirmed a payment.';
    else if (pending) message = 'Payment confirmation is still pending. You can check again or open My Reservations.';
    else message = 'ByteSaver couldn’t confirm a payment for this reservation.';
  }

  return (
    <main className="details-page payment-result-page">
      <section className="payment-result-card" aria-labelledby="payment-result-title">
        <MobileBrand />
        <div className="payment-result-heading" role="status">
          {confirmed ? <CircleCheck aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
          <h1 id="payment-result-title">{title}</h1>
          <p>{message}</p>
        </div>
        {confirmed && (
          <dl className="payment-result-details">
            <div><dt>Item</dt><dd>{reservation.item_name || 'Hardware listing'}</dd></div>
            <div><dt>Reservation fee paid</dt><dd>{peso.format(reservation.fee)}</dd></div>
            <div><dt>Payment reference</dt><dd>{reservation.xendit_payment_id}</dd></div>
            <div><dt>Hold expiry</dt><dd>{reservationDate.format(new Date(reservation.expires_at))} (Philippine time)</dd></div>
            {reservation.status === 'reserved' && !expired && <div><dt>Pay seller directly</dt><dd>{peso.format(reservation.item_price)}</dd></div>}
          </dl>
        )}
        <div className="payment-result-actions">
          {canCheckAgain && !checking && <button type="button" onClick={() => { setError(''); setChecking(true); setCheck((value) => value + 1); }}>Check payment again</button>}
          <Link to={confirmed ? `/reservations?reservation=${reservation.id}` : '/reservations'}>
            {confirmed ? 'View Reservation' : 'My Reservations'}
          </Link>
          <button type="button" onClick={onBrowse}>Back to Marketplace</button>
        </div>
      </section>
    </main>
  );
}
