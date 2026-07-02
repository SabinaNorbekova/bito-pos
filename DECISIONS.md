## 1. Tenant + role flow: token → data layer
`POST /api/auth/login` looks up a user by (globally unique) email, checks the
password, and signs a JWT with exactly three claims: `userId`, `tenantId`,
`role`. From that point on, **no other request ever accepts a tenant id from
the client** - not in the URL, not in the body, not in a query param.
`requireAuth` middleware verifies the token, confirms the tenant still
exists, and attaches `req.auth = { userId, tenantId, role }`. Every
controller reads `req.auth.tenantId` and folds it into the Mongo filter as
the first, mandatory field (`{ tenantId, ...restOfFilter }`). Every
compound index also puts `tenantId` first, so tenant scoping and query
performance are the same design decision, not two. Role authorization is a
second, independent gate (`requireRole('admin')` on the report route);
tenant scoping and role checking are deliberately separate middlewares so
neither can be bypassed by getting the other one "close enough."

## 2. N+1 fix & indexes
The catalog list (`GET /api/products`) is a single `Product.find()` +
`countDocuments()` pair, run in parallel - there's no per-row lookup because
list-view fields (name, sku, price, stock, category) live on the product
document itself. Search uses a `^prefix` case-insensitive regex, backed by
a `{ tenantId: 1, name: 1 }` index with an `{ locale: 'en', strength: 2 }`
collation, so the case-insensitive prefix match can actually use the index
(a bare substring regex can't use any B-tree index; that's the tradeoff for
this task's scope - a real product would use Atlas Search or a text index
for substring search). `tenantId` leads every index because it's the one
filter present on every single query in this system.

## 3. Cart trust boundary
The client sends **only** `{ productId, qty }` pairs. Never a price, never
a stock claim. `order.service.placeOrder` re-reads `price`, `costPrice`,
and `stock` straight from the DB inside the transaction that creates the
order - the order's `priceAtSale` is whatever the DB says *at that instant*,
full stop. The only things trusted from the client are "which product" and
"how many."

## 4. No-oversell guarantee
Each cart line is applied as one atomic conditional update:
`findOneAndUpdate({ _id, tenantId, stock: { $gte: qty } }, { $inc: { stock: -qty } })`.
Two concurrent "last unit" requests race on that same `$gte` check - only
one can win. All line updates plus the order insert share one MongoDB
transaction, so a failure on item 2 of 3 rolls back item 1's decrement too
(the "reject the whole order, leave DB unchanged" requirement). **Where it
breaks:** transactions require a replica set (docker-compose provisions a
1-node `rs0` for this reason); under very high contention on one product,
competing transactions retry on `TransientTransactionError` (bounded to 3
retries here) rather than ever overselling - that's a latency cost, not a
correctness one.

## 5. Margin boundary at the data layer
`Product.costPrice` and `Order.items.costPriceAtSale` both carry
`select: false` on the Mongoose schema - they are never fetched unless a
query explicitly does `.select('+costPrice')`, which only `order.service.ts`
does, inside the transaction, never in a response path. Cashier-facing
routes additionally use an explicit field allowlist. This is enforced twice
on purpose: schema-level `select:false` as the floor, explicit projections
as the ceiling.

## 6. Webhook idempotency & ordering
The handler first tries to `insert` a `WebhookEvent` document keyed by the
provider's `eventId` (unique index) *inside* the same transaction as the
order update. A duplicate key means "already fully processed" → 200,
no-op. Defense in depth: the order update is additionally conditional on
`status: 'pending_payment'`, so even a *different* eventId for an
already-paid order is a safe no-op rather than double-counted revenue.

## 7. Missing/unknown tenant
Tenant only ever comes from the JWT, never a request. If the token has no
valid `tenantId`, or that tenant no longer exists, we fail **closed**: 401
or 403, never "no filter" (leak) or "default tenant" (misattribution).

## 8. What I cut, and pushback
Cut: refresh tokens, product images, multi-currency, Redis (an in-process
cache with an honest note about its limits under multiple replicas was the
right call for this scope, not a real Redis integration). **Pushback:** the
"cashier searches, admin queries margin" split invites a much simpler
model - one `products` read-model per role - but I'd push back on adding a
whole reporting DB/CQRS split for this task; the aggregation pipeline is
fast enough at this scale, and the projection-based boundary already gets
the security property without the operational cost.