import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, ChevronRight, EyeOff, Package, RefreshCw, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { moderationLabels } from '../../listings/utils/moderation';
import { getManagedUser } from '../services/userManagementService';
import '../styles/ListingModerationPage.css';

const pageSize = 20;
const historyPageSize = 10;
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' });
const formatPrice = (price) => price == null ? 'Price on request' : peso.format(price);

function ListingPhoto({ listing, thumbnail = false }) {
  const [failed, setFailed] = useState(false);
  return <div className={thumbnail ? 'admin-listing-thumbnail' : 'admin-listing-photo'}>
    {listing.image_url && !failed
      ? <img src={listing.image_url} alt={thumbnail ? '' : `${listing.brand} ${listing.model}`} loading={thumbnail ? 'lazy' : 'eager'} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      : <span><Package size={thumbnail ? 19 : 26} aria-hidden="true" />{!thumbnail && 'Photo unavailable'}</span>}
  </div>;
}

function ListingReview({ listing, onDecision, onClose }) {
  const [sellerName, setSellerName] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState('');
  const [historyOpened, setHistoryOpened] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const heading = useRef(null);
  const dialog = useRef(null);
  const status = listing.moderation_status;
  const actionLabel = status === 'approved' ? 'Hide listing' : status === 'hidden' ? 'Restore listing' : 'Approve listing';
  const reasonLabel = decision === 'hidden' ? 'Hide listing' : 'Reject listing';
  const specifications = Object.entries(listing.specs || {});

  useEffect(() => {
    const panel = dialog.current;
    const trigger = document.activeElement;
    panel.showModal();
    heading.current?.focus();
    return () => {
      panel.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  useEffect(() => {
    if (!listing.seller_id) return;
    const controller = new AbortController();
    async function loadSeller() {
      const { data, error } = await getManagedUser(listing.seller_id).abortSignal(controller.signal);
      if (controller.signal.aborted) return;
      setSellerName(error ? '' : data?.full_name?.trim() || data?.display_name?.trim() || '');
    }
    loadSeller();
    return () => controller.abort();
  }, [listing.seller_id]);

  useEffect(() => {
    if (!historyOpened) return;
    const controller = new AbortController();
    async function loadHistory() {
      setHistory(null);
      setHistoryError('');
      const { data, error } = await supabase.rpc('admin_listing_history', { p_listing: listing.id })
        .order('reviewed_at', { ascending: false }).order('id')
        .range(historyPage * historyPageSize, (historyPage + 1) * historyPageSize)
        .abortSignal(controller.signal);
      if (controller.signal.aborted) return;
      if (error) setHistoryError('Unable to load decision history. Refresh the queue to retry.');
      else setHistory(data);
    }
    loadHistory();
    return () => controller.abort();
  }, [listing.id, historyOpened, historyPage]);

  async function submitDecision(nextStatus) {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const { error } = await supabase.rpc('admin_moderate_listing', {
        p_listing: listing.id,
        p_revision: listing.moderation_revision,
        p_expected_status: listing.moderation_status,
        p_status: nextStatus,
        p_reason: nextStatus === 'approved' ? null : reason.trim(),
      });
      if (error) throw error;
      onDecision(nextStatus);
    } catch (failure) {
      setError(failure.message || 'Unable to save the decision.');
    } finally {
      setSaving(false);
    }
  }

  return <dialog ref={dialog} className="admin-listing-dialog" aria-labelledby="admin-listing-title"
    onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section className="admin-listing-detail">
    <header className="admin-listing-detail-header">
      <div>
        <p className="admin-listing-meta">{listing.category}</p>
        <h2 id="admin-listing-title" tabIndex={-1} ref={heading}>{listing.brand} {listing.model}</h2>
        <p className="admin-listing-meta">Submitted {date.format(new Date(listing.moderation_submitted_at))}</p>
        {listing.seller_id && <p className="admin-listing-meta admin-listing-seller">
          Submitted by <Link to={`/admin/users?user=${encodeURIComponent(listing.seller_id)}`}>
            {sellerName || 'Seller account'} <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </p>}
      </div>
      <div className="admin-listing-header-actions">
        <span className="admin-listing-status" data-status={status}>{moderationLabels[status]}</span>
        <button className="admin-secondary-button" type="button" aria-label="Close listing review" disabled={saving} onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </div>
    </header>
    <div className="admin-listing-review-body">
    <ListingPhoto listing={listing} />
    <dl className="admin-listing-facts">
      <div><dt>Price</dt><dd>{formatPrice(listing.price)}</dd></div>
      <div><dt>Condition</dt><dd>{listing.condition || 'Unspecified'}</dd></div>
    </dl>
    {listing.description && <section className="admin-listing-section">
      <h3>Description</h3>
      <p className="admin-listing-description">{listing.description}</p>
    </section>}
    {specifications.length > 0 && <section className="admin-listing-section">
      <h3>Specifications</h3>
      <dl className="admin-listing-specs">
        {specifications.map(([key, value]) => (
          <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{String(value ?? '')}</dd></div>
        ))}
      </dl>
    </section>}
    <details className="admin-listing-section" onToggle={(event) => {
      if (event.currentTarget.open) setHistoryOpened(true);
    }}>
    <summary>Decision history</summary>
    {historyError && <p role="alert">{historyError}</p>}
    {!history && !historyError && <p role="status">Loading history…</p>}
    {history?.length === 0 && <p className="admin-muted">No moderation decisions recorded.</p>}
    {history?.length > 0 && <ol className="admin-listing-history">
      {history.slice(0, historyPageSize).map((entry) => (
        <li key={entry.id}>
          <strong>{moderationLabels[entry.status]}</strong> · <time dateTime={entry.reviewed_at}>{date.format(new Date(entry.reviewed_at))}</time>
          <small>Reviewer {entry.reviewer_name || entry.reviewed_by || 'account removed'}</small>
          {entry.reason && <p>{entry.reason}</p>}
        </li>
      ))}
    </ol>}
    {history && (historyPage > 0 || history.length > historyPageSize) && (
      <div className="admin-listing-actions" aria-label="Decision history pages">
        <button className="admin-secondary-button" type="button" disabled={historyPage === 0} onClick={() => setHistoryPage((page) => page - 1)}>Previous decisions</button>
        <button className="admin-secondary-button" type="button" disabled={history.length <= historyPageSize} onClick={() => setHistoryPage((page) => page + 1)}>Next decisions</button>
      </div>
    )}
    </details>
    </div>
    <section className="admin-listing-decision" aria-label="Moderation actions">
      {decision ? <form onSubmit={(event) => { event.preventDefault(); submitDecision(decision); }}>
        <label>Reason shown to the seller
          <textarea autoFocus required minLength={3} maxLength={1000} rows={3} value={reason} disabled={saving} onChange={(event) => setReason(event.target.value)} />
        </label>
        <div className="admin-listing-actions">
          <button className="admin-listing-danger" type="submit" disabled={saving || reason.trim().length < 3}>{saving ? 'Saving…' : reasonLabel}</button>
          <button className="admin-secondary-button" type="button" disabled={saving} onClick={() => { setDecision(''); setError(''); setReason(''); }}>Cancel</button>
        </div>
      </form> : <div className="admin-listing-actions">
        {status === 'approved'
          ? <button className="admin-listing-danger" type="button" onClick={() => { setError(''); setDecision('hidden'); }}><EyeOff size={16} aria-hidden="true" />{actionLabel}</button>
          : <button className="admin-primary-button" type="button" disabled={saving} onClick={() => submitDecision('approved')}><Check size={16} aria-hidden="true" />{saving ? 'Saving…' : actionLabel}</button>}
        {status === 'pending' && <button className="admin-listing-danger" type="button" disabled={saving} onClick={() => { setError(''); setDecision('rejected'); }}><X size={16} aria-hidden="true" />Reject listing</button>}
      </div>}
      {error && <p role="alert" className="admin-error">{error}</p>}
    </section>
    </section>
  </dialog>;
}

export default function ListingModerationPage() {
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('oldest');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [listings, setListings] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selected = listings?.slice(0, pageSize).find((listing) => listing.id === selectedId);

  useEffect(() => {
    const controller = new AbortController();
    async function loadListings() {
      setListings(null);
      setError('');
      const ascending = sort === 'oldest';
      let query = supabase.rpc('admin_listing_queue', { p_status: filter })
        .select('id,seller_id,brand,model,category,condition,price,image_url,description,specs,moderation_status,moderation_revision,moderation_submitted_at');
      if (search) {
        const pattern = `"%${search.replace(/["\\]/g, '\\$&')}%"`;
        query = query.or(`brand.ilike.${pattern},model.ilike.${pattern}`);
      }
      const { data, error } = await query
        .order('moderation_submitted_at', { ascending })
        .order('id', { ascending }).range(page * pageSize, (page + 1) * pageSize).abortSignal(controller.signal);
      if (controller.signal.aborted) return;
      if (error) setError(error.message || 'Unable to load listings.');
      else if (page > 0 && data.length === 0) setPage(page - 1);
      else setListings(data);
    }
    loadListings();
    return () => controller.abort();
  }, [filter, page, revision, search, sort]);

  function handleDecision(decision) {
    setSelectedId(null);
    setNotice(`Listing marked ${moderationLabels[decision].toLowerCase()}.`);
    setRevision((value) => value + 1);
  }

  return <div className="admin-card admin-listing-workspace">
    <div className="admin-listing-toolbar">
      <div className="admin-listing-filters" role="group" aria-label="Filter by moderation status">
        {Object.entries(moderationLabels).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setSort(value === 'pending' ? 'oldest' : 'newest'); setPage(0); setSelectedId(null); setNotice(''); }}>{label}</button>
        ))}
      </div>
      <button type="button" className="admin-secondary-button" onClick={() => setRevision((value) => value + 1)}><RefreshCw size={14} aria-hidden="true" />Refresh</button>
    </div>
    <div className="admin-listing-controls">
      <form className="admin-listing-search" role="search" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); setPage(0); setSelectedId(null); }}>
        <div><Search size={16} aria-hidden="true" /><input type="search" aria-label="Search listings by brand or model" placeholder="Search brand or model" maxLength={120} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></div>
        <button className="admin-secondary-button" type="submit">Search</button>
        {search && <button className="admin-text-button" type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(0); }}>Clear</button>}
      </form>
      <label>Sort by <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(0); }}>
        <option value="oldest">Oldest first</option><option value="newest">Newest first</option>
      </select></label>
    </div>
    {notice && <p className="admin-listing-notice" role="status">{notice}</p>}
    {error && <p className="admin-error" role="alert">{error}</p>}
    {!listings && !error && <p className="admin-empty" role="status">Loading listings…</p>}
    {listings?.length === 0 && <div className="admin-listing-placeholder"><Package aria-hidden="true" /><strong>{search ? 'No listings match your search' : filter === 'pending' ? 'No listings waiting for review' : `No ${moderationLabels[filter].toLowerCase()} listings`}</strong></div>}
    {listings?.length > 0 && <div className="admin-table-scroll">
      <table className="admin-table admin-listing-table" aria-label="Listings">
        <thead><tr><th scope="col">Listing</th><th scope="col">Price</th><th scope="col">Submitted</th><th scope="col">Status</th><th scope="col"><span className="admin-sr-only">Action</span></th></tr></thead>
        <tbody>{listings.slice(0, pageSize).map((listing) => (
          <tr key={listing.id}>
            <td><div className="admin-listing-table-item">
              <ListingPhoto key={listing.image_url} listing={listing} thumbnail />
              <span><strong>{listing.brand} {listing.model}</strong><small>{listing.category} · {listing.condition}</small></span>
            </div></td>
            <td>{formatPrice(listing.price)}</td>
            <td><time dateTime={listing.moderation_submitted_at}>{date.format(new Date(listing.moderation_submitted_at))}</time></td>
            <td><span className="admin-listing-status" data-status={listing.moderation_status}>{moderationLabels[listing.moderation_status]}</span></td>
            <td><button type="button" className="admin-secondary-button" aria-haspopup="dialog" aria-label={`Review ${listing.brand} ${listing.model}`} onClick={() => { setSelectedId(listing.id); setNotice(''); }}>Review <ChevronRight size={14} aria-hidden="true" /></button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>}
    {selected && <ListingReview key={selected.id + ':' + selected.moderation_revision} listing={selected} onDecision={handleDecision} onClose={() => setSelectedId(null)} />}
    {listings && (page > 0 || listings.length > pageSize) && <div className="admin-listing-pagination">
      <button type="button" className="admin-secondary-button" disabled={page === 0} onClick={() => { setSelectedId(null); setPage(page - 1); }}>Previous</button>
      <span>Page {page + 1}</span>
      <button type="button" className="admin-secondary-button" disabled={listings.length <= pageSize} onClick={() => { setSelectedId(null); setPage(page + 1); }}>Next</button>
    </div>}
  </div>;
}
