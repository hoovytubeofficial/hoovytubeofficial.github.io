// newsletter-signup — adds a subscriber to a Resend Audience, mirrors them in the
// newsletter_subscribers table, and sends a welcome email. Public function (no JWT).
// Secrets: RESEND_API_KEY, RESEND_AUDIENCE_ID. Optional: NEWSLETTER_FROM.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function isEmail(s: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
function esc(s: string) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function welcomeHtml(firstName: string) {
  const hi = firstName ? `Hi ${esc(firstName)},` : "Hey there,";
  // Cream + slate-blue palette to match the site.
  return `<div style="margin:0;padding:0;background:#cbd4dd">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;color:#2b4056">
      <div style="background:#f7f3e6;border:1px solid #c3ccd6;border-radius:16px;padding:28px 26px">
        <h1 style="margin:0 0 6px;font-size:26px;color:#2b4056">Welcome to <span style="color:#3f6288">HoovyTube</span> 👋</h1>
        <p style="font-size:16px;line-height:1.6;margin:14px 0">${hi}</p>
        <p style="font-size:16px;line-height:1.6;margin:14px 0">Thanks for subscribing — you're on the list! You'll get the occasional email with new videos, community stuff, and whatever's coming next. No spam, ever.</p>
        <p style="margin:22px 0">
          <a href="https://youtube.com/@HoovyTube" style="display:inline-block;background:#3f6288;color:#f4ebd1;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;font-size:15px">▶ Watch on YouTube</a>
        </p>
        <p style="font-size:16px;line-height:1.6;margin:14px 0 0">— The HoovyTube team</p>
      </div>
      <p style="font-size:12px;color:#5d7083;text-align:center;margin:16px 0 0">
        You're receiving this because you signed up at <a href="https://hoovytube.com" style="color:#3f6288">hoovytube.com</a>.
      </p>
    </div>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  // Honeypot: real people leave "company" empty; bots fill it. Silently accept & drop.
  if ((body.company || "").trim()) return json({ success: true });

  const email = (body.email || "").trim().toLowerCase();
  const source = (body.source || "website").trim();
  const first_name = (body.first_name || (body.name ? body.name.split(" ")[0] : "")).trim();
  const last_name = (body.last_name || (body.name ? body.name.split(" ").slice(1).join(" ") : "")).trim();

  if (!email || !isEmail(email)) return json({ error: "Valid email required" }, 400);

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const audienceId = Deno.env.get("RESEND_AUDIENCE_ID");
  if (!resendKey || !audienceId) {
    console.error("Missing RESEND_API_KEY or RESEND_AUDIENCE_ID");
    return json({ error: "Newsletter not configured" }, 503);
  }
  const authHeaders = { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" };

  // 1) Add to the Resend Audience (idempotent: 409 if already a contact).
  let resendContactId: string | null = null;
  try {
    const r = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: "POST", headers: authHeaders,
      body: JSON.stringify({ email, first_name: first_name || undefined, last_name: last_name || undefined, unsubscribed: false }),
    });
    const payload = await r.json().catch(() => ({}));
    if (r.ok) resendContactId = payload?.id ?? null;
    else if (r.status !== 409) {
      console.error("Resend audience add failed:", r.status, JSON.stringify(payload));
      return json({ error: "Failed to subscribe" }, 502);
    }
  } catch (e) {
    console.error("Resend audience error:", (e as Error).message);
    return json({ error: "Failed to subscribe" }, 502);
  }

  // 2) Mirror in the DB (idempotent on email).
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error: dbErr } = await supabase
    .from("newsletter_subscribers")
    .upsert({ email, status: "subscribed", resend_contact_id: resendContactId, source }, { onConflict: "email" });
  if (dbErr) console.error("DB upsert error (non-fatal):", dbErr.message);

  // 3) Send the welcome email (best-effort — signup still succeeds if this fails,
  //    e.g. before the sending domain is verified in Resend).
  const from = Deno.env.get("NEWSLETTER_FROM") || "HoovyTube <newsletter@hoovytube.com>";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: authHeaders,
      body: JSON.stringify({ from, to: [email], subject: "Welcome to HoovyTube 👋", html: welcomeHtml(first_name) }),
    });
    if (!r.ok) console.error("Welcome email failed:", r.status, await r.text());
  } catch (e) { console.error("Welcome email error:", (e as Error).message); }

  return json({ success: true });
});
