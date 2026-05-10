# SignDay Waitlist — Setup

## What got built

- New homepage at `app/page.tsx` (SignDay agent LP)
- Email-capture form: `components/WaitlistForm.tsx`
- API route: `app/api/waitlist/route.ts` (Supabase insert + Resend auto-reply)
- Supabase migration: `supabase/waitlist_signups.sql`
- Nav + Footer updated (stale anchor links removed)

## What you need to do

### 1. Apply the Supabase migration

Open Supabase SQL editor for project `teamquykkznndcmknvpy`:

→ https://supabase.com/dashboard/project/teamquykkznndcmknvpy/sql/new

Paste the contents of [`supabase/waitlist_signups.sql`](supabase/waitlist_signups.sql) and click **Run**. Should complete in <1 second.

Verify:
```sql
select * from public.waitlist_signups limit 1;
```

(Empty result is correct — table exists, no rows yet.)

### 2. Set environment variables

#### Locally (for `npm run dev`)

Copy `.env.local.example` → `.env.local` and fill in real values:

```bash
cp .env.local.example .env.local
```

You need:
- `SUPABASE_URL` = `https://teamquykkznndcmknvpy.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = found in Supabase dashboard → Project Settings → API → `service_role` key (the long one, NOT `anon`)
- `RESEND_API_KEY` = found in resend.com → API Keys → "Create API key" → name it "signday-waitlist" → copy the `re_...` value
- `WAITLIST_FROM_EMAIL` = something like `Tony <tony@signdayapp.com>` (must match a verified address on signdayapp.com — you have it)

#### On Vercel (for production)

Vercel dashboard → SignDay project → Settings → Environment Variables. Add the same four vars. **Important:** all four go to "Production" env. Mark `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` as "Sensitive."

### 3. Deploy

If your Vercel is connected to git auto-deploy:

```bash
cd signday-website
git add .
git commit -m "Replace homepage with waitlist LP for SignDay agent"
git push
```

Vercel will rebuild and ship. Watch the deploy at vercel.com.

### 4. Smoke test (do this immediately after deploy)

1. Open `https://signdayapp.com/` in incognito
2. Verify the new LP loads (hero, three bullets, pricing, FAQ, final CTA)
3. Submit your own email (use a real inbox you can check)
4. Verify:
   - You see the success message in the browser
   - You receive the auto-reply email within ~30 seconds
   - The auto-reply asks the 3 questions in plain text
5. Check the Supabase table:
   ```sql
   select * from public.waitlist_signups order by created_at desc;
   ```
   Your test email should be there.

If any of those fail, check Vercel function logs for errors.

## Reading replies

The auto-reply asks parents to reply with grad year, position, and biggest headache. Those replies land in whatever inbox is configured as `WAITLIST_FROM_EMAIL`. Set up a Gmail filter to label them `signday-waitlist` so you don't lose them.

## What changed from your original plan

- **No Tally form.** The 3 questions are inline in the auto-reply email. Parents reply directly. Saves you a SaaS dependency and a click in the funnel.
- **No ConvertKit.** Resend handles the auto-reply directly. You can add ConvertKit later for broadcasts (week 2+ if needed).
- **Single email field on the LP.** Lower friction = more signups = bigger broadcast list. The 3 questions are the qualifier that filters in high-intent leads.

## Next steps (the real work)

Now that the LP ships, the work is distribution, not engineering:

1. Join target FB groups (goalkeeper group first, then tier 2)
2. Lurk for 3 days, capture parent language
3. Post origin story Monday in the goalkeeper group
4. Daily floor: 5 DMs + 1 meaningful comment
5. Run 15-min Zoom calls — target 30 in 30 days

See [`signday-plan.md`](../signday-plan.md) for the full plan.
