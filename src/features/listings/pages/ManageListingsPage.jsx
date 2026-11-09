import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { MobileBrand } from '../../../components/mobile/MobileNavigation';
import '../styles/listings.css';
import '../styles/SellListingPage.css';
import '../styles/ManageListingsPage.css';

const listingFields = 'id, brand, model, category, price, condition, description, image_url';
const conditions = ['Like new', 'Excellent', 'Good', 'Fair'];
const pesos = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

export default function ManageListingsPage({ sellerId, onBack, onSell }) {
  const [listings, setListings] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

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
      setSaved(true);
    } catch (failure) {
      setError(failure.code === 'P0001' ? failure.message : 'Unable to save this listing. Refresh and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="sell-page">
      <MobileBrand />
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Back to marketplace</button>
      <section className="sell-page-panel">
        <div className="sell-page-heading">
          <div><h1>Manage Listings</h1><p>View and update the hardware you have listed.</p></div>
        </div>
        <div className="manage-listing-actions">
          <button className="publish-button" type="button" onClick={onSell}>Create listing</button>
          <Link className="back-button" to="/reservations">My Reservations</Link>
        </div>
        {error && <p className="sell-notice sell-notice--error" role="alert">{error}</p>}
        {saved && <p className="sell-notice" role="status">Listing updated.</p>}
        {!listings && !error && <p>Loading your listings…</p>}
        {listings?.length === 0 && <p>You haven’t posted any listings yet.</p>}
        {editing ? (
          <form key={editing.id} className="listing-form" onSubmit={saveListing}>
            <h2 className="listing-form-wide">Edit {editing.brand} {editing.model}</h2>
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
            <div className="manage-listing-actions listing-form-wide">
              <button className="publish-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              <button className="back-button" type="button" disabled={saving} onClick={() => { setEditing(null); setError(''); }}>Cancel</button>
            </div>
          </form>
        ) : (
          <ul className="manage-listings">
            {listings?.map((listing) => (
              <li key={listing.id}>
                {listing.image_url && <img src={listing.image_url} alt="" />}
                <div>
                  <strong>{listing.brand} {listing.model}</strong>
                  <p>{listing.category} · {listing.price == null ? 'Price on request' : pesos.format(listing.price)}</p>
                </div>
                <button className="back-button" type="button" onClick={() => { setEditing(listing); setSaved(false); }}>Edit listing</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
