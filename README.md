# Meet CMGT — Landing Page

A standalone awareness landing page for the **Meet CMGT** postcard campaign. Static HTML + a single Vercel serverless function that forwards form submissions to Resend.

```
meet-cmgt-deploy/
├── index.html              ← the landing page
├── assets/
│   ├── styles.css          ← all styles (tokens + page)
│   ├── logo-1C-white.svg
│   ├── logo-full-color.svg
│   ├── leaf-mark.svg
│   └── icon-mark.svg
├── api/
│   └── send-meet-form.js   ← Resend handler (Vercel serverless)
├── vercel.json
├── package.json
├── .env.example
└── README.md
```

---

## Local preview (no backend needed)

You can open `index.html` directly in a browser — everything except the form submit will work. The form will POST to `/api/send-meet-form` which only exists once deployed.

To preview the full stack locally (including the form + Resend):

```bash
npm install -g vercel
npm install
cp .env.example .env.local
# fill in RESEND_API_KEY, LEADS_TO_EMAIL, LEADS_FROM_EMAIL
vercel dev
```

Then open http://localhost:3000.

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
cd meet-cmgt-deploy
git init
git add .
git commit -m "Initial Meet CMGT landing"
gh repo create cmgt-meet-landing --public --source=. --remote=origin --push
```

### 2. Import into Vercel

- Go to https://vercel.com/new
- Import the GitHub repo
- Framework preset: **Other** (it's pure static + serverless)
- Click **Deploy**

### 3. Add environment variables

In the Vercel dashboard → **Settings → Environment Variables**, add:

| Key                | Value                                    |
| ------------------ | ---------------------------------------- |
| `RESEND_API_KEY`   | Your Resend key (`re_…`) from https://resend.com/api-keys |
| `LEADS_TO_EMAIL`   | Where leads should arrive, e.g. `hello@cmgt.org` |
| `LEADS_FROM_EMAIL` | Verified sender, e.g. `CMGT Landing <hello@cmgt.org>` |

Then redeploy (Vercel → Deployments → ⋯ → Redeploy) so the function picks up the new vars.

### 4. Set up Resend

1. Create an account at https://resend.com.
2. Add and verify a sending domain (`cmgt.org`) — Resend will give you DNS records to add. **You must verify the domain before sends will succeed.**
3. Generate an API key and paste it into Vercel as `RESEND_API_KEY`.

### 5. Point your subdomain at Vercel

In your DNS provider (Cloudflare/GoDaddy/whoever), add:

```
Type: CNAME
Name: meet           (or hello, or whatever you choose)
Value: cname.vercel-dns.com
```

Then in Vercel → **Settings → Domains** → add `meet.cmgt.org`.

### 6. Authorize the domain in Adobe Fonts

~~The Gelica font is loaded via your Adobe Fonts kit~~ — **no longer needed.** Gelica is now self-hosted from `assets/fonts/`, so the font loads regardless of domain.

> **License reminder:** make sure your Gelica license permits self-hosted web use (Hubert Jocham Type / MyFonts "Webfont" license). The Adobe Fonts subscription only covers Adobe-served delivery.

---

## Updating content

Most things live in `index.html`:

| Want to change…                  | Where to look                                        |
| -------------------------------- | ---------------------------------------------------- |
| Headline / body copy             | `index.html` — search for `meet-display`, `meet-lede`|
| The three pillars                | `index.html` — section `pillars`                     |
| Testimonial quote / stats        | `index.html` — section `proof`                       |
| Phone number / email             | `index.html` — search `(225) 425-5622` and `hello@cmgt.org` |
| Form fields                      | `index.html` — `<form id="meet-form">`               |
| Email layout sent to you         | `api/send-meet-form.js` — the `html` template        |
| Colors, type scale, spacing      | `assets/styles.css`                                  |

After any edit: commit, push, Vercel auto-deploys on push.

---

## Analytics (optional)

The form fires two analytics events on success — you only need to load the corresponding script for the ones you want:

- `gtag('event', 'meet_cmgt_lead')` — Google Analytics 4
- `fbq('track', 'Lead')` — Meta Pixel

Add the GA / Pixel snippet to `<head>` in `index.html` to enable.

---

## Anti-spam

If you start getting form spam, the simplest upgrades:

1. **Honeypot** — add a hidden text field to the form and reject the submission in `api/send-meet-form.js` if it's filled.
2. **Cloudflare Turnstile** — drop in their widget, verify the token server-side.
3. **Rate limit by IP** — Vercel KV or Upstash Redis. ~10 lines.

Ping me if any of those becomes a real problem and I'll wire them in.
