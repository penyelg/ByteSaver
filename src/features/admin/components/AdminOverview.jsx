import React, { useEffect, useState } from 'react';
import { ArrowRight, ClipboardCheck, Package, ShieldCheck, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import '../styles/AdminOverview.css';

const formatDate = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' });
const formatNumber = new Intl.NumberFormat('en-PH');

export default function AdminOverview({ summary, pending, loading, onReview, onUsers, onListings }) {
  const [listingQueue, setListingQueue] = useState(null);

  useEffect(() => {
    if (loading) return;
    const controller = new AbortController();
    async function loadListingQueue() {
      setListingQueue(null);
      const result = await supabase.rpc('admin_listing_queue', { p_status: 'pending' }, { count: 'exact' })
        .select('id,brand,model,category,moderation_submitted_at')
        .order('moderation_submitted_at').order('id').limit(5).abortSignal(controller.signal);
      if (!controller.signal.aborted) setListingQueue(result);
    }
    loadListingQueue();
    return () => controller.abort();
  }, [loading]);

  const queues = [
    { key: 'id', title: 'ID verification', icon: ShieldCheck, count: summary?.pending_review,
      waiting: loading, open: () => onReview(),
      rows: pending.map((row) => ({ id: row.id, name: row.full_name, detail: row.id_type, date: row.submitted_at })) },
    { key: 'listing', title: 'Listing approval', icon: Package, count: listingQueue?.count,
      waiting: loading || !listingQueue, error: listingQueue?.error, open: onListings,
      rows: (listingQueue?.data ?? []).map((row) => ({ id: row.id, name: [row.brand, row.model].filter(Boolean).join(' '), detail: row.category, date: row.moderation_submitted_at })) },
  ];

  return <div className="admin-overview">
    {queues.map(({ key, title, icon: Icon, count, waiting, error, open, rows }) => (
      <section key={key} className="overview-inbox" aria-labelledby={`overview-${key}`} aria-busy={waiting}>
        <header className="overview-queue-heading">
          <span className="overview-row-icon" data-type={key}><Icon size={19} aria-hidden="true" /></span>
          <div><h2 id={`overview-${key}`}>{title}</h2>
            <p>Oldest submissions first</p>
          </div>
          {!waiting && !error && count != null && (
            <span className="overview-pending-count" data-has-pending={count > 0}>
              <strong>{formatNumber.format(count)}</strong> pending
            </span>
          )}
          <button className="overview-row-action" type="button" onClick={open}>Open queue <ArrowRight size={15} aria-hidden="true" /></button>
        </header>
        {waiting ? <p className="overview-message" role="status">Loading submissions…</p>
          : error ? <p className="overview-message" role="alert">Listings are unavailable. Use Refresh to try again.</p>
          : rows.length === 0 ? <p className="overview-message"><ClipboardCheck size={20} aria-hidden="true" /> No pending submissions</p>
          : <ul className="overview-rows">{rows.map((row) => <li key={row.id}>
            <div className="overview-row-name"><strong>{row.name}</strong><small>{row.detail}</small></div>
            <time dateTime={row.date}>{formatDate.format(new Date(row.date))}</time>
          </li>)}</ul>}
      </section>
    ))}
    <button type="button" className="admin-secondary-button overview-users-link" onClick={onUsers}><Users size={16} aria-hidden="true" /> Manage users</button>
  </div>;
}
