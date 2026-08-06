// newsletter-signup — adds a subscriber to a Resend Audience and mirrors them in
// the newsletter_subscribers table. Public function (no JWT).
// Requires secrets: RESEND_API_KEY, RESEND_AUDIENCE_ID.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function isEmail(s: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const email = (body.email || "").trim().toLowerCase();
  const source = (body.source || "website").trim();
  const first_name = (body.first_name || "").trim();
  const last_name = (body.last_name || "").trim();

  if (!email || !isEmail(email)) return json({ error: "Valid email required" }, 400);

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const audienceId = Deno.env.get("RESEND_AUDIENCE_ID");
  if (!resendKey || !audienceId) {
    console.error("Missing RESEND_API_KEY or RESEND_AUDIENCE_ID");
    return json({ error: "Newsletter not configured" }, 503);
  }

  // Add the contact to the Resend Audience (idempotent: 200/201 on create, 409 if it exists).
  let resendContactId: string | null = null;
  try {
    const r = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, first_name: first_name || undefined, last_name: last_name || undefined, unsubscribed: false }),
    });
    const payload = await r.json().catch(() => ({}));
    if (r.ok) {
      resendContactId = payload?.id ?? null;
    } else if (r.status !== 409) { // 409 = already a contact
      console.error("Resend audience add failed:", r.status, JSON.stringify(payload));
      return json({ error: "Failed to subscribe" }, 502);
    }
  } catch (e) {
    console.error("Resend audience error:", (e as Error).message);
    return json({ error: "Failed to subscribe" }, 502);
  }

  // Mirror in the DB (idempotent on email).
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await supabase
    .from("newsletter_subscribers")
    .upsert({ email, status: "subscribed", resend_contact_id: resendContactId, source }, { onConflict: "email" });
  if (error) console.error("DB upsert error (non-fatal):", error.message);

  return json({ success: true });
});
