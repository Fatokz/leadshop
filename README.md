# Lead Shop

Campus commerce and services PWA for **Lead City University (LCU)**, built for the Interswitch hackathon.

- **Store-first discovery:** browse verified stores by category, peak period (Fresher Essentials / Exam Week) and vendor type.
- **Two kinds of verified vendor:** LCU students (matric number, student ID, business permit) and off-campus providers (government ID, LCU security clearance, standing gate pass).
- **Interswitch Web Checkout with escrow:** after the popup closes, the server confirms the payment with Interswitch (`gettransaction.json`). The order is then held in escrow until the buyer gives the vendor a 4-digit delivery PIN.
- **LCU logistics:** vendor pickup, LCU shuttle drop-off at 7 hubs, room delivery, in-room service, off-campus dispatch or a custom location.
- **Gate passes:** booking an off-campus provider into a hostel creates a one-time `LCU-GP-…` pass that security checks on `/admin`.
- **WhatsApp handoff:** a prewritten order message sent with a `wa.me` link, as the alternative to paying in the app.
- **Installable PWA:** manifest, generated icons, and a service worker for offline and weak networks.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no `.env.local`, the app runs in **demo mode**:
- data is held in memory and preloaded with 12 LCU stores and 41 items, and it resets when the server restarts
- any email signs you in (no password)
- `admin@leadshop.demo` gets admin access

Interswitch runs in TEST mode with the public sandbox credentials (`MX6072` / `9405967`). Use the test cards from the IPG guide.

## Connect Firebase

1. Create a project at https://console.firebase.google.com. Enable **Firestore**, **Authentication → Email/Password** and **Storage**. Storage needs the Blaze plan on new projects, but it's free at this usage level.
2. Copy `.env.example` to `.env.local`. Fill in the web app config, a service account key and `ADMIN_EMAILS`.
3. Deploy the security rules: `npx firebase-tools deploy --only firestore:rules,storage`.
4. Restart `npm run dev`, sign in at `/admin` with an admin email, then tap **Load demo data**.

## Demo script (3 minutes)

1. **Fresher:** on the home page, tap *Fresher Essentials*, then *Hair & Beauty*. The verified stores show first. Open **Braids by Joy** (off-campus, LCU cleared).
2. **Book and pay:** book cornrows, choose *In-room service*, enter a room, then pay with **Interswitch** using a test card. The order page shows *Paid · held in escrow*, the delivery PIN and an active **gate pass**.
3. **Gate:** on `/admin` → *Gate check*, enter the pass code. It shows **ALLOW ENTRY**.
4. **Handover:** on `/vendor`, sign in as the store owner and enter the buyer's PIN. The order changes to *Delivered · funds released*.
5. **Onboarding:** a new vendor submits their store on `/vendor`, and the admin approves it on `/admin`. Off-campus providers get an `LCU-PASS-…` code.
6. **Install:** use *Add to Home Screen* on a phone.

> In demo mode, each seeded store's owner is `<store-slug>@leadshop.demo`. For example, sign in to `/vendor` as `braids-by-joy@leadshop.demo`.

## Layout

```
src/app/                 pages + API routes (orders, payments, vendor, admin, gate)
src/lib/server/          repo (Firestore or in-memory), auth, Interswitch requery, order logic
src/lib/                 shared types, LCU campus config, seed data, formatting
src/components/          UI (marketplace, checkout, order tracking, vendor portal, admin)
public/sw.js             service worker
firestore.rules          deny all direct client access (server uses the Admin SDK)
storage.rules            per-user image uploads
```
