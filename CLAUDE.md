# Project: orrisoverseas.com — WordPress → Static Next.js migration

> Save this file as **both** `CLAUDE.md` (Claude Code) and `AGENTS.md` (Codex) at the repo root.
> These are your standing instructions. Read them before every task and follow them without being reminded.

## What we're doing

We are rebuilding the existing WordPress site **orrisoverseas.com** as a clean, static
Next.js site so it can be hosted for free on Vercel. The old site is WordPress + the
**Divi** page builder (Divi v4.27.6). We are **not** keeping WordPress, PHP, or Divi.

The goal is a site that:
- looks the same as (or better than) the current live site,
- is fully static (`output: 'export'`) — no server runtime except one contact function,
- deploys to Vercel free tier,
- drops Divi's markup bloat and fixes the placeholder content on the current site.

## Source material

- `/_source/static-export/` — a Simply Static export of the live WordPress site.
  **Use this as the CONTENT SOURCE ONLY** (text, image references, page structure).
  Do NOT copy Divi's HTML wrappers, inline styles, `et_pb_*` classes, or `wp-*` markup.
- `/_source/screenshots/` — full-page screenshots of each live page. Treat these as the
  **visual ground truth** for layout and spacing when the exported HTML is unclear.
- Live reference: https://www.orrisoverseas.com/

When rebuilding a page, extract only the meaningful content from the export and
re-implement the layout cleanly from scratch. Divi's markup is unreadable — do not try
to preserve it.

## Target stack (do not deviate without asking)

- **Next.js** (App Router) with `output: 'export'` in `next.config.js` — fully static.
- **Tailwind CSS** for all styling. No CSS-in-JS, no styled-components, no external UI kits.
- **TypeScript**.
- No server components that require runtime, no `getServerSideProps`, no ISR — everything
  must render at build time and export to static HTML.
- Images go in `/public/uploads/` (mirror the paths from the export where practical).
  Use `next/image` with `unoptimized: true` (required for static export).

## Page inventory (~11 pages)

Rebuild each as its own route under `app/`. Do ONE page per session.

1. Home — `app/page.tsx`
2. About — `app/about/page.tsx`
3. Industrial Communication & Connectivity Products
4. Industrial Automation Services
5. Software Solutions
6. IIoT Solutions
7. AI/ML Solutions
8. Special Purpose Machines
9. Product List
10. Gallery
11. Contact — `app/contact/page.tsx`

## Shared shell — build this FIRST, before any page

Build and lock these before touching individual pages; every page depends on them:
- `<Header>` — top contact bar + main nav (nav has a dropdown for the services pages).
- `<Footer>`.
- Root `app/layout.tsx` wiring both in, plus global metadata.

Once these are reviewed and approved, reuse them on every page. Do not re-invent nav/footer per page.

## Known gotchas (learned the hard way — respect these)

- **Divi dynamic CSS**: the original relies on `/wp-content/et-cache/` critical CSS that
  doesn't survive export. We are NOT reusing any Divi CSS — rebuild styling in Tailwind.
- **Placeholder content on the live site**: there is `Lorem ipsum` testimonial text and
  dummy names ("John Smith", "Jenny Cane"). Do NOT copy these. Flag them and leave a clear
  `{/* TODO: real testimonial needed */}` placeholder for the owner to fill.
- **Absolute URLs**: the export may contain hardcoded `https://www.orrisoverseas.com/...`
  links. All internal links must be relative Next.js `<Link>` routes.
- **WordPress cruft**: ignore/strip anything referencing `wp-json`, `xmlrpc`, `admin-ajax`,
  emoji scripts, oEmbed, `/wp-admin/`, `/wp-login`.

## Contact form (the one dynamic piece)

The site has two contact forms that previously posted to WordPress `admin-ajax.php`.
Replace with:
- A single Vercel function: `app/api/contact/route.ts` that sends submissions via **Resend**.
- The API key comes from `process.env.RESEND_API_KEY` — never hardcode it.
- Client forms POST to `/api/contact` with `fetch`; show inline success/error states.
- Spam protection: a hidden **honeypot** field (bot-filled → silently drop) and/or
  Cloudflare Turnstile. Do NOT reimplement the old "2 + 15 =" math captcha.

## Deployment

- Target: **Vercel** free tier. `output: 'export'` produces the static site; the single
  `/api/contact` route runs as a Vercel Function.
- Assume the custom domain `orrisoverseas.com` will be attached in Vercel later — don't
  hardcode any domain in the code.

## Working agreement (how to collaborate on this repo)

- **One page or one component per session.** Produce a reviewable diff, then stop.
- Do NOT scaffold the whole site in one shot or mass-generate all pages at once.
- When a page's exported HTML is ambiguous, ask for or refer to the screenshot rather
  than guessing at layout intent.
- Keep components small and composable; extract anything reused (cards, section headers,
  CTA blocks) into `components/`.
- Don't add dependencies without flagging why. Prefer standard Next.js + Tailwind.
- Preserve existing SEO: page `<title>`, meta description, and heading structure per page
  (pull these from the exported `<head>` / screenshots — but rewrite, don't copy Divi meta).
- After building a page, list: (a) any placeholder content you left, (b) any images you
  couldn't locate in the export, (c) any links you couldn't resolve.

## Commands

```bash
npm run dev          # local dev
npm run build        # static export -> ./out
npx serve out        # preview the exported static site (relative paths work here)
```

## Out of scope (do not do these unless asked)

- No blog/CMS. Content is hardcoded in components.
- No auth, no database, no user accounts.
- No analytics/marketing scripts unless explicitly requested.
- Do not migrate or reference the old WordPress database.