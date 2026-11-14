# Mobile shopping interface

The buyer/seller pages now follow the approved green, charcoal, and white mobile concepts. The responsive layout activates at 800px and below. Existing desktop layouts still work; the listing wizard and native dialogs are shared between screen sizes.

## What changed

- Browse: two-column product cards with a full-card tap target, compact search and category controls, a banner featuring an actual available listing, and lazy-loaded catalog photos. The existing marketplace RPC now receives server-side search, category, condition, price, ordering, and a 10-row range with an exact matching count. Search includes brand and model; filters and sorting reset the page. Search/price input is debounced, obsolete requests are aborted, tied results use a unique ID order, and an error can be retried. No database migration is required.
- Listing details: product photo, prominent price, description/specifications, and fixed Save to cart / Reserve item actions.
- Reservation: a summary sheet displays the server quote before the existing checkout call. Fee, duration, eligibility, and payment confirmation continue to use the existing backend. No fixed mockup fee is used.
- Cart: native modal with item navigation and a Continue browsing action. It remains a saved-items cart, not a checkout-all basket.
- Selling: Photo, Details, and Review steps; entered data and the selected file survive backward navigation. The original upload and pending-approval insert remain in place. Preview object URLs are released when replaced or unmounted.
- My listings: a seller workspace with clickable moderation summaries, counted status filters, photo-led cards, highlighted prices, review notes, and 10 visible listings per page. Cards use two columns on desktop and one on mobile. Editing opens in a native dialog (a compact sheet on mobile) with focus restoration and existing save/review behavior. Missing or failed images have a fallback. This pagination limits rendering; the existing query still fetches the seller's listings. Server-side pagination is a separate follow-up.
- Reservations: distinct Buying/Selling tabs, status labels, prominent item prices, hold expiry, available seller contact actions, and seller completion action. No unavailable buyer-contact or avatar fields have been fabricated.
- Account: larger Google avatar with fallback, verification label, expandable personal details, listing/reservation links, and sign-out.
- Authentication and verification: matching colors, Google sign-in first in both visual and keyboard order, and clearer pending/suspended states. The decorative WebGL backdrop is lazy-loaded only for desktop users who allow motion.

No schema, RLS, authentication authorization, or payment-provider settings were changed for this UI work. The generated boards are design references; production continues to use real data and the existing single-photo upload capability.

## Verification

`npm run build` validates the production bundle. `output/mobile-ui-qa/smoke.mjs` runs the application in headless Edge with isolated API fixtures. It checks layout at 320, 390, 768, and 1280 pixels; brand/model search; cart-to-details navigation; server-provided quote values; Escape dismissal; required photo validation; wizard persistence and submission payload; 10-row pagination and filtering; and account/verification/payment states. Screenshots are saved in the same folder. Fixture product images use the ByteSaver mark solely for layout checks; these sample records and images are never inserted into the database.

Physical-device gestures, Safari, real uploads, live sign-in, and live payment processing were not exercised by these fixture checks.

Manage Listings has an isolated check in `output/mobile-ui-qa/manage.mjs` for 320/390/1280px layouts, pagination, status filters, empty states, modal Escape/focus restoration, and saving an edit with fixture data.

Browse pagination has a separate isolated check in `output/mobile-ui-qa/pagination.mjs`: first/last pages, Previous/Next boundaries, result counts, cross-field search, category/condition filters, sort/page reset, empty results, retry, and layout at 320, 390, and 1280px. Live read-only database verification returned 17 matching rows across pages of 10 and 7 with no overlap at verification time.
