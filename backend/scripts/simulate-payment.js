const crypto = require("crypto");

const [orderId, tenantId, eventIdArg] = process.argv.slice(2);
const apiUrl =
  process.env.API_URL || "http://localhost:4000/api/webhooks/payment";
const secret = process.env.PAYMENT_WEBHOOK_SECRET || "change-me-webhook-secret";

if (!orderId || !tenantId) {
  console.error(
    "Usage: node scripts/simulate-payment.js <orderId> <tenantId> [eventId]"
  );
  process.exit(1);
}

const eventId = eventIdArg || `evt_${Date.now()}`;
const body = JSON.stringify({ eventId, orderId, tenantId, status: "paid" });
const signature = crypto
  .createHmac("sha256", secret)
  .update(Buffer.from(body))
  .digest("hex");

fetch(apiUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Signature": signature },
  body,
})
  .then(async (res) => {
    console.log("status:", res.status);
    console.log(await res.text());
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
