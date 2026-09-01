## ADDED Requirements

### Requirement: Next.js App Router project shell
The system SHALL serve the site as a Next.js (App Router) application, replacing the previous Vite + React SPA build.

#### Scenario: Application builds and runs under Next.js
- **WHEN** the project is built and started using Next.js commands (`next build` / `next dev` / `next start`)
- **THEN** the application starts successfully with no Vite build tooling involved

### Requirement: Home page route
The system SHALL serve the home page at the root route (`/`) using the Next.js App Router file convention (`app/page.tsx`).

#### Scenario: Visiting the root URL
- **WHEN** a user navigates to `/`
- **THEN** the home page renders, matching the content and layout of the previous Vite-based home page

### Requirement: Shop page route
The system SHALL serve the shop page at `/shop` using the Next.js App Router file convention (`app/shop/page.tsx`), rendering the same hardcoded list of shop items as before the migration.

#### Scenario: Visiting the shop URL
- **WHEN** a user navigates to `/shop`
- **THEN** the shop page renders the full list of shop items (name, price, image) identically to the pre-migration Vite app, with no data changes

### Requirement: Client-side navigation between pages
The system SHALL support navigation between the home and shop pages using Next.js's built-in `Link` component, replacing `react-router`.

#### Scenario: Navigating from shop back to home
- **WHEN** a user clicks the "go back to homepage" link in the navbar while on the shop page
- **THEN** the user is taken to the home page (`/`) without a full page reload, using `next/link`

### Requirement: Tailwind CSS styling preserved
The system SHALL apply the same Tailwind CSS styling (including existing custom utility classes) as the pre-migration site, integrated via Next.js's supported Tailwind setup.

#### Scenario: Visual parity after migration
- **WHEN** the home and shop pages are rendered in the Next.js app
- **THEN** their visual appearance (layout, spacing, colors, custom utilities like `font-2`) matches the pre-migration Vite app

### Requirement: TypeScript preserved
The system SHALL continue to use TypeScript for all application code (components, pages, layout) in the Next.js project.

#### Scenario: Type-checked build
- **WHEN** the Next.js project is type-checked or built
- **THEN** all application source files are `.ts`/`.tsx` and pass TypeScript compilation

### Requirement: Static assets served from `public/`
The system SHALL continue to serve prize images and other static assets from a `public/` directory, unchanged in content, using Next.js's static file serving.

#### Scenario: Shop item images load
- **WHEN** the shop page renders
- **THEN** each shop item's image loads correctly from its `public/prizes/...` path
