# Rio Car Wash — Full-Stack Ecosystem

**Rio Автомойка | Стирка ковров | Химчистка | Каракол**

Luxury dark-themed car wash platform for the Karakol branch at Gagarin St. 27/1.

## Apps

| Path | Stack | Purpose |
|------|--------|---------|
| `web/` | Next.js 14 App Router | Marketing site, Admin panel, Worker portal |
| `mobile/` | Expo (React Native) | Customer loyalty + QR |
| `supabase/migrations/` | PostgreSQL | Schema, RLS, functions |

Languages: **Kyrgyz (default)**, Russian, English.

## Quick start (web)

```bash
cd web
cp .env.example .env.local   # add Supabase keys
npm install
npm run dev
```

Open `http://localhost:3000/ky`.

## Mobile

```bash
cd mobile
npm install
npx expo start
```

## Deploy

- Web: Render Blueprint (`render.yaml`) — connect this repo and deploy the `web` service.
- Database: run SQL in `supabase/migrations/` in the Supabase SQL editor.

## GitHub

```bash
git remote add origin https://github.com/<you>/riocar1.git
git push -u origin arena/01a01ebf-riocar1
```

## Contact

- WhatsApp: [+996 505 696 797](https://wa.me/505696797)
- Hours: 08:00 – 22:00
- Address: ул. Гагарина 27/1, Каракол
