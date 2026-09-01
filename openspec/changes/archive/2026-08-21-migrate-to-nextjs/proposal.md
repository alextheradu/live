## Why

The site currently runs as a Vite + React SPA with `react-router`, alongside an unrelated Rails backend that is being retired entirely. The team wants everything consolidated into a single Next.js codebase (App Router) — it keeps tooling simple, the team already knows Next.js, and it sets up a clean foundation for dynamic features (Postgres/Prisma-backed shop data, auth, etc.) planned as later, separate changes.

## What Changes

- Replace the Vite build with a Next.js (App Router) project setup — `next.config.ts`, App Router conventions, Next's ESLint config.
- Convert `src/App.tsx` + `react-router` routes into `app/layout.tsx` and `app/page.tsx` (home).
- Convert `src/shop/page.tsx` into `app/shop/page.tsx`.
- Move shared components (`Navbar`, `Footer`, `ShopItem`) into the Next.js project structure, updating `react-router`'s `<Link>` to `next/link`'s `<Link>`.
- Carry over Tailwind CSS configuration to the Next.js-supported setup.
- Move `public/prizes/*` static assets as-is.
- Keep TypeScript throughout.
- Keep shop item data exactly as-is (hardcoded array) — **no** dynamic data, database, or auth work in this change. That is explicitly deferred.
- **BREAKING**: Removes the Vite build pipeline (`vite.config.ts`, Vite-specific ESLint config, `dist/` output) in favor of Next.js's build (`.next/` output).
- Rails backend (`backend/platform-backend`) is out of scope for this change — it is not touched here (a decision to retire it fully was made, but this change only concerns the frontend rewrite).

## Capabilities

### New Capabilities
- `nextjs-app-shell`: The Next.js App Router project shell — routing, layout, and page rendering for the site's two pages (home, shop), replacing the Vite/react-router setup.

### Modified Capabilities
(none — this is a new project shell replacing an unspecced Vite app; no existing OpenSpec capabilities exist yet)

## Impact

- **Affected code**: `src/` (Vite/React app) is restructured into Next.js `app/` conventions; `vite.config.ts`, `eslint.config.js`, `package.json` build scripts all change.
- **Dependencies**: Remove `vite`, `@vitejs/plugin-react` (or equivalent), `react-router`; add `next`. Tailwind's build integration changes from the Vite plugin to Next's supported integration.
- **Deployment**: Build/start scripts change from Vite's (`vite build` / `vite preview`) to Next's (`next build` / `next start`), which also changes hosting expectations (Next.js is a natural fit for Vercel).
- **Out of scope**: Rails backend, database/Prisma setup, auth, dynamic shop data — all deferred to future changes.
