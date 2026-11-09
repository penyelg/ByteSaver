# Administrator user management

`/admin/users` provides a searchable, paginated account directory (20 accounts per page). Administrators can search by name, email, or stored mobile number; filter account access and the latest verification status; inspect contact/location details; and open the matching ID review. Mobile rows show account details, both statuses, and the View action without horizontal scrolling.

Access changes require a reason of 3–1000 characters. Administrators cannot change their own account or another administrator's access through this workspace. Role assignment and account deletion are outside this feature.

## Database setup and rollout

The migration is `supabase/migrations/20261019074345_user_management.sql`. It requires the existing identity-verification migration and baseline tables described in the README. **Applied to the connected ByteSaver project on October 19, 2026, after explicit user approval.** Apply the migration before deploying this frontend revision: profile loading now calls `get_account_access`, and the directory uses the new admin RPCs.

Access state is separate from identity verification. Accounts without an access override start active. Suspension preserves ID approval, profile data, listings, and saved carts. Reactivation restores eligibility according to the existing verification status; it does not approve an unverified user.

Privileged implementations live in `bytesaver_private` with fixed search paths, explicit caller checks, and restricted execution grants. Public functions are security-invoker wrappers. Neither private access-state nor history tables grant browser roles direct access. No broader profile-table read policy is introduced. Admin detail responses exclude ID image paths; private ID previews remain in the verification workflow.

The access change locks the target profile and checks the expected current status. A stale administrative update fails and asks the reviewer to reload. State and audit history are written together. The detail panel displays the latest 100 audit records, while the database retains all records.

## Suspension behavior

- Existing listing-creation/update eligibility now includes active account access.
- Restrictive listing-read policies block suspended viewers and hide suspended sellers' listings from authenticated marketplace users.
- Restrictive cart policies block suspended accounts, and cart inserts/updates require verification and an accessible listing.
- Listing-image uploads/updates require an active, verified account. Existing public image URLs are not revoked.
- The app checks access on session restoration, window focus, tab visibility, and every 30 seconds while visible. Suspended accounts see the recorded reason, a status-refresh action, and sign-out. Database rules apply to subsequent requests even before the interface refreshes; previously loaded content is not remotely erased.
- Checkout/payment/settlement are not implemented. Future transaction endpoints must enforce buyer/seller access independently.

## Validation

`supabase/tests/user_management.sql` uses synthetic accounts and rolls back its fixtures. It checks non-admin/anonymous denial, protected administrator accounts, required reasons, search/filter/pagination, stale updates, suspension enforcement, reactivation, and audit preservation. Run it against a compatible test database after applying the migration, then run the existing identity-verification suite too.

Both SQL suites passed locally with an isolated PostgreSQL-compatible PGlite database and a minimal baseline matching the app's policies. This verifies the SQL and authorization behavior locally; it does not confirm the connected database's migration state. Browser fixtures passed for directory search/pagination, access changes and history, protected accounts, ID-review links, mobile navigation/layout, failure states, and suspended/non-admin account screens. The production build passed. Both SQL suites also passed against the connected project, with synthetic fixtures rolled back. All four public RPCs have the expected signatures, allow authenticated execution, and deny anonymous execution. Migration installation created no access overrides.

Live REST checks confirm that the schema cache resolves `get_account_access()` and `admin_list_users`; anonymous requests receive the expected permission denial rather than a missing-function error.

Security advisors report informational notices for the intentionally inaccessible private tables (RLS enabled with no client policies). Existing unrelated warnings remain for the mutable search path of `public.update_updated_at`, public execution grants on the `public.handle_new_user` trigger function, and disabled leaked-password protection. See [search-path guidance](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [function execution guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Those existing settings were not changed by this rollout.
