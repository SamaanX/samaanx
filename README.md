# SamaanX

**Apki Cheez. Apki Income.**

Mobile-first peer-to-peer rental marketplace PWA (Samaan + Exchange).  
Architecture Plan **v1.2 (frozen)** is the official technical specification.

> **Brand:** SamaanX · Tagline: Apki Cheez. Apki Income.

---

## Overview

SamaanX connects people who want to rent items with people who have idle assets nearby.  
Pakistan is the initial launch market; the architecture is location-aware and multi-region ready.

---

## Technology stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router, React 19, TypeScript (strict) |
| Styling | Tailwind CSS, shadcn/ui, Framer Motion, Lucide |
| Validation | Zod, React Hook Form |
| Data | Supabase PostgreSQL + Prisma ORM |
| Auth | Supabase Auth (Email + Google) |
| Storage / Realtime | Supabase |
| Client state | TanStack Query + next-themes |
| Deploy | Vercel |

---

## Architecture summary

- Feature-sliced Clean Architecture on App Router
- `app/` = routes only; business logic in `features/` + `domain/`
- Single route tree; Buyer/Seller mode is a UI preference (not separate trees)
- Admin lives under `/admin` in the same Next.js app
- QR + PIN verification is a first-class module (implemented in a later phase)

See `docs/RentPe-Architecture-Plan.md`.

---

## Getting started

```bash
npm install
cp .env.example .env.local
# fill secrets
npm run db:generate
npm run dev
```

Open the Local URL printed by Next.js (often `http://localhost:3000`).

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Prisma client generate |
| `npm run db:push` | Push schema |
| `npm run db:migrate` | Migrate |
| `npm run db:seed` | Seed categories |
| `npm run db:studio` | Prisma Studio |

---

## Environment variables

See `.env.example`. Required for a working local shell:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`

Never commit `.env.local` or secrets.

---

## Development workflow

1. **One Phase = One Pull Request**
2. Implement only the current phase scope
3. Run `typecheck`, `lint`, and `format:check` before review
4. Husky + lint-staged run on commit
5. Do not start the next phase until the current phase is reviewed and approved

---

## License

Proprietary — SamaanX. All rights reserved.
