# BITO POS — Multi-tenant checkout (test task)

Full end-to-end flow: login → search catalog → cart → place order →
webhook payment confirmation → receipt → admin sales report (margin).

Stack: Node.js + Express + TypeScript, MongoDB (1-node replica set, for
transactions), React + TypeScript (Vite), Docker Compose.

## Run everything

```bash
docker compose up --build -d
```

This will:
1. Start MongoDB with a single-node replica set (`rs0` — required for
   the multi-document transactions used in order placement and webhook
   processing).
2. Run a one-shot `mongo-init` container that initializes the replica set.
3. Build and start the backend on `http://localhost:4000`.
4. Build and start the frontend on `http://localhost:5173`.

Swagger/OpenAPI docs: `http://localhost:4000/api-docs`

## Seed demo data

```bash
docker compose exec backend node dist/seed/seed.js
```

Creates two tenants (to demonstrate isolation) with an admin + cashier
each, all with password `password123`:

- `cashier@coffeecorner.test` / `admin@coffeecorner.test` (tenant: Coffee Corner)
- `cashier@booknook.test` / `admin@booknook.test` (tenant: Book Nook)

Coffee Corner's **Croissant** is seeded with `stock: 1` — good for
demonstrating the no-oversell guarantee (open two tabs, add it to both
carts, checkout both at once).

## Confirming a payment (simulating the provider webhook)

Placing an order leaves it `pending_payment`. To move it to `paid`, sign
and send a webhook exactly like a real payment provider would:

```bash
docker compose exec backend node scripts/simulate-payment.js <orderId> <tenantId>
```

`orderId` is shown on the receipt screen after checkout; `tenantId` is
returned in the login response. The POS receipt page polls every 2s while
`pending_payment`, so it will flip to "Paid" live.

## Local dev (without Docker)

```bash
# backend
cd backend && cp .env.example .env
# point MONGO_URI at a replica-set-enabled mongod, e.g. a local one started with:
#   mongod --replSet rs0 --dbpath ./data && mongosh --eval "rs.initiate()"
npm install && npm run dev

# frontend
cd frontend && npm install && npm run dev -- --port 5174
```

## Proving the margin boundary directly (as required by the live review)

```bash
TOKEN=$(curl -s localhost:4000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"cashier@coffeecorner.test","password":"password123"}' | jq -r .token)

curl -s localhost:4000/api/products -H "Authorization: Bearer $TOKEN" | jq
# -> costPrice is absent from every product, by construction (schema-level
#    select:false + explicit field allowlist), not by client-side hiding.

curl -s "localhost:4000/api/reports/sales?from=2020-01-01&to=2030-01-01" \
  -H "Authorization: Bearer $TOKEN"
# -> 403, cashier token, admin-only route
```

See `DECISIONS.md` for the design rationale behind every stage.