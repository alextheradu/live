## 1. Project Scaffold

- [x] 1.1 Initialize a Next.js (App Router, TypeScript) project alongside the existing `src/` tree, without deleting anything yet
- [x] 1.2 Add `next.config.ts`
- [x] 1.3 Update `package.json` scripts to include Next's `dev`/`build`/`start` alongside the existing Vite scripts (temporarily, both present)
- [x] 1.4 Install `next`; keep `vite`, `react-router` installed until cutover (task group 5)

## 2. Styling

- [x] 2.1 Port Tailwind CSS config/content globs to Next's supported (PostCSS-based) integration
- [x] 2.2 Port global styles / custom utility classes (e.g. `font-2`) and verify they resolve under Next's build

## 3. Components

- [x] 3.1 Move `Navbar.tsx` into the Next.js project, replacing `react-router`'s `<Link to="/">` with `next/link`'s `<Link href="/">`
- [x] 3.2 Move `Footer.tsx` into the Next.js project (no routing changes needed)
- [x] 3.3 Move `ShopItem.tsx` into the Next.js project (no routing changes needed)

## 4. Pages

- [x] 4.1 Create `app/layout.tsx` as the root layout
- [x] 4.2 Create `app/page.tsx` for the home page, matching current home page content/behavior (marked `"use client"` for the countdown timer's `useState`/`useEffect`, with `window.location.hostname` guarded for SSR)
- [x] 4.3 Create `app/shop/page.tsx`, porting the hardcoded `allShopItems` array and rendering exactly as before
- [x] 4.4 Verify both pages render correctly via `next dev` (both routes returned 200, content spot-checked)

## 5. Verification

- [x] 5.1 Compare home and shop pages between the Vite app and the Next.js app — verified at the source level (JSX/className markup ported verbatim) since no browser automation was available in this environment for a pixel-level screenshot diff
- [x] 5.2 Verify navigation between home and shop works via `next/link` with no full page reloads (code-level: `next/link` used consistently; not interactively click-tested without a browser)
- [x] 5.3 Verify all shop item images load correctly from `public/prizes/...` (spot-checked casio_image.jpg, gopro.jpg — 200 via `next start`)
- [x] 5.4 Run TypeScript compilation / type-check on the Next.js project with no errors (`next build` ran TypeScript and finished cleanly)

## 6. Cutover — Remove Vite

- [x] 6.1 Delete `vite.config.ts` and Vite-specific dependencies (`vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `@rolldown/plugin-babel`, `babel-plugin-react-compiler`, `@babel/core`) from `package.json`
- [x] 6.2 Remove `react-router` dependency
- [x] 6.3 Delete the old `src/` tree (superseded by `app/`) — note: the user's own separate `src/functions.ts` and `app/api/route.ts` exist independently of this migration and were left untouched at the user's explicit request
- [x] 6.4 Update `eslint.config.js` to use `eslint-config-next` (`core-web-vitals` + `typescript`) in place of `reactRefresh.configs.vite`, keeping `typescript-eslint` and `react-hooks` rules. Also downgraded `eslint`/`@eslint/js` from v10 to latest v9 — `eslint-config-next`'s bundled `eslint-plugin-react@7.37.5` (latest published) is incompatible with ESLint 10's flat-linter internals (crashes on `react/display-name` and similar rules); v9 is the newest line that actually works with it. Fixed 4 resulting `react/no-unescaped-entities` errors in `app/page.tsx` (escaped apostrophes, no visual/content change)
- [x] 6.5 Update `package.json` scripts so `dev`/`build`/`start` point solely to Next's commands
- [x] 6.6 Confirm `.next/` is the build output and update `.gitignore` (removed `dist`/`dist-ssr`, added `.next` and `next-env.d.ts`)

## 7. Final Check

- [x] 7.1 Full clean install (`rm -rf node_modules .next`, reinstall) and `next build` succeeds — TypeScript ran clean; Next auto-corrected `tsconfig.json`'s `jsx` to `react-jsx` (its required automatic runtime setting)
- [x] 7.2 `next dev` runs and both routes work end-to-end one more time post-cutover (200s on `/`, `/shop`, and a prize image)
