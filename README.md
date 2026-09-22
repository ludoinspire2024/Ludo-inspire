# Ludo Inspire Commercial API v3

Commercial, non-cash Ludo backend starter.

## Included
- JWT registration/login
- Virtual coins with no cash value
- Rooms and turn/dice APIs
- Leaderboard and game history
- Non-cash tournament creation/listing
- Admin statistics and user management
- Subscription/ads configuration hooks
- Feature flags for the mobile/web client

## Not included
No betting, wagering, deposits, cash prizes, withdrawals, cash-out, or real-money wallet.

## Run
Node.js 18+
```bash
npm install
cp .env.example .env
npm start
```
API: http://localhost:3000

## Commercialization
Connect your own app-store-compliant subscription provider or ad SDK on the client. The API exposes configuration hooks but deliberately does not process gambling or cash transactions.
