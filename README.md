# RentPe

**Rent Anything. From Anyone. Anywhere.**

Mobile-first peer-to-peer rental marketplace PWA.  
Architecture Plan **v1.2 (frozen)** is the official technical specification.

> **Current phase:** Phase 0 — Project Scaffold & Foundation  
> No product features are implemented yet.

---

## Overview

RentPe connects people who want to rent items with people who have idle assets nearby.  
Pakistan is the initial launch market; the architecture is location-aware and multi-region ready.

This repository currently contains **foundation only**: tooling, design tokens, providers, and folder scaffold.

---

## Technology stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router, React 19, TypeScript (strict) |
| Styling | Tailwind CSS, shadcn/ui, Framer Motion, Lucide |
| Validation | Zod, React Hook Form |
| Data | Supabase PostgreSQL + Prisma ORM |
| Auth (later) | Supabase Auth |
| Storage / Realtime (later) | Supabase |
| Client state | TanStack Query + next-themes |
| Deploy | Vercel |

---

## Architecture summary

- Feature-sliced Clean Architecture on App Router
- `app/` = routes only; business logic in `features/` + `domain/`
- Single route tree; Buyer/Seller mode is a later UI preference (not separate trees)
- Admin lives under `/admin` in the same Next.js app
- QR + PIN verification is a first-class module (implemented in a later phase)

See `docs/RentPe-Architecture-Plan.md`.

---

## Getting started

### Prerequisites

- Node.js 20+
- npm 10+
- (Optional for Phase 0) Supabase project — placeholders work for UI shell only

### Setup

```bash
cp .env.example .env.local
# Edit .env.local with real Supabase values when available

npm install
npm run db:generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Folder explanation

```
app/           Next.js routes (marketing, auth, app shell, admin, api)
features/      Feature modules (scaffold only in Phase 0)
domain/        Pure business rules (framework-free; empty for now)
components/ui  Shared shadcn primitives
lib/           Infrastructure (db, supabase, seo, errors, utils)
providers/     Theme + TanStack Query
config/        Env validation + app constants
prisma/        Prisma schema (no models yet)
docs/          Architecture + ADRs
tests/ e2e/    Test placeholders
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Prisma client generate |
| `npm run db:push` | Push schema (not used until models exist) |
| `npm run db:migrate` | Migrate (not used until models exist) |
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

### Phase 0 out of scope

No auth, listings, models, marketplace UI, QR/PIN, chat, search, maps, server actions, or business APIs.

---

## License

Proprietary — RentPe. All rights reserved.
