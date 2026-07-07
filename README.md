# orrisoverseas.com — static site (Vercel)

This folder is a **static export** of the orrisoverseas.com website, deployed to Vercel.
Everything is plain HTML/CSS/JS served as-is, with **one** dynamic piece: the contact
form, which is powered by a Vercel Serverless Function that emails submissions via
[Resend](https://resend.com).

- Static pages: `index.html`, `about/`, `contact/`, `gallery/`, … (served directly)
- Contact API: `api/contact.js` (Vercel Serverless Function)
- Client glue: `js/contact-resend.js` (hijacks the Divi forms, POSTs to `/api/contact`)
- Config: `vercel.json`

---

## How the contact form works

1. Every page's contact form is intercepted by `js/contact-resend.js`.
2. It POSTs JSON `{ name, email, phone, message, page }` to `/api/contact`.
3. `api/contact.js` validates the input, checks a hidden **honeypot** field (spam
   protection), and sends the message through the Resend API.
4. The visitor sees an inline "sent / error" message.

The old Divi `admin-ajax` submission and the "2 + 15 =" math captcha are **dead** and are
hidden — spam is handled by the server-side honeypot instead.

---

## Configure Resend (required for the form to actually send)

The form will not deliver email until these environment variables are set in Vercel.

### 1. Create a Resend account & API key
1. Sign up at <https://resend.com>.
2. Go to **API Keys** → **Create API Key** (give it *Sending access*).
3. Copy the key — it looks like `re_xxxxxxxxxxxxxxxx`. You only see it once.

### 2. Verify your sending domain (needed for real delivery)
1. In Resend, go to **Domains** → **Add Domain** and enter `orrisoverseas.com`.
2. Add the DNS records Resend shows you (SPF `TXT`, DKIM records, and — recommended —
   a DMARC record) at your domain's DNS provider.
3. Wait for Resend to mark the domain **Verified**.
4. Once verified you can send from any address on that domain, e.g.
   `no-reply@orrisoverseas.com`.

> **Before the domain is verified** you can test using the built-in sender
> `onboarding@resend.dev`, **but** Resend will only deliver those test emails to the
> email address that owns your Resend account. Verify the domain for real delivery to
> your business inbox.

### 3. Set the environment variables in Vercel
In the Vercel dashboard: **Project → Settings → Environment Variables**. Add:

| Variable             | Required | Example                          | Notes |
|----------------------|----------|----------------------------------|-------|
| `RESEND_API_KEY`     | ✅ yes   | `re_xxxxxxxxxxxxxxxx`            | Your Resend API key. Never commit this. |
| `CONTACT_TO_EMAIL`   | ✅ yes   | `sales@orrisoverseas.com`       | Where form submissions are delivered. |
| `CONTACT_FROM_EMAIL` | optional | `no-reply@orrisoverseas.com`    | Must be on a **verified** domain. Defaults to `onboarding@resend.dev` (test only). |

Add them to the **Production** environment (and **Preview**/**Development** too if you
want the form to work in preview deploys and `vercel dev`).

### 4. Redeploy
Environment-variable changes only take effect on a new deployment. Trigger a redeploy
(push a commit, or **Deployments → ⋯ → Redeploy**).

---

## Local development

Plain static preview does **not** run the serverless function:

```bash
npx serve .          # static pages work, but /api/contact returns 404
```

To test the contact form locally, use the Vercel CLI (runs the function):

```bash
npm i -g vercel        # once
vercel login
vercel env pull .env.local   # pulls your configured env vars locally
vercel dev                   # serves the site + /api/contact at http://localhost:3000
```

If you prefer not to pull from Vercel, create a `.env.local` file (git-ignored) with:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
CONTACT_TO_EMAIL=you@example.com
CONTACT_FROM_EMAIL=onboarding@resend.dev
```

> ⚠️ Never commit real keys. Keep `.env.local` out of version control.

---

## Deploy

```bash
vercel          # preview deployment
vercel --prod   # production deployment
```

Or connect the repo in the Vercel dashboard for automatic deploys on push. Vercel serves
the static files directly and auto-detects `api/contact.js` as a Serverless Function —
no build step is required.

The custom domain `orrisoverseas.com` is attached under **Project → Settings → Domains**.

---

## Troubleshooting the contact form

| Symptom | Likely cause / fix |
|---------|--------------------|
| "Contact form is not configured yet." | `RESEND_API_KEY` or `CONTACT_TO_EMAIL` not set. Add them in Vercel and redeploy. |
| Form says sent, but no email arrives | Domain not verified in Resend, or using `onboarding@resend.dev` (which only delivers to your Resend account email). Verify the domain. |
| 404 on `/api/contact` | You're previewing the static files only. Use `vercel dev` or a real Vercel deploy. |
| Emails go to spam | Add the DKIM + DMARC DNS records Resend recommends, and send from your verified domain. |

Server-side errors are logged in **Vercel → Deployments → (deployment) → Functions logs**.

---

## `vercel.json` at a glance

- Caps the contact function at a 10s `maxDuration`.
- Long-cache (`immutable`) headers for static assets under `/wp-content/` and
  `/wp-includes/` (they're versioned via `?ver=` query strings).
- Basic security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
