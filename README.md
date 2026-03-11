# Natlovers

Natlovers is a bilingual artisan commerce platform for an Indonesian handcrafted bag brand. This scaffold is designed to support a gallery-inspired storefront, direct product sales, custom commissions, customer accounts, and an integrated admin panel.

## Included in this scaffold

- `Next.js` App Router structure for public pages, customer dashboard, and admin panel
- `Tailwind CSS` design system with a green and beige gallery-inspired visual direction
- `Prisma` schema for users, products, orders, custom requests, and contact submissions
- Multi-currency helpers for `IDR`, `USD`, `GBP`, `AUD`, `SGD`, and `MYR`
- English and Bahasa Indonesia translation dictionaries
- API route placeholders for contact, custom requests, and checkout
- Seed data representing Natlovers brand storytelling and products

## Pages

- `/`
- `/about`
- `/catalogue`
- `/catalogue/[slug]`
- `/custom`
- `/gallery`
- `/contact`
- `/social-medias`
- `/login`
- `/dashboard`
- `/admin`

## Setup

1. Install Node.js 20+ and npm.
2. Install dependencies:

```bash
npm install
```

3. Copy environment values:

```bash
cp .env.example .env
```

4. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Seed the database:

```bash
npm run db:seed
```

6. Start the app:

```bash
npm run dev
```

## Next implementation steps

- Replace placeholder auth with hashed credentials or OAuth-backed `NextAuth`
- Persist API submissions with Prisma
- Add shopping cart and Stripe Checkout session creation
- Add image uploads for admin-managed product galleries
- Build admin CRUD flows for products, categories, orders, and commissions
- Add language and currency switching in the UI header
