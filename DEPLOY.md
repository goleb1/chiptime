# Deploying ChipTime

## Vercel Setup

1. Push the repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Framework preset: **Next.js** (auto-detected)
4. Set environment variables in the Vercel dashboard:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. from Neon, Supabase, or Railway) |
| `ADMIN_SECRET` | Secret path segment for the admin panel (e.g. a UUID) |

5. Deploy

## Custom Domain (chiptime.app)

1. In Vercel project settings > Domains, add `chiptime.app`
2. At your domain registrar, set DNS:
   - **A record**: `@` → `76.76.21.21`
   - **CNAME**: `www` → `cname.vercel-dns.com`
3. Wait for DNS propagation (usually < 5 minutes)
4. Vercel auto-provisions an SSL certificate

## Database Migrations

Run Prisma migrations against the production database:

```bash
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

## Updating

Push to `main` — Vercel auto-deploys on every push.
