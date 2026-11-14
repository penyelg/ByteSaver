import { admin, uuid } from "../_shared/reservations.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: cors });
const feeCents = Number(Deno.env.get("RESERVATION_FEE_CENTAVOS") ?? 10000);
const holdMinutes = Number(Deno.env.get("RESERVATION_HOLD_MINUTES") ?? 1440);
const fee = feeCents / 100;
const localReturnTargets = new Map([
  ["localhost", "http://localhost:5173/"],
  ["127.0.0.1", "http://127.0.0.1:5173/"],
]);
const paymentResultPath = "/reservations/payment";

Deno.serve(async (request) => {
  const requestUrl = new URL(request.url);
  if (request.method === "GET" && requestUrl.pathname.endsWith("/reservations/return")) {
    const destination = localReturnTargets.get(requestUrl.searchParams.get("host") ?? "");
    if (!destination) return json({ error: "Invalid checkout return address." }, 400);
    const reservationId = requestUrl.searchParams.get("reservation");
    if (reservationId !== null && !uuid.test(reservationId)) {
      return json({ error: "Invalid reservation." }, 400);
    }
    const redirect = new URL(reservationId ? paymentResultPath : "/", destination);
    if (reservationId) redirect.searchParams.set("reservation", reservationId);
    return new Response(null, {
      status: 303,
      headers: { Location: redirect.href, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  }
  if (request.method === "OPTIONS")
    return new Response(null, { headers: cors });
  if (request.method !== "POST")
    return json({ error: "Method not allowed." }, 405);
  const token = request.headers
    .get("Authorization")
    ?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return json({ error: "Sign in to continue." }, 401);
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);
  if (authError || !user) return json({ error: "Sign in to continue." }, 401);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object")
    return json({ error: "Invalid request." }, 400);

  try {
    const eligibility = await admin.rpc("reservation_user_eligible", {
      p_user: user.id,
    });
    if (eligibility.error) throw eligibility.error;
    if (!eligibility.data)
      return json({ error: "An active, approved account is required." }, 403);

    if (body.action === "list") {
      const result = await admin.rpc("list_my_listing_reservations", {
        p_user: user.id,
      });
      if (result.error) throw result.error;
      return json({ reservations: result.data });
    }
    if (!uuid.test(body.id ?? ""))
      return json({ error: "Invalid listing or reservation." }, 400);
    if (body.action === "payment-status") {
      const { data, error } = await admin.from("listing_reservations")
        .select("id, item_name, item_price, fee, status, expires_at, paid_at, xendit_payment_id")
        .eq("id", body.id)
        .eq("buyer_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data ? json({ reservation: data }) : json({ error: "Reservation not found." }, 404);
    }
    if (body.action === "sold") {
      const result = await admin.rpc("finish_listing_reservation", {
        p_id: body.id,
        p_seller: user.id,
      });
      if (result.error) throw result.error;
      return result.data
        ? json({ ok: true })
        : json({ error: "No active reservation to complete." }, 409);
    }
    if (body.action === "enable") {
      const result = await admin
        .from("listings")
        .update({ reservation_contact_allowed: true })
        .eq("id", body.id)
        .eq("seller_id", user.id)
        .select("id")
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data
        ? json({ ok: true })
        : json({ error: "Listing unavailable." }, 404);
    }
    if (body.action !== "quote" && body.action !== "checkout")
      return json({ error: "Unknown action." }, 400);
    if (
      !Number.isSafeInteger(feeCents) ||
      feeCents <= 0 ||
      feeCents > 100000000 ||
      !Number.isSafeInteger(holdMinutes) ||
      holdMinutes <= 0 ||
      holdMinutes > 10080
    ) {
      return json({ error: "Reservation settings are unavailable." }, 503);
    }
    if (body.action === "quote") {
      const listing = await admin
        .from("listings")
        .select("seller_id, price, reservation_contact_allowed")
        .eq("id", body.id)
        .eq("moderation_status", "approved")
        .maybeSingle();
      if (listing.error) throw listing.error;
      if (!listing.data) return json({ error: "Listing unavailable." }, 404);
      const [active, sellerEligibility, sellerContact] = await Promise.all([
        admin.from("listing_reservations")
          .select("status, expires_at, buyer_id, checkout_url")
          .eq("listing_id", body.id)
          .in("status", ["pending", "reserved", "sold"])
          .maybeSingle(),
        admin.rpc("reservation_user_eligible", { p_user: listing.data.seller_id }),
        admin.from("users").select("phone").eq("id", listing.data.seller_id).maybeSingle(),
      ]);
      if (active.error) throw active.error;
      if (sellerEligibility.error) throw sellerEligibility.error;
      if (sellerContact.error) throw sellerContact.error;
      const reservation = active.data;
      const held =
        reservation && Date.parse(reservation.expires_at) > Date.now();
      return json({
        fee,
        holdMinutes,
        price: listing.data.price,
        seller: listing.data.seller_id === user.id,
        enabled: listing.data.reservation_contact_allowed && sellerEligibility.data === true &&
          /^\+639[0-9]{9}$/.test(sellerContact.data?.phone ?? ""),
        status:
          reservation?.status === "sold"
            ? "sold"
            : held
              ? reservation.status
              : "available",
        checkoutUrl:
          held &&
          reservation.status === "pending" &&
          reservation.buyer_id === user.id
            ? reservation.checkout_url
            : null,
      });
    }

    const key = Deno.env.get("XENDIT_SECRET_KEY");
    const webhookToken = Deno.env.get("XENDIT_WEBHOOK_TOKEN");
    if (!key?.startsWith("xnd_development_") || !webhookToken) {
      return json({ error: "Test checkout setup is incomplete." }, 503);
    }

    const origin = request.headers.get("Origin");
    const localHost = [...localReturnTargets].find(([, destination]) =>
      origin === new URL(destination).origin
    )?.[0];
    const configuredReturn = Deno.env.get("RESERVATION_RETURN_URL")?.trim();
    let returnUrl = configuredReturn?.startsWith("https://") ? new URL(configuredReturn) : undefined;
    if (localHost) {
      const relay = new URL("/functions/v1/reservations/return", Deno.env.get("SUPABASE_URL"));
      relay.searchParams.set("host", localHost);
      returnUrl = relay;
    } else if (configuredReturn && !returnUrl) {
      return json({ error: "The checkout return address must use HTTPS." }, 503);
    }
    if (
      body.fee !== fee ||
      body.holdMinutes !== holdMinutes ||
      !Number.isFinite(body.price)
    ) {
      return json(
        {
          error: "Reservation terms changed. Reload the listing before paying.",
        },
        409,
      );
    }
    const attempt = crypto.randomUUID();
    const started = await admin.rpc("start_listing_reservation", {
      p_id: attempt,
      p_listing: body.id,
      p_buyer: user.id,
      p_price: body.price,
      p_fee: fee,
      p_hold_minutes: holdMinutes,
    });
    if (started.error?.code === "P0001")
      return json({ error: started.error.message }, 409);
    if (started.error) throw started.error;
    const reservation = started.data;
    if (reservation.id !== attempt) {
      return reservation.checkout_url
        ? json({ checkoutUrl: reservation.checkout_url })
        : json(
            {
              error: "Checkout is being prepared. Refresh before trying again.",
            },
            409,
          );
    }

    const successUrl = returnUrl && (localHost ? new URL(returnUrl) : new URL(paymentResultPath, returnUrl));
    successUrl?.searchParams.set("reservation", reservation.id);

    // The provider checkout ends before the database hold to give the webhook time to arrive.
    const response = await fetch("https://api.xendit.co/sessions", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(key + ":"),
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        reference_id: reservation.id,
        session_type: "PAY",
        mode: "PAYMENT_LINK",
        allow_save_payment_method: "DISABLED",
        capture_method: "AUTOMATIC",
        currency: "PHP",
        country: "PH",
        amount: fee,
        description: "ByteSaver test reservation fee",
        expires_at: new Date(
          Date.parse(reservation.expires_at) - 120000,
        ).toISOString(),
        ...(successUrl && returnUrl
          ? { success_return_url: successUrl.href, cancel_return_url: returnUrl.href }
          : {}),
      }),
    });
    if (!response.ok) {
      console.error("Xendit session request failed", response.status);
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 408
      ) {
        const failed = await admin
          .from("listing_reservations")
          .update({ status: "failed" })
          .eq("id", reservation.id);
        if (failed.error) throw failed.error;
      }
      return json({ error: "Xendit could not start test checkout." }, 502);
    }
    const session = await response.json();
    const checkoutUrl = new URL(session.payment_link_url);
    if (
      checkoutUrl.protocol !== "https:" ||
      !["checkout-staging.xendit.co", "dev.xen.to"].includes(
        checkoutUrl.hostname,
      ) ||
      session.reference_id !== reservation.id ||
      typeof session.payment_session_id !== "string"
    ) {
      throw new Error("Unexpected Xendit test session response.");
    }
    const saved = await admin
      .from("listing_reservations")
      .update({
        xendit_session_id: session.payment_session_id,
        checkout_url: checkoutUrl.href,
      })
      .eq("id", reservation.id)
      .eq("status", "pending")
      .select("id")
      .single();
    if (saved.error) throw saved.error;
    return json({ checkoutUrl: checkoutUrl.href });
  } catch (error) {
    console.error(
      "Reservation request failed",
      error instanceof Error ? error.message : "database request failed",
    );
    return json({ error: "Unable to complete the reservation request." }, 500);
  }
});
