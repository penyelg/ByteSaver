# Stylesheet ownership

Each feature keeps its CSS in a `styles/` directory. A page or extracted component imports the file named after it. Shared theme and control rules have a lowercase feature filename, and are imported before that page's or component's own stylesheet.

```text
src/features/
  account/styles/
    account.css
    ProfileSetupPage.css
    VerificationPendingPage.css
    AccountSuspendedPage.css
    AccountMenu.css
  admin/styles/
    admin.css
    AdminDashboardPage.css
    AdminOverview.css
    IdentityReviewPage.css
    UserManagementPage.css
  auth/styles/
    AuthPage.css
  cart/styles/
    CartDrawer.css
  listings/styles/
    listings.css
    SellListingPage.css
  marketplace/styles/
    marketplace.css
    MarketplacePage.css
    MarketplaceHeader.css
    MarketplaceIntro.css
    MarketplaceFilters.css
    ListingCard.css
    ListingDetailsPage.css
```

- `account.css` supplies the shared account panel, typography, buttons and feedback. `ProfileSetupPage.css` owns the stepper, fields, photo controls and bounded Identification scrolling. Pending and suspended pages own their notice/message spacing in their separate stylesheets.
- `admin.css` supplies workspace theme variables, reusable controls, cards, tables, feedback and the detail/form styles shared by identity review and user management. Shell, overview, queue and directory rules live in their respective files, including their responsive overrides.
- `marketplace.css` contains the small text utilities shared by marketplace sections. Page layout and the header, intro, filters and listing cards import separate files. `AccountMenu` and `CartDrawer` import CSS from their own features.
- `listings.css` contains the older listing-form base rules previously embedded in marketplace CSS. `SellListingPage.css` supplies the current sell-page layout and form overrides. Their order is deliberate; shared rules load first.
- Authentication and listing details already had independent page styles, so those files moved into their feature's `styles/` directory without changing their declarations.

Global fonts, resets and app loading styles remain in `src/styles/global.css`. The standalone `PixelSnow` visual keeps its component-local stylesheet. Existing CSS selectors and breakpoints are retained; this organization does not introduce CSS Modules or a CSS framework.

When adding a page, import the shared feature stylesheet and then its own stylesheet. Put reusable visual primitives in the shared file and unique layout rules in the page file. A component used across features should import the CSS it owns rather than depending on an unrelated page to load it.
