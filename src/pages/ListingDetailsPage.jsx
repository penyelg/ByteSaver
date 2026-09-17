import React from 'react'
import { ArrowLeft } from 'lucide-react'
import './ListingDetailsPage.css'

export default function ListingDetailsPage({ listing, onBack }) {
  const specs = listing.specs && typeof listing.specs === 'object' ? listing.specs : {}
  const imageUrl = listing.image_url || ''
  const price = listing.price === null || listing.price === undefined ? 'PRICE ON REQUEST' : `₱${Number(listing.price).toLocaleString()}`

  return <main className="details-page">
    <button className="back-button" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> BACK TO MARKETPLACE</button>
    <section className="details-layout">
      <div className="details-image">{imageUrl ? <img src={imageUrl} alt={`${listing.brand || ''} ${listing.model || ''}`} /> : <span>{(listing.category || 'Hardware').slice(0, 3).toUpperCase()}</span>}</div>
      <div className="details-copy">
        <span className="section-index">LISTING / 03</span>
        <span className="details-category">{listing.category || 'Hardware'}</span>
        <h1>{listing.brand} {listing.model}</h1>
        <strong className="details-price">{price}</strong>
        <p className="details-condition">{listing.condition || 'Pre-owned'}</p>
        <div className="details-section"><h2>Description</h2><p>{listing.description || 'No description provided.'}</p></div>
        {Object.keys(specs).length > 0 && <div className="details-section"><h2>Specifications</h2><dl>{Object.entries(specs).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{value}</dd></div>)}</dl></div>}
      </div>
    </section>
  </main>
}
