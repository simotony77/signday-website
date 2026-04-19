# SignDay Website

Marketing site + legal documents for SignDay.

Hosted at **https://signdayapp.com** (and `/privacy`, `/terms`).

## Stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 3.4 + `@tailwindcss/typography`
- Markdown rendering with `react-markdown` + GFM
- Deployed on Vercel

## Local development

```bash
cd signday-website
npm install
npm run dev
```

Open http://localhost:3000

## Project structure

```
signday-website/
├── app/
│   ├── layout.tsx           # Root layout + metadata
│   ├── page.tsx             # Landing page
│   ├── globals.css          # Tailwind setup
│   ├── privacy/page.tsx     # Privacy policy route
│   └── terms/page.tsx       # Terms of service route
├── components/
│   ├── Nav.tsx              # Top navigation
│   ├── Footer.tsx           # Footer
│   └── LegalPage.tsx        # Shared markdown renderer for legal docs
├── content/
│   ├── privacy-policy.md    # Synced from ../legal/
│   └── terms-of-service.md  # Synced from ../legal/
├── scripts/
│   └── sync-legal.mjs       # Re-copies legal docs from ../legal/
├── public/                  # Static assets
└── next.config.mjs
```

## Updating legal documents

The canonical source for legal docs lives at `/legal/` in the parent SignDay repo.

Whenever those change:

```bash
cd signday-website
npm run sync-legal
```

Then commit + push. Vercel will redeploy automatically.

## Deploying to Vercel — first time

### 1. Push this folder to its own GitHub repository

```bash
cd signday-website
git init
git add .
git commit -m "Initial website"
gh repo create signday-website --public --source=. --remote=origin --push
```

(Or create the repo manually in GitHub and `git push` to it.)

### 2. Import into Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select `signday-website`
4. Framework: Next.js (auto-detected)
5. Root Directory: `.` (default)
6. Build Command: `next build` (default)
7. Click **Deploy**

You'll get a URL like `signday-website-abc123.vercel.app` within ~1 minute.

### 3. Add the custom domain

1. In Vercel: Project → Settings → Domains
2. Add `signdayapp.com` and `www.signdayapp.com`
3. Vercel will display 1-2 DNS records to add at Namecheap:
    - `A` record for root: `@ → 76.76.21.21`
    - `CNAME` record for www: `www → cname.vercel-dns.com`
4. Add those at Namecheap (Advanced DNS tab → Host Records)
5. Vercel auto-provisions a Let's Encrypt SSL cert in ~5 minutes

The existing CNAME `www → parkingpage.namecheap.c...` and the URL Redirect `@ → http://www.signdayapp.co...` should be **deleted** in Namecheap before adding the Vercel records, otherwise they'll conflict.

The TXT records (DKIM `resend._domainkey`, SPF `send`) and the MX record (`send → feedback-smtp...`) should stay — they're for email and don't conflict with Vercel.

### 4. Verify

Visit https://signdayapp.com — you should see the landing page.
Visit https://signdayapp.com/privacy — full Privacy Policy.
Visit https://signdayapp.com/terms — full Terms of Service.

## Subsequent deployments

Just push to the connected branch:

```bash
git add .
git commit -m "Update copy"
git push
```

Vercel rebuilds + deploys in ~1 minute.

## Customization checklist before launch

- [ ] Replace placeholder App Store / Google Play download links once apps are live
- [ ] Add real screenshots (or a hero illustration) instead of emoji icons
- [ ] Add an Open Graph share image at `public/og-image.png` (1200×630)
- [ ] Add a favicon at `app/favicon.ico`
- [ ] Update FAQ copy as needed
- [ ] If you change legal docs, run `npm run sync-legal`

## Notes

- Page styling matches the SignDay app brand color (#1A56DB)
- Markdown rendering uses Tailwind Typography plugin for clean prose styles
- Legal pages are statically rendered at build time (no client JS needed for content)
