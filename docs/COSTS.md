# FAINEANT Marketplace — Infrastructure & Service Costs (Historical)

> Archived estimate for the retired standalone API architecture. Recalculate
> costs from current Vercel, Supabase, Stripe, Resend, and Google usage.

> Exhaustive cost breakdown for launching and operating FAINEANT.
> All prices as of April 2026. Costs shown as monthly unless noted.

---

## Quick Summary

| Tier | Monthly Cost | Annual Cost | Notes |
|------|-------------|-------------|-------|
| **MVP / Launch** | $67–117/mo | $804–1,404/yr | Minimal viable production setup |
| **Growth (1K–10K users)** | $250–550/mo | $3,000–6,600/yr | Scaled infrastructure |
| **Scale (10K–100K users)** | $800–2,500/mo | $9,600–30,000/yr | High availability, CDN, monitoring |

---

## 1. Domain & DNS

| Item | Provider | Cost | Notes |
|------|----------|------|-------|
| Primary domain (`faineantapp.com`) | Cloudflare / Namecheap / Google Domains | $10–50/yr | `.com` domains ~$15/yr, premium names vary |
| Additional domain (redirect) | Same | $10–15/yr | Optional: `faineantbeauty.com` etc. |
| DNS hosting | Cloudflare (free tier) | **$0** | Included with domain transfer to CF |
| SSL/TLS certificates | Cloudflare / Vercel / Let's Encrypt | **$0** | Auto-provisioned |

**Annual total: $10–65/yr ($1–5/mo)**

---

## 2. Frontend Hosting (Next.js Web App)

Deployed via Vercel (configured in `vercel.json`).

| Item | Vercel Plan | Cost | Includes |
|------|-------------|------|----------|
| **Hobby** (dev/staging) | Hobby | **$0** | 100GB bandwidth, 1 concurrent build |
| **Pro** (production) | Pro | **$20/mo** per team member | 1TB bandwidth, 10 concurrent builds, analytics, preview deploys |
| Bandwidth overage (Pro) | Pro | $40/100GB | After 1TB included |
| Edge Function invocations | Pro | Included up to 1M/mo | Additional: $2/1M invocations |
| Serverless Function execution | Pro | Included up to 1000 GB-hrs | Additional: $40/100 GB-hrs |
| Image Optimization | Pro | Included up to 5000/mo | Additional: $5/1000 images |
| Web Analytics | Pro | Included | Core Web Vitals, traffic |
| Speed Insights | Pro | Included up to 10K data points | Additional plans available |

**Recommended: Vercel Pro @ $20/mo** (1 developer)
Scale note: each additional team member adds $20/mo.

---

## 3. API Server Hosting (Express + Prisma)

The API runs as a Docker container (`Dockerfile` present). Options:

### Option A: Railway (Recommended for MVP)

| Item | Plan | Cost | Notes |
|------|------|------|-------|
| Hobby plan | Hobby | **$5/mo** | 8GB RAM, 8 vCPU, $5 credit included |
| Pro plan | Pro | **$20/mo** base + usage | Per-service: ~$0.000231/min vCPU, $0.000231/GB-min RAM |
| Typical Express API (Pro) | Pro | **$10–30/mo** | 0.5 vCPU, 512MB RAM, running 24/7 |
| WebSocket support | Included | $0 | Socket.IO works natively |

### Option B: Render

| Item | Plan | Cost | Notes |
|------|------|------|-------|
| Free tier | Free | $0 | Spins down after 15 min inactivity (not for production) |
| Starter | Starter | **$7/mo** | 0.5 CPU, 512MB RAM, always-on |
| Standard | Standard | **$25/mo** | 1 CPU, 2GB RAM |
| Pro | Pro | **$85/mo** | 2 CPU, 4GB RAM |

### Option C: Fly.io

| Item | Plan | Cost | Notes |
|------|------|------|-------|
| Free allowance | Free | $0 | 3 shared-cpu-1x VMs, 256MB each |
| Production VM | Performance | **$10–30/mo** | 1 shared CPU, 512MB–1GB RAM |
| Dedicated CPU | Dedicated | **$30–60/mo** | 1 dedicated vCPU, 2GB RAM |

### Option D: AWS (ECS/Fargate or EC2)

| Item | Config | Cost | Notes |
|------|--------|------|-------|
| Fargate (0.25 vCPU, 512MB) | ECS | **$10–15/mo** | Pay per second |
| EC2 t3.micro | EC2 | **$8/mo** | 1GB RAM, free tier eligible year 1 |
| EC2 t3.small | EC2 | **$15/mo** | 2GB RAM |
| ALB (load balancer) | ALB | **$16/mo** base + $0.008/LCU-hr | Required for HTTPS termination |

**Recommended: Railway Pro @ $20–30/mo** (simplest Docker deployment with WebSocket support)

---

## 4. Database (PostgreSQL)

Prisma connects via `DATABASE_URL`. Options:

### Option A: Neon (Recommended for MVP)

| Item | Plan | Cost | Notes |
|------|------|------|-------|
| Free tier | Free | **$0** | 0.5GB storage, 190 compute-hours/mo, autoscaling to 0 |
| Launch plan | Launch | **$19/mo** | 10GB storage, 300 compute-hours/mo |
| Scale plan | Scale | **$69/mo** | 50GB storage, 750 compute-hours/mo, read replicas |

### Option B: Supabase (Postgres)

| Item | Plan | Cost | Notes |
|------|------|------|-------|
| Free tier | Free | $0 | 500MB storage, 2 projects |
| Pro | Pro | **$25/mo** | 8GB storage, daily backups, no pause |
| Team | Team | **$599/mo** | SOC2, priority support |

### Option C: Railway Postgres

| Item | Plan | Cost | Notes |
|------|------|------|-------|
| Included with Railway | Plugin | **$5–15/mo** usage-based | 1GB storage included, $0.000231/GB-min |

### Option D: AWS RDS

| Item | Config | Cost | Notes |
|------|--------|------|-------|
| db.t3.micro | RDS | **$15/mo** | 1 vCPU, 1GB RAM, 20GB storage |
| db.t3.small | RDS | **$30/mo** | 1 vCPU, 2GB RAM |
| Automated backups | RDS | Included | Up to DB size in free backup storage |

**Recommended: Neon Launch @ $19/mo** (serverless scaling, connection pooling built-in, Prisma-compatible)

---

## 5. Redis (Caching & Sessions)

Referenced in `docker-compose.yml`. Needed for rate limiting, caching, Socket.IO adapter at scale.

| Provider | Plan | Cost | Notes |
|----------|------|------|-------|
| Upstash (serverless Redis) | Free | **$0** | 10K commands/day, 256MB |
| Upstash Pro | Pro | **$10/mo** | 200K commands/day, pay-per-use after |
| Railway Redis | Plugin | **$5–10/mo** | Usage-based |
| AWS ElastiCache (t3.micro) | AWS | **$13/mo** | 0.5GB, single node |
| Render Redis | Starter | **$10/mo** | 25MB, persistent |

**Recommended: Upstash Free → Pro @ $0–10/mo** (serverless, no idle cost)

---

## 6. File Storage (S3)

Configured in `env.ts` for portfolio images, avatars, review photos.

| Provider | Plan | Cost | Notes |
|----------|------|------|-------|
| **AWS S3** | Standard | **$0.023/GB/mo** storage + $0.09/GB transfer | First 5GB free (12 months) |
| Estimated 10GB images | S3 | **~$1–3/mo** | With moderate transfer |
| Estimated 100GB images | S3 | **~$5–15/mo** | At scale |
| **Cloudflare R2** | R2 | **$0.015/GB/mo** storage, **$0 egress** | 10GB free, no transfer fees |
| **Vercel Blob** | Pro | **$0/mo** first 1GB, $0.30/GB after | Simple integration |

**Recommended: Cloudflare R2 @ $0–5/mo** (zero egress fees, S3-compatible API)

---

## 7. Email Service

Needed for: verification, booking confirmations, password reset, notifications.

### Transactional Email — Resend (Recommended)

**Why Resend:** Modern API, built by ex-Vercel team, first-class React Email support (build templates in JSX/TSX), excellent deliverability, simple DNS setup, works perfectly with Next.js/Node.

| Resend Plan | Cost | Emails/mo | Domains | API Keys | Support |
|-------------|------|-----------|---------|----------|---------|
| **Free** | **$0** | 3,000 (100/day) | 1 | 2 | Community |
| **Pro** | **$20/mo** | 50,000 | 10 | 20 | Email support |
| **Scale** | **$90/mo** | 100,000 | 100 | 200 | Priority |
| **Enterprise** | Custom | Custom | Unlimited | Unlimited | Dedicated |

Resend overage: $0.00040/email after plan limit.

#### Email Templates Needed for FAINEANT

| Template | Trigger | Priority |
|----------|---------|----------|
| Email verification | User registers | Phase 1 |
| Welcome email | After verification | Phase 1 |
| Password reset | User requests reset | Phase 1 |
| Booking confirmation (client) | Booking created | Phase 1 |
| Booking confirmation (provider) | New booking received | Phase 1 |
| Booking reminder (24hr) | Cron job | Phase 2 |
| Booking cancelled | Booking status change | Phase 2 |
| Payment receipt | Stripe webhook (payment_intent.succeeded) | Phase 2 |
| New review received | Review created | Phase 3 |
| Payout summary (weekly) | Cron job | Phase 3 |
| Provider approved/verified | Admin action | Phase 3 |
| Community post reply | Comment on user's post | Phase 3 |
| Monthly digest | Cron job | Phase 4 |

#### Template Implementation with React Email

Resend uses [React Email](https://react.email) — templates are React components:

```
apps/api/src/emails/
  booking-confirmation.tsx
  email-verification.tsx
  password-reset.tsx
  payment-receipt.tsx
  welcome.tsx
```

React Email provides free pre-built component primitives (`@react-email/components`): Html, Head, Body, Container, Section, Text, Button, Img, Link, Hr, Preview, Heading.

Cost for React Email: **$0** (open source).

#### DNS Setup Required

To send from `noreply@faineantapp.com`, add these DNS records (provided by Resend):

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| TXT | faineantapp.com | `v=spf1 include:amazonses.com ~all` | SPF (sender auth) |
| CNAME | resend._domainkey.faineantapp.com | `[provided by Resend]` | DKIM (signing) |
| TXT | _dmarc.faineantapp.com | `v=DMARC1; p=none;` | DMARC (policy) |
| MX | send.faineantapp.com | `feedback-smtp.us-east-1.amazonses.com` | Bounce handling |

No Google Workspace seat needed for `noreply@faineantapp.com` — Resend handles sending directly.

#### Estimated Email Volume

| Stage | Monthly Users | Emails/mo | Plan | Cost |
|-------|--------------|-----------|------|------|
| MVP (0–100 users) | 100 | ~500 | Free | $0 |
| Launch (100–1K users) | 1,000 | ~5,000 | Free | $0 |
| Growth (1K–5K users) | 5,000 | ~25,000 | Pro | $20/mo |
| Scale (5K–20K users) | 20,000 | ~80,000 | Scale | $90/mo |

**Recommended: Resend Free → Pro @ $0–20/mo**

### Alternative Transactional Email Providers (for reference)

| Provider | Free Tier | Paid | Notes |
|----------|-----------|------|-------|
| SendGrid | 100 emails/day | $20/mo (50K) | Twilio-owned, mature |
| Postmark | None | $15/mo (10K) | Best deliverability |
| AWS SES | 62K free/mo (from EC2) | $0.10/1000 | Cheapest at scale |
| Mailgun | 100/day (30 day trial) | $15/mo (10K) | Good API |

### Business Email (Google Workspace)

| Plan | Cost | Includes |
|------|------|----------|
| **Business Starter** | **$7.20/user/mo** ($86.40/yr) | 30GB Drive, custom email (you@faineantapp.com), Meet (100 participants) |
| **Business Standard** | **$14.40/user/mo** ($172.80/yr) | 2TB Drive, recording, 150 Meet participants |
| **Business Plus** | **$21.60/user/mo** ($259.20/yr) | 5TB Drive, Vault, advanced endpoint management |

Minimum team emails needed:
| Email | Purpose |
|-------|---------|
| `hello@faineantapp.com` | General inquiries |
| `support@faineantapp.com` | Customer support |
| `noreply@faineantapp.com` | Transactional emails (can use Resend, no Workspace seat needed) |
| `admin@faineantapp.com` | Admin/billing |

**Recommended: 2 Google Workspace Starter seats @ $14.40/mo** ($172.80/yr)
Use Resend for transactional `noreply@` emails (no seat needed, just DNS verification).

---

## 8. Payment Processing (Stripe)

Already integrated with Stripe Connect.

| Item | Cost | Notes |
|------|------|-------|
| Stripe processing fee | **2.9% + $0.30 per transaction** | Standard US card rate |
| Stripe Connect (Express) | **$2/mo per active connected account** | Waived for first $1M in volume for startups |
| FAINEANT platform fee | **2.9% per transaction** (configurable) | Your revenue from `STRIPE_PLATFORM_FEE_PERCENT` |
| Payout to providers | **$0.25 per payout** (Instant: 1%) | Standard payouts are free |
| Stripe Radar (fraud) | **$0.05/transaction** | Optional, recommended |
| Stripe Tax | **$0.50/transaction** | Optional, auto sales tax |
| Disputes/chargebacks | **$15 per dispute** | Win or lose |

**Cost: Variable (transaction-based only, no monthly fee)**
Revenue: With 2.9% platform fee, FAINEANT earns ~$2.90 per $100 transaction.

---

## 9. SMS & Push Notifications

### SMS (Twilio)

Configured in `env.ts` (TWILIO_ACCOUNT_SID, etc.)

| Item | Cost | Notes |
|------|------|-------|
| Phone number | **$1.15/mo** | US local number |
| Outbound SMS (US) | **$0.0079/message** | ~$7.90 per 1000 messages |
| Inbound SMS | **$0.0075/message** | If you accept replies |
| MMS (with images) | **$0.02/message** | For appointment reminders with images |

Estimated usage (1000 active users):
- Booking confirmations: ~2000 SMS/mo = **~$16/mo**
- Reminders: ~1000 SMS/mo = **~$8/mo**
- Total: **~$25/mo**

### Push Notifications (Expo)

| Item | Cost | Notes |
|------|------|-------|
| Expo Push Notifications | **$0** | Free, unlimited |
| Apple APNs | **$0** | Included with Apple Developer account |
| Firebase Cloud Messaging (Android) | **$0** | Free, unlimited |

**Recommended: Skip Twilio at launch, use push notifications (free). Add SMS later.**

---

## 10. Maps & Geolocation

Configured in `env.ts` (GOOGLE_MAPS_API_KEY) and `app.json` (iOS/Android keys).

| API | Free Tier | Cost After | Notes |
|-----|-----------|------------|-------|
| **Google Maps JavaScript API** | $200/mo credit (~28K loads) | $7/1000 loads | Web map display |
| **Google Maps Mobile SDK** | $200/mo credit (~28K loads) | $7/1000 loads | iOS/Android maps |
| **Google Geocoding API** | $200/mo credit (~40K requests) | $5/1000 requests | Address → lat/lng |
| **Google Places API** | $200/mo credit | $17–32/1000 requests | Autocomplete, place details |

Google gives **$200/mo free credit** across all Maps APIs. This covers ~28,000 map loads or ~40,000 geocoding calls.

**Alternative: Mapbox**
| Item | Free Tier | Cost After |
|------|-----------|------------|
| Map loads | 50K/mo free | $5/1000 |
| Geocoding | 100K/mo free | $5/1000 |
| Directions | 100K/mo free | $5/1000 |

**Recommended: Google Maps @ $0/mo** (free credit covers MVP). Switch to Mapbox if volume exceeds $200/mo.

---

## 11. Mobile App Distribution

### Apple (iOS)

| Item | Cost | Notes |
|------|------|-------|
| **Apple Developer Program** | **$99/yr** ($8.25/mo) | Required for App Store publishing |
| App Store commission | **15–30% of in-app purchases** | 15% for <$1M revenue (Small Business Program) |
| TestFlight | **$0** | Included, up to 10K testers |

### Google (Android)

| Item | Cost | Notes |
|------|------|-------|
| **Google Play Console** | **$25 one-time** | Lifetime access |
| Play Store commission | **15–30% of in-app purchases** | 15% for first $1M/yr |
| Internal testing | **$0** | Unlimited |

### Expo Application Services (EAS)

| Plan | Cost | Includes |
|------|------|----------|
| Free | **$0** | 30 builds/mo (low priority queue) |
| Production | **$99/mo** | Unlimited builds, priority queue, update channels |

Note: FAINEANT processes payments via Stripe (not IAP), so App Store/Play Store commissions likely don't apply to service bookings. Apple's rules may require 30% cut on digital goods — but real-world service bookings are typically exempt.

**Recommended:**
- Apple Developer: **$99/yr**
- Google Play: **$25 one-time**
- EAS Free tier initially, upgrade to Production ($99/mo) when shipping regularly

---

## 12. Monitoring & Error Tracking

| Service | Free Tier | Paid | Notes |
|---------|-----------|------|-------|
| **Sentry** | 5K errors/mo | **$26/mo** (50K errors, 100K replays) | Error tracking + session replay |
| **Vercel Analytics** | Included with Pro | $0 | Web Vitals, traffic |
| **Vercel Speed Insights** | 10K data points/mo | $0 with Pro | Performance monitoring |
| **BetterStack (Uptime)** | 5 monitors | **$24/mo** (50 monitors) | Uptime monitoring + status page |
| **LogTail / Axiom** | 1GB/mo | **$25/mo** (25GB) | Log aggregation |

**Recommended MVP: Sentry Free + Vercel Analytics @ $0/mo**

---

## 13. CI/CD

| Service | Free Tier | Paid | Notes |
|---------|-----------|------|-------|
| **GitHub Actions** | 2000 min/mo (free repos) | $0.008/min (private) | CI/CD pipeline |
| **Vercel** (builds) | Included with Pro | $0 | Auto-deploy on push |

Typical FAINEANT pipeline (lint + typecheck + test + build): ~5 min per run.
At 100 runs/mo = 500 min → well within free tier.

**Recommended: GitHub Actions Free + Vercel Pro @ $0 additional**

---

## 14. AI Features (Optional/Future)

Configured in `env.ts` (ANTHROPIC_API_KEY).

| Service | Cost | Notes |
|---------|------|-------|
| Anthropic Claude (Sonnet) | $3/1M input, $15/1M output tokens | AI-powered recommendations, chat |
| OpenAI GPT-4o | $2.50/1M input, $10/1M output | Alternative |
| Vercel AI Gateway | Free routing layer | Provider switching, fallback |

Estimated 1000 AI queries/mo at ~500 tokens each: **~$5–10/mo**

---

## 15. Miscellaneous

| Item | Cost | Notes |
|------|------|-------|
| GitHub (Team) | **$4/user/mo** | Private repos, code review, Actions |
| GitHub (Free) | **$0** | Unlimited private repos, 2000 CI mins |
| Figma (design) | **$0–15/mo** | Free for 3 files, Pro $15/editor/mo |
| Linear (project management) | **$0–8/user/mo** | Free for small teams |
| 1Password (team) | **$8/user/mo** | Secret management |

---

## 16. Customer Support Tools

| Provider | Free Tier | Paid | Notes |
|----------|-----------|------|-------|
| **Crisp** (recommended launch) | 20 tickets/day, live chat | **$25/mo** Pro (unlimited) | Shared inbox, chat widget, mobile SDK |
| **Plain** | — | **$29/mo** (unlimited seats) | Modern, built for product teams |
| **Intercom** | — | **$139/seat/mo** | Full-featured but expensive |
| **Zendesk** | — | **$55–115/agent/mo** | Enterprise-grade |

FAINEANT is a two-sided marketplace — you'll field issues from **both** clients and providers (booking disputes, payment questions, onboarding help). Budget accordingly.

**Recommended: Crisp Free at launch → $25/mo when volume grows.**

---

## 17. Product Analytics

| Provider | Free Tier | Paid | Notes |
|----------|-----------|------|-------|
| **PostHog** (recommended) | 1M events + 5K recordings/mo | **$0.00045/event** after | Self-hostable, feature flags, funnels |
| **Mixpanel** | 1M events/mo | **$28/mo** Growth | Best funnel/retention analysis |
| **Amplitude** | 50K MTUs | **$49/mo** Growth | Similar to Mixpanel |
| **Vercel Analytics** | Included with Pro | $0 | Web Vitals + traffic only |

Key metrics to track for FAINEANT: search-to-book conversion, provider activation rate, booking completion rate, repeat booking rate, time-to-first-booking.

**Recommended: PostHog Free @ $0/mo** (generous free tier, instrument from day 1)

---

## 18. CRM (Provider Acquisition)

| Provider | Free Tier | Paid | Notes |
|----------|-----------|------|-------|
| **HubSpot** (recommended) | Unlimited contacts, pipeline | **$20/mo** Starter | Most popular free CRM |
| **Attio** | — | **$29/seat/mo** | Modern, flexible, startup-friendly |
| **Folk** | — | **$20/seat/mo** | Lightweight CRM |

You're building a two-sided marketplace. Provider acquisition is effectively a sales motion — track your pipeline of providers being onboarded, follow up on incomplete registrations.

**Recommended: HubSpot Free @ $0/mo**

---

## 19. Compliance & Regulatory

### PCI DSS
FAINEANT uses Stripe.js client-side tokenization — card data never touches FAINEANT servers.
Qualifies for **SAQ-A** (simplest self-assessment). Cost: **$0** (fill out questionnaire annually).

### CCPA / State Privacy Laws
20+ states have privacy laws. If you have California users, CCPA applies.
- Requires: opt-out rights, data deletion, disclosure of practices
- Cost: **$0** if built into privacy policy from day 1. **$1,000–2,000** for lawyer review.

### ADA / WCAG Accessibility
**This is a real litigation risk.** 5,000+ digital accessibility lawsuits filed in 2025 (20% YoY increase). Settlements run $5,000–$75,000+. Marketplace booking flows are prime targets.
- Cost now: **$0** (build accessible components using semantic HTML, ARIA labels, color contrast)
- Cost if sued: **$5,000–$75,000+**
- Professional audit: **$5,000–$30,000**

**Build accessible from day one. Use axe-core or Lighthouse automated testing.**

### SOC 2 (Future)
Not needed at launch. Required for enterprise partnerships.
- Cost: **$8,000–$15,000/yr** via Vanta/Secureframe + auditor
- Timing: 12–24 months post-launch

### Cosmetology License Verification
Beauty providers must be licensed in their state. If FAINEANT lists an unlicensed provider and a client is harmed, FAINEANT faces liability.
- Minimum: Require providers to self-attest licensing in ToS (**$0**)
- Better: Integrate license verification API (LicenseLogix, Certn): **$5–10/verification**
- Timing: Self-attestation at launch, automated verification in Phase 2

---

## 20. Content Moderation

FAINEANT has user-generated content: reviews, community posts, comments, portfolio photos, profile images, messages. All need moderation.

| Approach | Cost | Notes |
|----------|------|-------|
| Basic rules + admin review queue | **$0** | Admin panel already exists (`admin.routes.ts`) |
| AI text moderation (Claude API) | **$5–20/mo** | Already have `ANTHROPIC_API_KEY` in env |
| AI image moderation (AWS Rekognition) | **$1/1,000 images** | Flag NSFW/inappropriate portfolio photos |
| Manual moderation (contractor) | **$15–25/hr** | When volume exceeds what AI + admins can handle |

**Recommended: Admin review queue + Claude API for text @ $0–20/mo at launch**

---

## 21. Twilio 10DLC Registration (MANDATORY for SMS)

**Often overlooked.** Without A2P 10DLC registration, US carriers will filter/block your SMS messages.

| Item | Cost | Notes |
|------|------|-------|
| Brand registration | **$4.50–$46 one-time** | Depends on company size |
| Campaign registration | **$15/mo recurring** | Per campaign (e.g., "booking confirmations") |
| Carrier pass-through fees | **$0.003–$0.005/msg** | On top of Twilio's per-message fee |
| Registration timeline | **1–4 weeks** | Start before launch |

Without registration, your booking confirmation SMS will silently fail. Start this process during pre-launch.

---

## 22. Background Checks for Providers (Optional)

For providers who do mobile/at-home services (coming to client's home). Less critical for salon-only services.

| Provider | Cost per Check | Notes |
|----------|---------------|-------|
| **Checkr API** | **$30** | Basic criminal + identity |
| **Certn** | **$5–70** | Range of check depths |
| **GoodHire** | **$30–80** | Comprehensive packages |

Who pays: Most marketplaces charge the provider or split the cost.

**Recommended: Provider self-attestation at launch. Add background checks for at-home services in Phase 2.**

---

## 23. Accounting & Tax

### Bookkeeping Software

| Provider | Cost | Notes |
|----------|------|-------|
| **Wave** | **$0** | Free accounting, invoicing, receipt scanning |
| **QuickBooks Simple Start** | **$30/mo** | Better reporting, tax prep integration |
| **Bench** (managed) | **$300/mo** | Dedicated bookkeeper, ideal when revenue exceeds $10K/mo |

### Tax Preparation

| Item | Cost | Notes |
|------|------|-------|
| CPA (annual business return) | **$1,500–3,500/yr** | LLC/S-Corp return + state filings |
| Quarterly estimated taxes | **Variable** | Required if you owe $1,000+ in taxes |
| State franchise tax (if DE LLC) | **$300/yr** | Delaware annual fee |
| State sales tax compliance | **$0–2,000/yr** | May apply to platform fees in some states |

**Recommended: Wave (free) at launch → QuickBooks ($30/mo) when revenue starts. CPA from year 1.**

---

## 24. Payroll (When Hiring)

| Provider | Base + Per Person | Notes |
|----------|------------------|-------|
| **Gusto** (recommended) | **$40/mo + $6/person** | US payroll, benefits, tax filing |
| **Rippling** | **$8/person/mo** (no base) | More features, higher complexity |
| **Deel** | **$49/contractor/mo** | International contractors |

**Not needed until first W-2 hire.** Use 1099 contractors initially (just pay via Mercury + file 1099s).

---

## 25. Insurance (Detailed)

A marketplace connecting strangers for physical services has real liability exposure.

| Type | Monthly Cost | Annual | When Needed |
|------|-------------|--------|-------------|
| General Liability | **$30–60** | $360–720 | **At launch** |
| Professional Liability / E&O | **$50–100** | $600–1,200 | **At launch** |
| Cyber Liability | **$80–250** | $1,000–3,000 | At launch or within 3 months |
| D&O Insurance | **$300–500** | $3,500–6,000 | Before fundraising only |

Providers should carry their own professional liability insurance (cosmetology insurance). FAINEANT should **require** providers to maintain their own coverage and add this to provider terms.

**Recommended at launch: GL + E&O bundle via Hiscox or Next Insurance @ ~$100/mo ($1,200/yr)**

---

## Business Setup & Pre-Launch Costs

Everything you need to pay for before the app goes live. This is the checklist.

### Business Formation

| Step | Provider | Cost | Notes |
|------|----------|------|-------|
| **LLC formation** | Stripe Atlas | **$500** | Includes Delaware C-Corp or LLC, EIN, registered agent (1 yr), legal templates. Fastest path for tech startups. |
| *Alternative: LLC yourself* | State filing | **$50–500** | GA: $100, DE: $90, CA: $70 + $800 franchise tax, NY: $200 + $25 publication |
| **Registered agent** (if not Atlas) | Northwest / Incfile | **$100–150/yr** | Required in your state of formation |
| **EIN (Tax ID)** | IRS | **$0** | Free, apply online at irs.gov, instant |
| **Operating agreement** | Stripe Atlas / lawyer | **$0–500** | Atlas includes template. DIY or lawyer. |
| **Business license** | City/county | **$50–200** | Varies by jurisdiction |

**Recommended: Stripe Atlas @ $500** — gets you LLC + EIN + registered agent + legal docs + banking setup in one shot.

### Business Banking

| Provider | Monthly Fee | Features | Notes |
|----------|-----------|----------|-------|
| **Mercury** (recommended) | **$0** | Free checking, savings, cards, API, integrations, up to $5M FDIC | Built for startups. Free wire transfers. Stripe/QuickBooks integrations. |
| **Relay** | **$0** | Free checking, up to 20 sub-accounts, 50 physical cards | Good for separating revenue from expenses |
| **Brex** | **$0** | Corporate card + checking, no personal guarantee | Requires $50K+ in account or VC funding |
| **Novo** | **$0** | Free checking, invoicing, integrations | Simple, good for solo founders |
| **Chase Business Complete** | **$15/mo** (waivable) | Waived with $2K balance, 5K free transactions | Traditional bank, physical branches |
| **Traditional bank** | **$10–30/mo** | Varies | Often requires minimum balance |

**Mercury account details:**
- No minimum balance
- No monthly fees
- Free ACH transfers (unlimited)
- Free domestic wires (up to 5/mo)
- International wires: $5 each
- Physical debit card: free
- Virtual cards: unlimited, free
- Treasury: earn ~4.5% APY on idle cash
- Integrations: Stripe, QuickBooks, Expensify, Gusto
- FDIC insured up to $5M through partner banks

**Recommended: Mercury @ $0/mo** — connect directly to Stripe for payouts, free everything.

### Stripe Setup

| Item | Cost | Notes |
|------|------|-------|
| Stripe account | **$0** | Free to create |
| Stripe Atlas (if used for LLC) | Included in $500 | Stripe account auto-created |
| Stripe Connect setup | **$0** | Enable in dashboard |
| First Stripe payout to Mercury | **$0** | 2-day rolling payouts, free |
| Stripe Climate (optional) | 1% of revenue | Optional carbon removal commitment |

Stripe pays out to your Mercury checking account on a 2-day rolling basis (or daily once established). No fees.

### Developer Accounts

| Account | Provider | Cost | What You Get | Setup Time |
|---------|----------|------|-------------|------------|
| **Apple Developer Program** | Apple | **$99/yr** | App Store publishing, TestFlight, Push Notifications, Sign in with Apple | 1–2 days (may take 48hrs for approval) |
| **Google Play Console** | Google | **$25 one-time** | Play Store publishing, internal testing, crash reports | Instant after payment |
| **Expo (EAS)** | Expo | **$0–99/mo** | Cloud builds for iOS/Android, OTA updates, app signing | Instant (GitHub login) |
| **Apple App-Specific Requirements** | | | | |
| DUNS Number (if LLC) | Dun & Bradstreet | **$0** | Required for Apple org account, free but takes 5–14 days | Apply via Apple enrollment |

**Apple Developer setup process:**
1. Create Apple ID (free)
2. If enrolling as organization (recommended): get DUNS number first (free, 5–14 business days)
3. Enroll in Apple Developer Program ($99/yr)
4. Wait for approval (24–48 hours)
5. Create App Store Connect record for FAINEANT
6. Configure certificates, provisioning profiles (or let EAS handle it)
7. Upload first build via EAS

**Google Play setup process:**
1. Create Google account or use existing
2. Pay $25 registration fee
3. Complete identity verification (1–3 days)
4. Create app listing
5. Upload first AAB via EAS
6. Submit for review (typically 1–3 days)

### Domain & Brand

| Item | Provider | Cost | Notes |
|------|----------|------|-------|
| Primary domain | Cloudflare / Namecheap | **$15–50/yr** | `.app` = $15, `.com` varies, premium = $50+ |
| Logo design | Fiverr / 99designs | **$50–500** | Fiverr: $50–150, 99designs: $300–500 contest |
| Brand guidelines | DIY / designer | **$0–300** | Colors, fonts, usage rules |
| App Store screenshots | DIY (Figma) | **$0–200** | Required for both stores, 6.7" and 5.5" sizes |
| App Store icon | DIY | **$0** | 1024x1024, can derive from logo |

### Legal

| Item | Provider | Cost | Notes |
|------|----------|------|-------|
| Terms of Service | Lawyer / Stripe Atlas template | **$500–1,500** | Marketplace ToS more complex than standard |
| Privacy Policy | Lawyer / generator | **$200–800** | Required by App Store and Play Store |
| Cookie Policy | Generator | **$0–100** | iubenda or Termly free tier |
| DMCA policy | Template | **$0** | Required if user-generated content (portfolio photos) |
| Marketplace agreement (provider terms) | Lawyer | **$500–1,000** | Agreement between FAINEANT and service providers |
| **Optional: Trademark** | USPTO | **$250–350** | Per class, recommended but not urgent at launch |

**Recommended: Budget $2,000 for legal.** Stripe Atlas includes basic templates. Supplement with a marketplace-specific lawyer review.

### Insurance (Optional but Recommended)

| Type | Provider | Cost | Notes |
|------|----------|------|-------|
| General liability | Hiscox / Next Insurance | **$30–50/mo** | Covers basic business liability |
| E&O / Professional liability | Same | **$20–40/mo** | Covers software errors, data breaches |
| Cyber liability | Same | **$15–30/mo** | Covers data breach costs, notification |

Most early-stage startups skip insurance until they have revenue. Budget $50–100/mo when you start processing real transactions.

---

## Upfront Budget: Launch to 5,000 Users

### Pre-Launch (One-Time Costs)

| Category | Item | Cost |
|----------|------|------|
| **Business** | Stripe Atlas (LLC + EIN + agent) | $500 |
| **Business** | Business license (city/county) | $150 |
| **Business** | Trademark filing (1 class, USPTO) | $350 |
| **Banking** | Mercury account setup | $0 |
| **Developer** | Apple Developer Program (year 1) | $100 |
| **Developer** | Apple DUNS Number (org enrollment) | $0 |
| **Developer** | Google Play Console | $25 |
| **Developer** | Twilio 10DLC brand registration | $50 |
| **Domain** | Primary domain (faineantapp.com) | $50 |
| **Brand** | Logo + basic brand assets | $300 |
| **Brand** | App Store screenshots + assets | $100 |
| **Legal** | Terms of Service + Privacy Policy | $2,000 |
| **Legal** | Provider marketplace agreement | $750 |
| **Legal** | CCPA/privacy lawyer review | $500 |
| **Compliance** | Accessibility audit (Lighthouse + manual) | $0 |
| | | |
| **TOTAL PRE-LAUNCH** | | **~$4,875** |
| **Rounded** | | **~$5,000** |

### Monthly Operating Budget (1–5K Users)

| Category | Service | Provider | Monthly | Annual |
|----------|---------|----------|---------|--------|
| **Domain & DNS** | Domain renewal + DNS | Cloudflare | $5 | $60 |
| **Frontend** | Web hosting (Pro, 2 seats) | Vercel | $40 | $480 |
| **Backend** | API server (Docker) | Railway Pro | $40 | $480 |
| **Database** | PostgreSQL (managed) | Neon Launch | $25 | $300 |
| **Cache** | Redis (serverless) | Upstash Pro | $15 | $180 |
| **File Storage** | Image uploads (~50GB) | Cloudflare R2 | $5 | $60 |
| **Email (transactional)** | Verification, confirmations | Resend Pro | $25 | $300 |
| **Email (business)** | team@faineantapp.com (3 seats) | Google Workspace | $25 | $300 |
| **Maps** | Geolocation + display | Google Maps | $0 | $0 |
| **Payments** | Processing (transaction %) | Stripe | $0 | $0 |
| **Banking** | Business checking | Mercury | $0 | $0 |
| **Mobile builds** | iOS + Android builds | EAS Production | $100 | $1,200 |
| **Apple Developer** | Annual renewal | Apple | $10 | $100 |
| **Monitoring** | Error tracking | Sentry Team | $30 | $360 |
| **Uptime** | Status page + alerts | BetterStack | $25 | $300 |
| **SMS** | Booking reminders + 10DLC fee | Twilio | $45 | $540 |
| **Insurance** | GL + E&O bundle | Hiscox / Next | $100 | $1,200 |
| **Bookkeeping** | Accounting software | Wave (free) | $0 | $0 |
| **Support** | Live chat + shared inbox | Crisp (free) | $0 | $0 |
| **Analytics** | Product analytics | PostHog (free) | $0 | $0 |
| **CRM** | Provider pipeline | HubSpot (free) | $0 | $0 |
| **Moderation** | AI text moderation | Claude API | $10 | $120 |
| **Misc** | Buffer for overages | — | $25 | $300 |
| | | | | |
| **MONTHLY TOTAL** | | | **$500/mo** | |
| **ANNUAL TOTAL** | | | | **$6,000/yr** |

### Annual Add-Ons (Not Monthly)

| Item | Annual Cost | Notes |
|------|------------|-------|
| CPA tax preparation | $2,000 | Business return + state filings |
| Delaware franchise tax (if DE LLC) | $300 | Annual fee |
| Trademark maintenance (year 5+) | $225 | Class renewal |

### Total Year 1 Budget

| | Cost |
|---|------|
| Pre-launch one-time costs | $5,000 |
| 12 months operating ($500/mo) | $6,000 |
| CPA + annual tax costs | $2,000 |
| **Total Year 1** | **~$13,000** |
| **Total Year 1 + 15% buffer** | **~$15,000** |

**$15,000 gets FAINEANT from zero to 5,000 users** — legally incorporated, trademarked, properly
banked, insured, both app stores, full infrastructure, monitoring, analytics, support tools,
content moderation, and CPA-prepared taxes.

### Pre-Launch Checklist (Order of Operations)

```
Week 1:  Stripe Atlas → LLC + EIN + Banking (takes ~2 weeks)
Week 1:  Register domain on Cloudflare
Week 1:  Apply for DUNS number (for Apple org enrollment)
Week 2:  Open Mercury account (instant once EIN received)
Week 2:  Google Play Console ($25, instant)
Week 2:  Set up Google Workspace (business email)
Week 3:  Apple Developer enrollment ($99, needs DUNS)
Week 3:  Connect Stripe to Mercury for payouts
Week 3:  Legal: draft ToS + Privacy Policy
Week 3:  Set up Resend (transactional email + DNS)
Week 4:  Logo + brand assets finalized
Week 4:  First EAS builds submitted to TestFlight + internal track
Week 5:  App Store + Play Store listings created
Week 5:  Legal review complete
Week 6:  Submit for App Store + Play Store review
Week 6:  Deploy web app to Vercel (production)
Week 7:  LAUNCH
```

---

## What the $500/mo Gets You

**Business & Legal**
- Incorporated LLC with EIN, registered agent, trademark
- Free business checking (Mercury) with Stripe auto-payouts
- General liability + E&O insurance
- Privacy-compliant (CCPA-ready ToS + Privacy Policy)

**Infrastructure**
- Production web app on Vercel with custom domain, SSL, CDN
- Always-on API server with WebSocket support for real-time messaging
- Managed PostgreSQL with daily backups and connection pooling
- Redis cache for sessions and rate limiting
- Image uploads up to 50GB on zero-egress storage (Cloudflare R2)

**Communications**
- 50,000 transactional emails/mo (verification, confirmations, receipts)
- 3 business email addresses (hello@, support@, admin@)
- SMS booking reminders with 10DLC carrier registration (~3,000 msgs/mo)
- Unlimited push notifications (iOS + Android)

**Apps & Distribution**
- iOS and Android apps on both stores with OTA updates
- Priority EAS cloud builds
- Google Maps with $200/mo free credit

**Operations**
- Error tracking with session replay (Sentry)
- Uptime monitoring with status page (BetterStack)
- Product analytics with funnels + retention (PostHog)
- Live chat support widget (Crisp)
- CRM for provider acquisition pipeline (HubSpot)
- AI content moderation for reviews + posts (Claude)
- Accounting-ready (Mercury → Wave/QuickBooks)
- CPA-prepared annual tax return

---

## What Costs $0 (Free Tiers That Last)

These remain free well past 5K users:

| Service | Free Until |
|---------|-----------|
| Google Maps | $200/mo credit (~28K loads) |
| Stripe | No monthly fee ever (transaction % only) |
| GitHub (private repos + Actions) | 2,000 CI minutes/mo |
| Expo Push Notifications | Unlimited, forever |
| Vercel Analytics | Included with Pro |
| Cloudflare DNS + SSL | Always free |
| Firebase Cloud Messaging (Android) | Unlimited, forever |
| Apple Push (APNs) | Included with developer account |

---

## Scaling Costs: 5K → 50K Users

When you outgrow the $400/mo setup:

| Service | At 5K users | At 25K users | At 50K users |
|---------|------------|-------------|-------------|
| Vercel (4 seats) | $40 | $80 | $100 |
| Railway (2 instances) | $40 | $80 | $150 |
| Neon (Scale plan) | $25 | $70 | $70 |
| Upstash | $15 | $30 | $50 |
| R2 (500GB) | $5 | $10 | $15 |
| Resend (Scale) | $25 | $90 | $90 |
| Google Workspace (5 seats) | $25 | $40 | $40 |
| EAS | $100 | $100 | $100 |
| Sentry | $30 | $30 | $50 |
| Twilio | $30 | $75 | $150 |
| Logging (Axiom) | $0 | $25 | $25 |
| Google Maps overage | $0 | $50 | $100 |
| **Monthly total** | **$335** | **$680** | **$940** |

---

## Transaction Economics (Critical)

FAINEANT uses Stripe Connect with `application_fee_amount`. The current platform fee
is **5%** (`STRIPE_PLATFORM_FEE_PERCENT=5` in env). Here's how money actually flows:

### Per-Transaction Breakdown ($45 booking)

```
Client pays                         $45.00

Stripe processing fee (2.9% + $0.30)
  2.9% of $45.00 =  $1.31
  + flat fee      =  $0.30
  Total Stripe    = -$1.61

FAINEANT platform fee (5% of $45.00)    = -$2.25

Provider receives                   $41.14
```

**Key:** Stripe's 2.9% + $0.30 is deducted from the total charge first. FAINEANT's 5%
application fee is taken from what remains. The provider gets the rest.

### FAINEANT's Actual Revenue Per Transaction

| Booking Price | Stripe Fee (2.9%+$0.30) | FAINEANT Fee (5%) | FAINEANT Keeps | Provider Gets |
|---------------|------------------------|-------------|-----------|---------------|
| $20 | $0.88 | $1.00 | **$1.00** | $18.12 |
| $35 | $1.32 | $1.75 | **$1.75** | $31.94 |
| $45 | $1.61 | $2.25 | **$2.25** | $41.14 |
| $50 | $1.75 | $2.50 | **$2.50** | $45.75 |
| $75 | $2.48 | $3.75 | **$3.75** | $68.78 |
| $100 | $3.20 | $5.00 | **$5.00** | $91.80 |
| $150 | $4.65 | $7.50 | **$7.50** | $137.85 |
| $200 | $6.10 | $10.00 | **$10.00** | $183.90 |

FAINEANT's effective take rate is **5% of GMV** regardless of Stripe fees.
Stripe fees are absorbed by the total (shared pain between FAINEANT and provider).

### Should You Raise the Platform Fee?

At 5%, FAINEANT earns $2.25 on a $45 booking. Industry comparisons:

| Platform | Take Rate | Notes |
|----------|-----------|-------|
| FAINEANT (current) | **5%** | Low, competitive |
| Booksy | 3–5% + subscription | $30/mo subscription to providers |
| StyleSeat | 25% on marketplace bookings | Very high, includes marketing |
| Fresha | 0% + payment fee (2.19%+$0.20) | Makes money on payments only |
| Vagaro | $0 platform fee + $25–85/mo subscription | Subscription model |
| Square Appointments | 2.6% + $0.10 | Payment processing only |

**Recommendation:** 5% is competitive for launch. Consider raising to **7–10%** once
you demonstrate value (booking volume, reduced no-shows, provider tools). Or add
a **premium tier** for providers at $15–30/mo with lower transaction fee (2–3%).

### Revenue vs Cost (Corrected with Real Stripe Math)

FAINEANT revenue = **5% of GMV** (the `application_fee_amount`).
Stripe fees are not deducted from FAINEANT's cut — they come from the total charge.

| Monthly GMV | Bookings (~$45 avg) | FAINEANT Revenue (5%) | All Costs | Net |
|-------------|---------------------|-------------------|-----------|-----|
| $5,000 | ~110 | $250 | $700 | **-$450** |
| $10,000 | ~222 | $500 | $700 | **-$200** |
| **$14,000** | **~311** | **$700** | **$700** | **$0 (break-even)** |
| $20,000 | ~444 | $1,000 | $750 | **+$250** |
| $35,000 | ~778 | $1,750 | $750 | **+$1,000** |
| $50,000 | ~1,111 | $2,500 | $800 | **+$1,700** |
| $100,000 | ~2,222 | $5,000 | $1,000 | **+$4,000** |
| $250,000 | ~5,556 | $12,500 | $1,500 | **+$11,000** |

"All Costs" = infra ($500) + insurance ($100) + CPA amortized ($170) + buffer.

**Break-even: ~$14,000/mo GMV** (~311 bookings/mo, ~10 bookings/day)

That's roughly **700–1,200 active users** booking 1–2 times per month.

### Additional Stripe Costs to Budget

Don't forget these transaction-adjacent costs:

| Item | Cost | When |
|------|------|------|
| Stripe processing (2.9%+$0.30) | ~$1.61 per $45 booking | Every transaction |
| Stripe Connect active account fee | $2/mo per active provider | Waived for <$1M volume |
| Disputes/chargebacks | $15 per dispute | Hopefully rare |
| Refunds | Stripe fee is NOT returned | You eat the $1.61 on refunds |
| Instant payouts (if offered) | 1% of payout amount | Optional for providers |
| Stripe Radar (fraud prevention) | $0.05/screened transaction | Recommended at scale |
| Stripe Tax (auto sales tax) | $0.50/transaction | Required in some states |

**Refund risk:** If a $45 booking is refunded, FAINEANT returns the full $45 to the client.
Stripe does NOT refund its $1.61 processing fee. FAINEANT loses $1.61 + its $2.25 fee = **$3.86 loss per refund.**
Budget for a ~2–5% refund/dispute rate at launch.

### Worst-Case Scenario: Refund-Adjusted Revenue

Assuming 3% refund rate:

| Monthly GMV | Bookings | Refunded (3%) | FAINEANT Gross (5%) | Refund Loss | FAINEANT Net Revenue |
|-------------|----------|---------------|----------------|-------------|-----------------|
| $10,000 | 222 | 7 | $500 | -$27 | **$473** |
| $25,000 | 556 | 17 | $1,250 | -$66 | **$1,184** |
| $50,000 | 1,111 | 33 | $2,500 | -$127 | **$2,373** |

Refunds are a minor hit (~5% of revenue). The main risk is chargebacks ($15 each) —
deposit requirements and clear cancellation policies mitigate this.

---

## Budget Summary Card

```
┌─────────────────────────────────────────────────┐
│  FAINEANT Marketplace — Year 1 Budget                │
│                                                 │
│  SETUP (one-time)                               │
│  Stripe Atlas (LLC + EIN)        $500           │
│  Trademark (USPTO)               $350           │
│  Apple Developer                 $100           │
│  Google Play Console             $25            │
│  Twilio 10DLC registration       $50            │
│  Domain + brand                  $450           │
│  Legal (ToS, Privacy, Provider)  $3,250         │
│  Business license                $150           │
│  App Store assets                $100           │
│  Total pre-launch                $4,975 (~$5K)  │
│                                                 │
│  MONTHLY                                        │
│  Infra + services + insurance    $500/mo        │
│  Banking (Mercury)               $0             │
│  Annual operating                $6,000         │
│                                                 │
│  ANNUAL ADD-ONS                                 │
│  CPA tax preparation             $2,000         │
│  DE franchise tax                $300           │
│                                                 │
│  YEAR 1 TOTAL                                   │
│  Pre-launch + 12 months + tax    $13,300        │
│  With 15% buffer                 $15,000        │
│                                                 │
│  REVENUE                                        │
│  Platform fee                    5% of GMV      │
│  Stripe fee (from total)         2.9% + $0.30   │
│  Break-even GMV                  $10,000/mo     │
│  Break-even bookings             ~222/mo (~8/d) │
│  Target users for break-even     ~700-1,200     │
│                                                 │
│  AT $50K GMV:                                   │
│    FAINEANT revenue (5%)              $2,500/mo      │
│    All costs (infra+ins+tax)     $750/mo        │
│    Net profit                    $1,750/mo      │
│                                                 │
│  Refund risk (3% rate)           ~5% of rev     │
│  Chargeback risk ($15 each)      Budget $50/mo  │
└─────────────────────────────────────────────────┘
```
