import React, { useState } from 'react';
import { firstValue } from '../utils/listingUtils';

export default function ListingCard({ listing, onView }) {
  const brand = firstValue(listing, ["brand"], "");
  const model = firstValue(listing, ["model"], "");
  const title = firstValue(
    listing,
    ["title", "name", "listing_title"],
    `${brand} ${model}`.trim() || "Untitled listing",
  );
  const category = firstValue(
    listing,
    ["category_name", "category", "category_title"],
    "Hardware",
  );
  const price = firstValue(listing, ["price", "asking_price", "amount"], null);
  const condition = firstValue(
    listing,
    ["condition", "item_condition"],
    "Pre-owned",
  );
  const imageUrl = firstValue(
    listing,
    ["image_url", "image", "thumbnail_url"],
    "",
  );
  const specSummary = Object.entries(
    listing.specs && typeof listing.specs === "object" ? listing.specs : {},
  )
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 3)
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${value}`)
    .join("  ·  ");
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="listing-card">
      <div className="listing-image">
        <span className="listing-condition-badge">{condition}</span>
        {imageUrl && !imageFailed ? (
          <img src={imageUrl} alt="" onError={() => setImageFailed(true)} />
        ) : (
          <span className="listing-image-fallback">
            {category.slice(0, 3).toUpperCase()}
          </span>
        )}
      </div>
      <div className="listing-meta">
        <span>{category}</span>
        <strong>{title}</strong>
        {specSummary && <p className="listing-specs">{specSummary}</p>}
        <div className="listing-bottom">
          <b>
            {price === null
              ? "PRICE ON REQUEST"
              : `₱${Number(price).toLocaleString()}`}
          </b>
          <button type="button" onClick={onView}>
            VIEW ITEM ↗
          </button>
        </div>
      </div>
    </article>
  );
}
