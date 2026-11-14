import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Clock3, ImageOff, Package, Pencil, Plus, TriangleAlert } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { MobileBrand } from '../../../components/mobile/MobileNavigation';
import ShopDialog from '../../../components/mobile/ShopDialog';
import { moderationLabels } from '../utils/moderation';
import '../styles/listings.css';
import '../styles/SellListingPage.css';
import '../styles/ManageListingsPage.css';

const listingFields = 'id, brand, model, category, price, condition, description, image_url, moderation_status, moderation_reason';
const conditions = ['Like new', 'Excellent', 'Good', 'Fair'];
const pesos = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const filters = [['all', 'All listings'], ['approved', 'Approved'], ['pending', 'Pending'], ['hidden', 'Hidden']];
const summaries = [
  { status: 'approved', label: 'Approved', icon: CheckCircle2 },
  { status: 'pending', label: 'Awaiting review', icon: Clock3 },
];

function ListingPhoto({ listing }) {
  const [failed, setFailed] = useState(false);
  return <div className="seller-listing-photo">
    {listing.image_url && !failed
      ? <img src={listing.image_url} alt="" loading="lazy" onError={() => setFailed(true)} />
      : <ImageOff aria-label="No product photo" role="img" />}
  </div>;
}

export default function ManageListingsPage({ sellerId, onBack, onSell }) {
  const { state } = useLocation();
  const [listings, setListings] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(state?.listingSubmitted ? 'Listing submitted for review.' : '');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const filtered = (listings || []).filter((listing) => filter === 'all' || listing.moderation_status === filter);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pageCount);
  const counts = (listings || []).reduce((totals, listing) => {
    totals[listing.moderation_status] = (totals[listing.moderation_status] || 0) + 1;
    return totals;
  }, { all: listings?.length || 0 });

  function closeEditor() {
    if (saving) return;
    setEditing(null);
    setError('');
  }

  useEffect(() => {
    let active = true;
    async function loadListings() {
      const { data, error } = await supabase.from('listings').select(listingFields)
        .eq('seller_id', sellerId).order('created_at', { ascending: false });
      if (!active) return;
      if (error) setError('Unable to load your listings. Refresh to try again.');
      else setListings(data);
    }
    loadListings();
    return () => { active = false; };
  }, [sellerId]);

  async function saveListing(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const changes = {
      brand: fields.get('brand').trim(),
      model: fields.get('model').trim(),
      price: Number(fields.get('price')),
      condition: fields.get('condition'),
      description: fields.get('description').trim(),
    };
    if (!changes.brand || !changes.model || !Number.isFinite(changes.price) || changes.price <= 0) {
      setError('Enter a brand, model, and valid price.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { data, error } = await supabase.from('listings').update(changes)
        .eq('id', editing.id).eq('seller_id', sellerId).select(listingFields).single();
      if (error) throw error;
      setListings((current) => current.map((listing) => listing.id === data.id ? data : listing));
      setEditing(null);
      setNotice(data.moderation_status === 'pending' ? 'Listing saved and awaiting review.' : 'Listing saved.');
    } catch (failure) {
      setError(failure.code === 'P0001' ? failure.message : 'Unable to save this listing. Refresh and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="sell-page shop-manage-page">
      <MobileBrand />
      <section className="seller-workspace" aria-labelledby="seller-heading">
        <nav className="seller-topbar" aria-label="Seller navigation">
          <button type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Marketplace</button>
          <Link to="/reservations">Reservations <ArrowUpRight aria-hidden="true" /></Link>
        </nav>
        <header className="seller-heading">
          <div><span className="seller-eyebrow">YOUR SELLER SPACE</span><h1 id="seller-heading">My listings</h1></div>
          <button className="shop-primary" type="button" onClick={onSell}><Plus aria-hidden="true" /> Create listing</button>
          <p>Keep your hardware ready for its next owner.</p>
        </header>
        {listings && <>
          <div className="seller-summary" role="group" aria-label="Listing status summary">
            {summaries.map(({ status, label, icon: Icon }) => <button type="button" key={status} data-status={status} aria-pressed={filter === status} onClick={() => { setFilter(status); setPage(1); }}>
              <span className="seller-summary-value"><strong>{counts[status] || 0}</strong><Icon aria-hidden="true" /></span>
              <span>{label}</span>
            </button>)}
          </div>
          <div className="seller-filter-bar" role="group" aria-label="Filter your listings">
            {filters.map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setPage(1); }}>{label}<span>{counts[value] || 0}</span></button>)}
          </div>
          <p className="seller-result-count" role="status">{filtered.length ? `Showing ${(currentPage - 1) * 10 + 1}–${Math.min(currentPage * 10, filtered.length)} of ${filtered.length} listings` : '0 listings'}<span>Newest first</span></p>
        </>}
        {error && !editing && <p className="sell-notice sell-notice--error" role="alert">{error}</p>}
        {notice && <p className="sell-notice" role="status">{notice}</p>}
        {!listings && !error && <div className="seller-loading" role="status"><Package aria-hidden="true" /> Loading your listings…</div>}
        {listings?.length === 0 && <div className="seller-empty"><Package aria-hidden="true" /><h2>Your next sale starts here</h2><p>Add a photo and a few details. We’ll review your hardware before it goes live.</p><button className="shop-primary" type="button" onClick={onSell}><Plus aria-hidden="true" /> Create your first listing</button></div>}
        {listings?.length > 0 && !filtered.length && <div className="seller-empty"><Package aria-hidden="true" /><h2>No listings here yet</h2><p>You don’t have any listings in this status.</p><button className="shop-secondary" type="button" onClick={() => { setFilter('all'); setPage(1); }}>View all listings</button></div>}
        {filtered.length > 0 && <ul className="manage-listings">
          {filtered.slice((currentPage - 1) * 10, currentPage * 10).map((listing) => (
            <li className="seller-listing" key={listing.id}>
              <div className="seller-listing-product">
                <ListingPhoto listing={listing} />
                <div className="seller-listing-copy">
                  <p className="seller-listing-category">{listing.category}</p>
                  <h2>{listing.brand} {listing.model}</h2>
                  <p className="seller-listing-condition">{listing.condition}</p>
                  <strong className="seller-listing-price">{listing.price == null ? 'Price on request' : pesos.format(listing.price)}</strong>
                </div>
              </div>
              {listing.moderation_reason && <p className="seller-review-note"><TriangleAlert aria-hidden="true" /><span><strong>Review note</strong>{listing.moderation_reason}</span></p>}
              <footer className="seller-listing-footer">
                <span className="shop-moderation-status" data-status={listing.moderation_status}>{moderationLabels[listing.moderation_status] || 'Awaiting status'}</span>
                <button type="button" aria-label={`Edit listing: ${listing.brand} ${listing.model}`} onClick={() => { setEditing(listing); setNotice(''); setError(''); }}><Pencil aria-hidden="true" /> Edit listing</button>
              </footer>
            </li>
          ))}
        </ul>}
        {pageCount > 1 && <nav className="shop-pagination" aria-label="Listing pages"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></nav>}
      </section>
      {editing && <ShopDialog title="Edit listing" className="seller-edit-dialog" onClose={closeEditor}>
          <div className="seller-edit-product"><ListingPhoto listing={editing} /><div><span>{editing.category}</span><strong>{editing.brand} {editing.model}</strong></div></div>
          <p className="seller-edit-note"><Clock3 aria-hidden="true" /><span>Changes are reviewed before your updated listing appears in the marketplace.</span></p>
          {error && <p className="sell-notice sell-notice--error" role="alert">{error}</p>}
          <form key={editing.id} className="listing-form seller-edit-form" onSubmit={saveListing} aria-busy={saving}>
            <label>Brand <input name="brand" defaultValue={editing.brand} required /></label>
            <label>Model <input name="model" defaultValue={editing.model} required /></label>
            <label>Price (₱) <input name="price" type="number" min="0.01" step="0.01" defaultValue={editing.price} required /></label>
            <label>Condition
              <select name="condition" defaultValue={editing.condition}>
                {editing.condition && !conditions.includes(editing.condition) && <option>{editing.condition}</option>}
                {conditions.map((condition) => <option key={condition}>{condition}</option>)}
              </select>
            </label>
            <label className="listing-form-wide">Description <textarea name="description" defaultValue={editing.description} rows={4} /></label>
            <div className="seller-edit-actions listing-form-wide">
              <button className="shop-secondary" type="button" disabled={saving} onClick={closeEditor}>Cancel</button>
              <button className="shop-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>
      </ShopDialog>}
    </main>
  );
}
