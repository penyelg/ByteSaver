# Administrator dashboard

The administrator workspace is separate from account onboarding and marketplace pages. Its code lives in `src/features/admin/`.

```text
admin/
  pages/AdminDashboardPage.jsx   Sidebar, header, routing, dashboard data and refresh
  pages/IdentityReviewPage.jsx   Existing ID review workflow within the workspace
  pages/UserManagementPage.jsx   Account directory, details, access changes and audit history
  components/AdminOverview.jsx  Verification metrics, pending requests and planned tools
  services/adminService.js      Administrator reads, private ID previews and review decisions
  services/userManagementService.js  User directory and account-access RPCs
  styles/admin.css              Shared admin theme, controls, cards, tables and review primitives
  styles/AdminDashboardPage.css Workspace shell and responsive navigation
  styles/AdminOverview.css      Overview metrics and workspace-tool cards
  styles/IdentityReviewPage.css Identity-review queue, toolbar, photo and actions
  styles/UserManagementPage.css Directory filters, status badges, details and access history
```

## Routes and access

- `/admin`: overview with exact counts for pending submissions, approved accounts, rejected submissions, and all ID submissions. Rejected counts include historical attempts; they are not unique-user counts.
- `/admin/verifications`: identity review queue, filters, private photo preview, approval/rejection, and decision history.
- `/admin/users`: searchable account directory, verification/access filters, account details, and audited suspension/reactivation. See [user-management setup](user-management.md); the migration is applied to the connected project.
- `/admin/listings`: listing review queue with photos, specifications, condition, and decision history. Admins can approve or reject submissions, hide approved listings, and restore hidden listings. Rejecting or hiding requires a seller-visible reason.

The listing moderation migration treats existing listings as approved. New listings and changes to listing details enter review and cannot appear in marketplace browsing or start a new reservation until approved. Sellers can see the status and latest decision reason in **Manage Listings**. Existing checkouts and reservations can continue after a listing is hidden.

`App.jsx` checks account access and administrator permission loaded from protected database functions before rendering the workspace. Non-administrators visiting an admin URL see an access-required message. Signed-out visitors must sign in first. The original overview required no schema changes; user management adds private access/audit tables, protected RPCs, and suspension enforcement through a separate migration.

Administrators land on the dashboard after their initial session load. Approved administrators can choose “Go to marketplace” and later return through the account menu. Unverified administrators can reach their own ID onboarding through a separate sidebar action; another administrator must review their submission.

The overview retrieves only the display fields needed for the five oldest pending requests. ID photo URLs are requested only when an administrator selects a submission in the review page. Overview counts refresh after a review decision and through the Refresh button.

## UI and verification

The layout uses the existing ByteSaver dark/green palette, a persistent desktop sidebar, breadcrumb header, metric cards, a request table, and an explicit roadmap for future tools. On mobile, navigation collapses into a drawer that closes on selection, backdrop click, or Escape. Hidden navigation is excluded from keyboard access.

Browser fixture checks cover dashboard-to-review navigation, approval updating counts, the empty pending state, and the mobile drawer and layout. Fixtures use synthetic applicant data. The production build also runs with a reduced worker/heap configuration when the host has limited memory:

```powershell
$env:GOMAXPROCS = '2'
node --v8-pool-size=1 --max-old-space-size=384 node_modules/vite/bin/vite.js build
```

Deployments must return the SPA `index.html` for paths under `/admin` so direct links and reloads work. Apply the listing moderation migration before deploying the updated frontend and reservations Edge Function. The rollback-only `supabase/tests/paid_reservations.sql` exercise covers both moderation and reservation behavior.
