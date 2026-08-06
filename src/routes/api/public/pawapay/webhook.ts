/**
 * PawaPay webhook — receives deposit status updates from PawaPay.
 * No signature verification in sandbox; implement HMAC in production
 * when PawaPay provides a shared secret.
 */
import { createFileRoute } from "@tanstack/react-router";
import { handlePawaPayWebhook } from "@/lib/billing/pawapay.functions";

export const Route = createFileRoute("/api/public/pawapay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-pawapay-signature");

        console.log(`[pawapay:webhook] Received webhook (sig: ${signature ? "present" : "none"})`);

        let payload: any;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          console.error("[pawapay:webhook] Invalid JSON body");
          return new Response("Invalid JSON", { status: 400 });
        }

        try {
          await handlePawaPayWebhook(payload);
        } catch (err: any) {
          console.error("[pawapay:webhook] Handler error:", err);
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
