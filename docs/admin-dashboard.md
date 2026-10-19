# Administrator dashboard

The administrator workspace is separate from account onboarding and marketplace pages. Its code lives in `src/features/admin/`.

```text
admin/
  pages/AdminDashboardPage.jsx   Sidebar, header, routing, dashboard data and refresh
  pages/IdentityReviewPage.jsx   Existing ID review workflow within the workspace
  components/AdminOverview.jsx  Verification metrics, pending requests and planned tools
  services/adminService.js      Administrator reads, private ID previews and review decisions
  styles/admin.css              Independent desktop/mobile dashboard styles
```

## Routes and access

- `/admin`: overview with exact counts for pending submissions, approved accounts, rejected submissions, and all ID submissions. Rejected counts include historical attempts; they are not unique-user counts.
- `/admin/verifications`: identity review queue, filters, private photo preview, approval/rejection, and decision history.
- User and listing navigation entries are disabled and labeled “Soon.” User management and listing moderation are not implemented by this change.

`App.jsx` checks the administrator permission loaded from the existing protected database function before rendering the workspace. Non-administrators visiting an admin URL see an access-required message. Signed-out visitors must sign in first. Existing database policies and review authorization remain in effect. No database schema or permission changes were required for the dashboard.

Administrators land on the dashboard after their initial session load. Approved administrators can choose “Go to marketplace” and later return through the account menu. Unverified administrators can reach their own ID onboarding through a separate sidebar action; another administrator must review their submission.

The overview retrieves only the display fields needed for the five oldest pending requests. ID photo URLs are requested only when an administrator selects a submission in the review page. Overview counts refresh after a review decision and through the Refresh button.

## UI and verification

The layout uses the existing ByteSaver dark/green palette, a persistent desktop sidebar, breadcrumb header, metric cards, a request table, and an explicit roadmap for future tools. On mobile, navigation collapses into a drawer that closes on selection, backdrop click, or Escape. Hidden navigation is excluded from keyboard access.

Browser fixture checks cover dashboard-to-review navigation, approval updating counts, the empty pending state, and the mobile drawer and layout. Fixtures use synthetic applicant data. The production build also runs with a reduced worker/heap configuration when the host has limited memory:

```powershell
$env:GOMAXPROCS = '2'
node --v8-pool-size=1 --max-old-space-size=384 node_modules/vite/bin/vite.js build
```

Deployments must return the SPA `index.html` for `/admin` and `/admin/verifications` so direct links and reloads work. No hosting configuration was changed.
