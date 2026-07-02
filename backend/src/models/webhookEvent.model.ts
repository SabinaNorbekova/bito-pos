import { Schema, model } from "mongoose";

export interface IWebhookEvent {
  eventId: string;
  orderId: string;
  tenantId: string;
  processedAt: Date;
}

const webhookEventSchema = new Schema<IWebhookEvent>({
  eventId: { type: String, required: true },
  orderId: { type: String, required: true },
  tenantId: { type: String, required: true },
  processedAt: { type: Date, default: Date.now },
});

webhookEventSchema.index({ eventId: 1 }, { unique: true });

export const WebhookEvent = model<IWebhookEvent>(
  "WebhookEvent",
  webhookEventSchema
);
