# Identity submission and administrator review

Implemented on October 19, 2026. The migration `supabase/migrations/20261019034321_identity_verification.sql` has been applied to the connected ByteSaver project. Its filename matches the remote migration history. Earlier baseline changes still have no remote migration history; do not blindly push all local migrations to that existing project.

## User experience

After sign-in, ordinary accounts without an approved ID complete the required onboarding form: full name, Philippine mobile number, street/sitio/purok address, Isabel barangay, ID type, and a clear ID photo. Supported formats are JPEG, PNG, and WebP, up to 5 MB. The form offers mobile camera capture and a normal file upload fallback, previews the selected image, and requires acknowledgement of administrator review.

Mobile numbers accept `09XXXXXXXXX` or `+639XXXXXXXXX`, including spaces and formatting parentheses/hyphens, and are stored in `+639XXXXXXXXX` format. This validates format only, not phone ownership; SMS OTP is not implemented.

Submitted users see a pending screen with a status-refresh button. Returning to the tab also refreshes their status. Rejected users see the administrator's reason and may submit again. Approved users enter the marketplace. Existing accounts also go through this gate. The marketplace stays behind approval in this first implementation.

Administrators land on the separate dashboard overview at `/admin`, even if their own marketplace account is unverified. Identity review is inside that workspace at `/admin/verifications`. They can filter pending/approved/rejected submissions, view a private ID photo, and record a decision and review note. The queue shows up to 100 submissions at a time; pending submissions are oldest first. Approved administrators can also open the workspace through “Admin dashboard” in the account menu. Administrators may submit their own ID through “Verify my own account”; a different administrator must review it before they can transact. The admin code and styles live in `src/features/admin/`; see [dashboard notes](admin-dashboard.md).

## Database and access rules

- `public.users.full_name` and `address` extend the existing profile. Phone, barangay, full name, and address can only be saved by the validated ID-submission operation. Display-name/avatar updates retain their existing own-profile policy.
- `public.identity_submissions` snapshots the submitted details and document path for each attempt. It records `pending_review`, `approved`, or `rejected`, plus reviewer, review time, and reason. A final decision cannot be overwritten through the review operation. Rejected attempts remain when the applicant resubmits.
- A partial unique index prevents an account from having multiple pending/approved submissions. Profile-row locking also serializes concurrent submission attempts.
- The non-exposed `bytesaver_private.administrators` table controls reviewer permissions. Clients have no table privileges or policies granting access. Its no-policy RLS advisory is intentional defense in depth. Account metadata is not used for authorization.
- Public RPC functions use invoker permissions and call internal functions with explicit caller authorization, fixed search paths, and restricted execution grants. Ordinary clients cannot insert/update identity records directly or assign reviewer roles.
- Restrictive listing policies require identity approval for inserts and updates even when an older permissive policy would otherwise permit them. The sell page also checks approval before uploading a listing image.
- No orders/checkout/payment flow exists yet. Future order creation must check both buyer and seller approval in a trusted database/server operation; the current UI gate is not a substitute for that future rule.

## Private documents

`identity-documents` is a private storage bucket with a 5 MB limit and a JPEG/PNG/WebP MIME allowlist. Object paths start with the uploader's authenticated user ID. Only the document owner and authorized administrators can read them. The review page uses links valid for 120 seconds, rather than public URLs.

Clients cannot overwrite or delete identity documents, including previously submitted photos. Failed submissions can leave unreferenced private uploads; a trusted maintenance process must handle them under an agreed retention policy. No automatic retention/deletion job is implemented. Before collecting real IDs, confirm accepted ID types, review standards, document retention/deletion periods, and the complete privacy notice. The current ID-type list is an initial configuration to review with the adviser. Use synthetic documents for demonstrations until those policies are settled.

## Administrator provisioning

The user-designated, confirmed account has been granted access in the connected database. To add another reviewer later, a trusted project administrator can use the following SQL with the intended confirmed account email. Never expose this operation to ordinary clients.

```sql
insert into bytesaver_private.administrators(user_id)
select a.id
from auth.users a
join public.users u on u.id = a.id
where lower(a.email) = lower('reviewer@example.com')
  and a.email_confirmed_at is not null
on conflict do nothing;
```

## Verification performed

- `npm run build` succeeds. Vite reports the existing large-bundle/module-directive warnings.
- `supabase/tests/identity_verification.sql` passes against the connected database with synthetic rows inside a rolled-back transaction. It checks unauthorized review and profile edits, private-document access, pending-account listing restrictions, resubmission history, self-review prevention, immutable decisions, and successful listing creation after approval.
- Browser checks use isolated fixture data, not real IDs: onboarding upload/preview, successful submission to pending review, administrator private preview, approval/rejection notes, review history, and a 390-pixel mobile layout without horizontal overflow.
- Supabase security advisors reported no new warnings from the identity functions/policies. Existing warnings concern the older `handle_new_user` function's execution grants, `update_updated_at` search path, and disabled leaked-password protection. These were present before this change and were not modified. See [function execution grants](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Camera availability depends on device/browser support. Actual camera hardware capture and a real-account ID upload have not been exercised by automated checks.
