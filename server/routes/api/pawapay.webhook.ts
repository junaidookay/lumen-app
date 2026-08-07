/**
 * PawaPay webhook endpoint.
 * POST /api/pawapay/webhook
 * Receives payment status callbacks from PawaPay.
 */
import { defineEventHandler, readBody } from "h3";
import { handlePawaPayWebhook } from "@/lib/billing/pawapay.functions";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    if (!body || !body.paymentId) {
      console.warn("[pawapay:webhook] Missing paymentId in body");
      return { ok: false, error: "Missing paymentId" };
    }

    await handlePawaPayWebhook({
      paymentId: body.paymentId,
      status: body.status ?? "INITIATED",
      amount: body.amount ?? 0,
      currency: body.currency ?? "",
      country: body.country ?? "",
      payer: body.payer ?? { type: "MSISDN", value: "" },
      paymentReference: body.paymentReference ?? "",
      transactionId: body.transactionId,
    });

    return { ok: true };
  } catch (err) {
    console.error("[pawapay:webhook] Error processing webhook:", err);
    return { ok: false, error: "Internal error" };
  }
});
