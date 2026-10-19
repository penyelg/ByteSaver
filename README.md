# ByteSaver

A React marketplace for pre-owned computer hardware, built with Vite and Supabase. See [PRODUCT.md](PRODUCT.md) for the product brief and [DESIGN.md](DESIGN.md) for visual guidance.

The revised capstone scope and proposed academic title are documented in [docs/capstone-revisions.md](docs/capstone-revisions.md). Required ID submission and administrator approval are implemented; see [the verification setup and access rules](docs/identity-verification.md). Transaction commissions, checkout, payment processing, and tax processing remain target requirements.

## Local setup

1. Install Node.js 22.12 or later (Node 22 LTS is a suitable default).
2. Run `npm ci` to install the locked dependencies.
3. Copy `.env.example` to `.env.local` and replace the example values:
   - `VITE_SUPABASE_URL`: your Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY`: your project's browser-safe anon key. Never use a service-role key.
   - `VITE_SUPABASE_REDIRECT_URL`: the allowed OAuth return URL, for example `http://localhost:5173`. Replace the template's `z` value. Omit this variable to use the current window origin.
4. Configure the database prerequisites below and enable the intended Supabase email/password and Google sign-in providers. Add the return URL to Supabase's allowed redirect URLs.
5. Run `npm run dev` and open the URL printed by Vite. Restart Vite after changing environment values.

Environment files are ignored by Git, except `.env.example`. `.env.local` overrides matching values in `.env`. Variables prefixed with `VITE_` are bundled into the browser app and must not contain secrets.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create the production build in `dist/` |
| `npm run preview` | Preview the production build locally |

## Folder ownership

```text
src/
  app/                   Page selection and identity-approval gate
  assets/                Shared brand images
  components/            Shared brand and visual components
  features/
    account/             Profile setup, account menu, profile data service
    admin/               Admin dashboard, identity review, admin services and styles
    auth/                Login/register screens and session restoration hook
    cart/                Cart drawer, state hook, persistence service
    listings/            Sell form and listing creation
    marketplace/         Browse/details pages, browse components, fetching and utilities
  lib/                   Shared Supabase client
  styles/                Global styles
  main.jsx               React entry point and router provider
docs/                    Database design and implementation notes
supabase/migrations/     Incremental SQL changes for the existing database
```

Keep feature-specific components, hooks, services, and utilities inside their feature. Use `src/components/` for components shared across features and `src/lib/` for shared infrastructure. Create folders when there is code to put in them; import modules directly using relative paths.

`App` owns page selection, selected listing, and the identity-approval gate. The auth hook restores the session, reads the profile/verification/reviewer access, and loads the cart for approved accounts. The cart hook owns saved items and preserves the add/remove callback results. Profile, verification, and cart operations live in their feature services; marketplace fetching lives in its hook, and filtering/sorting in its utilities.

Styles remain beside their existing pages and visual components. The marketplace page continues to load the stylesheet used by its extracted sections, including the account menu and cart drawer. `node_modules/` and `dist/` are generated and ignored by Git.

## Database prerequisites and implementation status

This repository does **not** currently bootstrap a complete Supabase project. Its migrations extend an existing database with `public.users`, `public.listings`, and `public.cart_items`. The profile table uses `users.id` matching `auth.users.id`; the existing signup trigger must provision the profile row. The sell flow also requires the `listing-images` storage bucket and appropriate storage access policies. Preserve the existing table definitions, auth trigger, grants, and row-level security policies when setting up another environment.

Review and apply the SQL files in filename order against a compatible database: barangay definitions/seed, profile fields/policies, then categories/specification definitions and listing category references. Do not assume that these files create the baseline tables, storage bucket, or every policy required by the app. No migration runs automatically on app startup.

Implemented app flows include authentication, required profile/ID setup, private ID storage, administrator review and resubmission, approval-gated marketplace access, listing creation with category-driven specifications, and a persistent saved cart. Phone ownership is not OTP-verified. The identity migration is applied to the connected project, and existing accounts need approval too. The broader orders, payments, reporting, and listing moderation behavior in [docs/database-schema.md](docs/database-schema.md) is a target design. Checkout is not implemented.

Before deploying, validate the actual database policies and migration state separately. A successful frontend build does not confirm database readiness.

## Administrator workspace

Authorized administrators have a separate dashboard at `/admin`, with identity reviews at `/admin/verifications`. The overview displays live verification counts and the oldest pending requests. User management and listing moderation are marked as planned and have no active controls yet. See [admin dashboard notes](docs/admin-dashboard.md) for the feature structure and routing. Production hosting must serve `index.html` for these client-side routes.
