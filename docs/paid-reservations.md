# Paid reservations

Reservations are enabled for every listing. Buyers can reserve available listings from approved, active sellers with a valid contact number. The buyer sees the fee, hold duration, and item price before selecting **Reserve Item**. ByteSaver holds one listing for up to 20 minutes during checkout. Xendit confirms the fee through a webhook, which starts the paid hold. Under **My Reservations**, the buyer can call or text the seller. The seller receives the item price directly and selects **Mark Sold** after handover. An expired hold makes the listing available for another reservation.

The capstone defaults are a ₱100 test fee and a 24-hour paid hold. The fee is separate from the item price. The integration accepts Xendit development keys and uses virtual funds. Confirm the production fee, hold duration, and cancellation and refund rules before accepting real money. A late payment that cannot activate its hold is recorded for review.

## Set up Xendit Test Mode

1. Apply the paid-reservations migration and deploy the `reservations` and `xendit-webhook` Supabase Edge Functions. The first function verifies the signed-in user and the second verifies the Xendit callback token.
2. In Supabase **Edge Functions → Secrets**, set `XENDIT_SECRET_KEY` to the Xendit Test Mode secret with **Money-in → Write**. Set `XENDIT_WEBHOOK_TOKEN` to the verification token in Xendit’s Test Mode webhook settings.
3. In Xendit Test Mode **Settings → Webhooks**, set **Payment Session – Completed** to `https://<project-ref>.supabase.co/functions/v1/xendit-webhook` and select **Test & Save**.
4. Use separate approved buyer and seller accounts. Publish a listing, open it as the buyer, and complete a Xendit test payment. Return to ByteSaver and open **My Reservations** to verify the hold and contact buttons. As the seller, verify **Mark Sold** closes the listing to new reservations.

Optional Edge Function settings are `RESERVATION_FEE_CENTAVOS`, `RESERVATION_HOLD_MINUTES`, and `RESERVATION_RETURN_URL`. Set the return URL to your hosted app’s HTTPS address. Successful checkouts open the payment confirmation screen on that origin. For local tests opened from `http://localhost:5173` or `http://127.0.0.1:5173`, checkout returns through the hosted Supabase function. Start a new checkout to pick up the payment confirmation address.

The database regression script uses synthetic records and rolls back its fixtures. [Reservation tests](../supabase/tests/paid_reservations.sql)
