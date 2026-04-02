# LaunchPad Setup Guide

Follow these steps to get the app running locally.

## Prerequisites

- Node.js 18+ installed (https://nodejs.org)
- A Supabase account (free tier works — https://supabase.com)
- A Google Cloud project for OAuth (you may already have one via SFHS)

---

## Step 1: Create a Supabase Project

1. Go to https://supabase.com/dashboard and click **New Project**
2. Name it `launchpad` (or whatever you prefer)
3. Set a strong database password — you'll need it for the connection string
4. Choose a region close to you (e.g., West US)
5. Wait for provisioning (~2 minutes)

## Step 2: Get Your Connection Details

From your Supabase project dashboard:

1. **API keys**: Go to Settings > API
   - Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Database connection strings**: Go to Settings > Database > Connection string > URI
   - **Transaction mode** (port 6543) → `DATABASE_URL` (append `?pgbouncer=true`)
   - **Session mode** (port 5432) → `DIRECT_URL`

## Step 3: Configure Environment Variables

```bash
cd LaunchPad
cp .env.example .env.local
```

Fill in `.env.local` with the values from Step 2.

## Step 4: Set Up Google OAuth

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new **OAuth 2.0 Client ID** (Web application)
3. Add these authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (for local dev)
   - `https://your-project-ref.supabase.co/auth/v1/callback` (for Supabase)
4. Copy the **Client ID** and **Client Secret**
5. In Supabase: go to Authentication > Providers > Google
   - Enable Google provider
   - Paste the Client ID and Client Secret
   - Save

## Step 5: Install Dependencies and Push Schema

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
```

This will:
- Install all packages
- Generate the Prisma client from `schema.prisma`
- Push the schema to your Supabase PostgreSQL database
- Seed the database with 60 milestones, scoring rules, semester configs, etc.

## Step 6: Apply RLS Policies

Open the Supabase SQL Editor (Database > SQL Editor) and paste the contents of `supabase/rls-policies.sql`. Run it.

This enables row-level security on all tables so students can only see their own data.

## Step 7: Update Email Domain Config

In `app/auth/callback/route.ts`, update two things:

1. The instructor email check:
   ```ts
   const isInstructor = email === "bcannon@sfhs.com"; // ← your actual SFHS email
   ```

2. The domain check for students:
   ```ts
   const isSFHSEmail = email.endsWith("@sfhs.com"); // ← your actual domain
   ```

Also update the domain hint in `app/login/page.tsx`:
```ts
hd: "sfhs.com", // ← your actual Google Workspace domain
```

## Step 8: Run the Dev Server

```bash
npm run dev
```

Open http://localhost:3000 — you should see the login page.

---

## Useful Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npx prisma studio` | Visual database browser |
| `npx prisma db push` | Push schema changes to DB |
| `npx prisma db seed` | Re-run seed data |
| `npx prisma migrate dev` | Create a migration |

## Deploying to Vercel

1. Push the project to a GitHub repo
2. Import the repo in Vercel (https://vercel.com/new)
3. Add the same environment variables from `.env.local`
4. Update the Google OAuth redirect URI to include your Vercel domain
5. Deploy
