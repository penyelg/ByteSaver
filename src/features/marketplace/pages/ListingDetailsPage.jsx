import React from 'react'
import { ArrowLeft } from 'lucide-react'
import './ListingDetailsPage.css'

export default function ListingDetailsPage({ listing, onBack, onAddToCart }) {
  const [cartMessage, setCartMessage] = React.useState('')
  const specs = listing.specs && typeof listing.specs === 'object' ? listing.specs : {}
  const imageUrl = listing.image_url || ''
  const price = listing.price === null || listing.price === undefined ? 'PRICE ON REQUEST' : `₱${Number(listing.price).toLocaleString()}`

  const title = `${listing.brand || ''} ${listing.model || ''}`.trim() || 'Untitled listing'

  const handleAddToCart = async () => {
    const result = await onAddToCart?.(listing)
    if (result?.alreadyInCart) setCartMessage('Already in your cart')
    else if (result?.error) setCartMessage(result.error)
    else setCartMessage('Added to your cart')
  }

  return <main className="details-page">
    <button className="back-button" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> BACK TO MARKETPLACE</button>
    <section className="details-layout">
      <div className="details-media-column">
        <div className="details-image">
          <span className="details-image-label">PRODUCT PHOTO / 01</span>
          {imageUrl ? <img src={imageUrl} alt={title} /> : <span>{(listing.category || 'Hardware').slice(0, 3).toUpperCase()}</span>}
        </div>
        <div className="details-media-note"><span>●</span> Seller-provided image</div>
      </div>
      <div className="details-copy">
        <span className="section-index">LISTING / 03</span>
        <div className="details-heading-row"><span className="details-category">{listing.category || 'Hardware'}</span><span className="details-condition-badge">{listing.condition || 'Pre-owned'}</span></div>
        <h1>{title}</h1>
        <div className="details-price-row"><strong className="details-price">{price}</strong><span className="details-trust">● TECH VERIFIED</span></div>
        <button className="details-add-cart" type="button" onClick={handleAddToCart}>ADD TO CART <span>↗</span></button>
        {cartMessage && <div className="details-cart-message">{cartMessage}</div>}
        <div className="details-facts"><div><span>CONDITION</span><strong>{listing.condition || 'Pre-owned'}</strong></div><div><span>CATEGORY</span><strong>{listing.category || 'Hardware'}</strong></div></div>
        <div className="details-section"><h2>Description</h2><p>{listing.description || 'No description provided.'}</p></div>
        {Object.keys(specs).length > 0 && <div className="details-section"><h2>Specifications</h2><dl>{Object.entries(specs).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{value}</dd></div>)}</dl></div>}
      </div>
    </section>
  </main>
}
