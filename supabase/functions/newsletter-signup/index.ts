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
  // Dark-hero design (cream + slate-blue), email-safe tables.
  const row = (emoji: string, text: string) =>
    `<tr><td style="padding:8px 0;font-size:15px;color:#2b4056;line-height:1.5"><span style="font-size:18px">${emoji}</span>&nbsp;&nbsp;${text}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background:#cbd4dd">
    <tr><td align="center" style="padding:28px 14px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;font-family:Arial,Helvetica,sans-serif">
        <tr><td align="center" style="padding:2px 0 14px">
          <span style="font-size:26px;font-weight:800;letter-spacing:-.5px;color:#2b4056">Hoovy<span style="color:#3f6288">Tube</span></span>
        </td></tr>
        <tr><td style="padding-bottom:14px">
          <img src="https://iglbfojatowaxbhjubvz.supabase.co/storage/v1/object/public/media/assets/giftest.gif" width="600" alt="HoovyTube" style="width:100%;max-width:600px;border-radius:16px;display:block;border:1px solid #c3ccd6">
        </td></tr>
        <tr><td style="background:#1b2937;border-radius:20px;padding:42px 34px;text-align:center">
          <div style="font-size:42px;line-height:1;margin-bottom:12px">👋</div>
          <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;color:#ffffff">Welcome to <span style="color:#ecdfb0">HoovyTube</span></h1>
          <p style="margin:0 auto 24px;max-width:430px;font-size:16px;line-height:1.6;color:#b9c6d3">${hi} you're on the list — thanks for subscribing. No spam, ever.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
            <td align="center" bgcolor="#ecdfb0" style="border-radius:999px">
              <a href="https://youtube.com/@HoovyTube" style="display:inline-block;padding:13px 30px;font-size:15px;font-weight:700;color:#22384c;text-decoration:none">▶ Watch on YouTube</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:26px 30px 4px">
          <h2 style="margin:0 0 10px;font-size:18px;color:#2b4056">What to expect</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row("🎬", "New videos as they drop")}
            ${row("🎞️", "SFM &amp; Blender animations")}
            ${row("💬", "Community updates &amp; more")}
          </table>
          <p style="font-size:15px;line-height:1.6;color:#2b4056;margin:16px 0 0">— The HoovyTube team</p>
        </td></tr>
        <tr><td align="center" style="padding:18px 16px 4px;font-size:12px;color:#5d7083">
          You're receiving this because you signed up at <a href="https://hoovytube.com" style="color:#3f6288;text-decoration:none">hoovytube.com</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>`;
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
  //    If WELCOME_TEMPLATE_ID is set (a PUBLISHED Resend editor template), use it;
  //    otherwise fall back to the built-in HTML below.
  const from = Deno.env.get("NEWSLETTER_FROM") || "HoovyTube <newsletter@hoovytube.com>";
  const subject = Deno.env.get("WELCOME_SUBJECT") || "Welcome to HoovyTube 👋";
  const templateId = Deno.env.get("WELCOME_TEMPLATE_ID");
  const send = (payload: Record<string, unknown>) =>
    fetch("https://api.resend.com/emails", { method: "POST", headers: authHeaders, body: JSON.stringify(payload) });

  let sent = false;
  if (templateId) {
    try {
      // Resend requires a subject even when sending a template.
      const r = await send({ from, to: [email], subject, template: { id: templateId, variables: { FIRST_NAME: first_name || "there" } } });
      sent = r.ok;
      if (!r.ok) console.error("Template welcome failed:", r.status, await r.text());
    } catch (e) { console.error("Template welcome error:", (e as Error).message); }
  }
  if (!sent) {
    try {
      const r = await send({ from, to: [email], subject, html: welcomeHtml(first_name) });
      if (!r.ok) console.error("Welcome email failed:", r.status, await r.text());
    } catch (e) { console.error("Welcome email error:", (e as Error).message); }
  }

  return json({ success: true });
});
