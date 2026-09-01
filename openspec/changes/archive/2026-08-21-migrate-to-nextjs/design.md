## Context

The site is a small Vite + React + TypeScript SPA (two pages: home, shop) using `react-router` for client-side routing and Tailwind CSS for styling. A separate Rails backend exists in the repo (`backend/platform-backend`) but is unrelated to this frontend today (no API calls from the SPA) and is being retired — out of scope here.

The team wants a single Next.js codebase going forward: familiar tooling, simpler ops, and a foundation for later dynamic features (Postgres/Prisma-backed shop data, planned as a separate future change).

## Goals / Non-Goals

**Goals:**
- Stand up a Next.js (App Router) project that reproduces the current site's two pages and behavior exactly, with TypeScript preserved throughout.
- Replace `react-router` navigation with Next's file-based routing and `next/link`.
- Carry over Tailwind CSS styling with no visual regressions.
- Leave the codebase in a state ready for a future data-layer change (Prisma/Postgres) without pre-building any of that plumbing now.

**Non-Goals:**
- No dynamic data, database, or API routes in this change — shop items stay a hardcoded array, moved as-is.
- No auth, redemption tracking, or admin editing.
- No changes to the Rails backend — it is neither touched nor wired up to the new frontend.
- No deployment/CI changes beyond what's needed to build and run the Next.js app locally (e.g., no new Vercel project setup is required by this change).

## Decisions

**Next.js App Router (not Pages Router).**
The App Router is the current, actively developed Next.js paradigm and pairs naturally with Server Components for the dynamic data work planned next. Since the project is small and greenfield in Next.js terms, there's no legacy Pages Router code to justify the older paradigm.

**Project structure: `app/` at repo root, replacing `src/`.**
- `app/layout.tsx` — root layout (was implicit via `src/App.tsx` + `main.tsx` mount)
- `app/page.tsx` — home page
- `app/shop/page.tsx` — shop page (routing-driven, replaces manual `react-router` route config)
- `app/components/` — `Navbar.tsx`, `Footer.tsx`, `ShopItem.tsx`, moved with minimal changes (mainly the `Link` import swap)
- `public/` — static assets (`prizes/*`) copied over unchanged; Next.js serves `public/` the same way Vite does.

**Routing: `next/link` replaces `react-router`'s `Link`.**
`Navbar.tsx`'s `<Link to="/">` becomes `<Link href="/">` from `next/link`. No other routing logic exists (only one internal link found), so this is a small, mechanical change. The `react-router` dependency is removed entirely.

**Styling: Tailwind via Next's supported integration.**
Tailwind config/content globs move from Vite's plugin-based setup to Next's (PostCSS-based) integration. Custom utility classes already in use (e.g., `font-2`) carry over via the existing Tailwind config, ported as-is.

**Client vs Server Components: default to Server Components; keep interactivity minimal.**
Since none of the current pages have client-side interactivity beyond static rendering and a single nav link, no `"use client"` directives should be needed initially. If any component turns out to need browser-only APIs or hooks, mark only that component `"use client"` rather than the page.

**ESLint: adopt Next's ESLint config (`eslint-config-next`) in place of the Vite-oriented config.**
`eslint.config.js` currently references `reactRefresh.configs.vite` — this is Vite-specific and has no Next equivalent. Replace with Next's recommended flat config, keeping `typescript-eslint` and `react-hooks` rules.

**Build tooling: fully replace Vite, don't run both.**
Running Vite and Next side-by-side would create two conflicting build systems for a two-page site — not worth the complexity. `vite.config.ts`, `@vitejs/plugin-react` (or equivalent), and the `dist/` output are removed once the Next.js app is verified working.

## Risks / Trade-offs

- **[Risk] Tailwind custom utilities/config subtly change behavior under Next's PostCSS pipeline** → Mitigation: visually diff both pages (home, shop) side-by-side after migration before removing the Vite setup.
- **[Risk] `react-router`'s `<Link>` semantics (e.g., prefetching, scroll restoration) differ from `next/link`'s** → Mitigation: only one link exists today: low blast radius; manually verify the home ⇄ shop navigation works as expected.
- **[Risk] Losing Vite's fast dev-server HMR experience** → Mitigation: Next's dev server also supports fast refresh; no action needed beyond verifying `next dev` HMR works during implementation.
- **[Trade-off] Removing `dist/`/Vite build scripts is a one-way door for this change** → Accepted: the team has explicitly decided to drop Vite entirely, not run it in parallel.

## Migration Plan

1. Scaffold the Next.js project structure (`app/`, `next.config.ts`, updated `package.json` scripts) alongside the existing `src/` tree (not yet deleted).
2. Port Tailwind config and global styles into the Next.js-supported setup.
3. Port `Navbar`, `Footer`, `ShopItem` components, swapping `react-router`'s `Link` for `next/link`.
4. Port the home page and `app/shop/page.tsx`, preserving the hardcoded item data exactly.
5. Verify both pages render and navigate correctly via `next dev`; visually compare against the current Vite app.
6. Remove the Vite-specific files (`vite.config.ts`, old `src/`, Vite-oriented `eslint.config.js` settings, `react-router` dependency) and update `package.json` scripts (`dev`/`build`/`start`) to Next's commands.
7. Update ESLint config to `eslint-config-next`.

Rollback: since `src/` and the Vite config remain untouched until step 6, rollback before that point is trivial (just don't delete them / revert the branch). No production deployment is assumed as part of this change, so no live rollback strategy is needed beyond git revert.

## Open Questions

- None blocking. Future changes (deferred, not part of this one) will need to decide: Prisma/Postgres schema for dynamic shop items, hosting target (e.g., Vercel), and whether/how the Rails backend is decommissioned.
