# ByteSaver visual system

- Mode: Operate. Users are entering an account before browsing, buying, and selling hardware.
- Visual world: dark navy-black interface, electric green signal color, thin technical lines, sharp corners, restrained glow, compact information density.
- Typography: Barlow Condensed for headlines, Manrope for readable UI text, DM Mono for system labels and status data.
- Avoid: purple gradients, pill-heavy UI, excessive rounded cards, decorative icon tiles, noisy glassmorphism, generic dashboard layouts.
- Brand assets: `src/assets/bytesaver-wordmark.png` and `src/assets/bytesaver-mark.png`.
- Accessibility: preserve visible focus states, semantic labels, readable contrast, and clear auth errors.

## Buyer and seller mobile screens

- Approved reference: `output/imagegen/mobile-shopping-concept/*-brand-v2.png`. Use the original primary wordmark asset, not a recreation from the mockup.
- Mobile palette: green `#71e681`, charcoal `#101713`, surface `#1b2720`, white `#f5f7f5`, secondary text `#a7b5ac`. Tokens and mobile composition live in `src/styles/mobileShop.css`; admin styling remains separate.
- Product photos lead the two-column catalog. Use Barlow Condensed for page titles and prices, Manrope for controls and readable copy. Use green for primary actions, amber for pending review, muted red for restricted access.
- Keep four mobile tabs: Browse, Sell, Reservations, Account. Respect safe areas and give touch controls at least 44px targets.
- Sell flow: Photo → Details → Review. Preserve field values between steps; validate before advancing and submit only from Review.
- Cart and reservation summaries use a native modal dialog, styled as a bottom sheet on phones. Preserve Escape, focus containment, focus restoration, and scroll locking.
- Implement actual product capabilities. One product image is currently supported. Quote fees/durations and payment confirmations come from the backend. Avatars come from available account metadata, with a fallback.
