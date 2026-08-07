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
// Must match the unsubscribe function's token (HMAC-SHA256(email, secret), first 20 hex).
async function unsubToken(email: string) {
  const secret = Deno.env.get("UNSUB_SECRET") || "hoovytube-unsub";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 20);
}

function welcomeHtml(firstName: string) {
  const name = firstName ? `, ${esc(firstName)}` : "";
  const A = "https://iglbfojatowaxbhjubvz.supabase.co/storage/v1/object/public/media/assets";
  // Gemini-style: light canvas, dark rounded hero, feature rows with thumbnails.
  const feature = (img: string, title: string, body: string, link: string, href: string) =>
    `<tr><td style="padding:24px 2px 0">
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
         <td valign="middle" style="padding-right:18px">
           <div style="font-size:18px;font-weight:700;color:#1f2d3d;margin:0 0 6px">${title}</div>
           <div style="font-size:14px;line-height:1.55;color:#5d7083;margin:0 0 8px">${body}</div>
           <a href="${href}" style="font-size:14px;font-weight:700;color:#3f6288;text-decoration:none">${link} &rsaquo;</a>
         </td>
         <td width="190" style="width:190px"><a href="${href}"><img src="${img}" width="190" alt="" style="width:190px;max-width:190px;border-radius:12px;display:block;border:1px solid #dfe4ea"></a></td>
       </tr></table>
     </td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background:#eef1f5">
    <tr><td align="center" style="padding:26px 14px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;font-family:Arial,Helvetica,sans-serif">
        <tr><td align="right" style="padding:0 4px 14px;font-size:12px;color:#6b7a8d">
          Follow us&nbsp;&nbsp;<a href="https://youtube.com/@HoovyTube" style="color:#3f6288;text-decoration:none;font-weight:700">YouTube</a> &middot; <a href="https://www.patreon.com/c/hoovytube308/membership" style="color:#3f6288;text-decoration:none;font-weight:700">Patreon</a>
        </td></tr>
        <tr><td style="background:#0c1622;border-radius:24px;padding:44px 34px;text-align:center">
          <img src="${A}/giftest.gif" width="72" alt="HoovyTube" style="width:72px;height:72px;border-radius:16px;display:inline-block;margin-bottom:16px">
          <div style="font-size:30px;line-height:1.12;font-weight:800;color:#ffffff">Welcome to HoovyTube</div>
          <div style="font-size:30px;line-height:1.12;font-weight:800;color:#6ea8e6;margin:2px 0 16px">glad you're here${name}</div>
          <div style="font-size:15px;line-height:1.6;color:#9fb2c6;max-width:410px;margin:0 auto 24px">New videos, SFM &amp; Blender animations, asset drops and HoovyTools updates — straight to your inbox. No spam, ever.</div>
          <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
            <td align="center" bgcolor="#3f6288" style="border-radius:999px">
              <a href="https://youtube.com/@HoovyTube" style="display:inline-block;padding:13px 30px;font-size:15px;font-weight:700;color:#f4ebd1;text-decoration:none">&#9654;&nbsp; Watch on YouTube</a>
            </td>
          </tr></table>
        </td></tr>
        ${feature(`${A}/product-particles.png`, "600+ SFM particles", "Explosions, magic, weather, impacts — drop them straight into your scenes.", "Browse the packs", "https://hoovytube.com/products/")}
        ${feature(`${A}/hoovytools-logo.jpg`, "HoovyTools add-on", "Import SFM sessions into Blender — models, animation &amp; audio, auto-timed.", "See HoovyTools", "https://hoovytube.com/hoovytools/")}
        <tr><td align="center" style="padding:28px 16px 4px;font-size:12px;line-height:1.6;color:#8494a5">
          &mdash; The HoovyTube team<br>
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

  // Per-recipient unsubscribe URL + Gmail one-click header (RFC 8058).
  const unsubUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/unsubscribe?email=${encodeURIComponent(email)}&t=${await unsubToken(email)}`;
  const listHeaders = { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };

  let sent = false;
  if (templateId) {
    try {
      // Fetch the template's HTML (works even for drafts) and send it as the body,
      // so we don't depend on the template being published in Resend's UI.
      const tr = await fetch(`https://api.resend.com/templates/${templateId}`, { headers: authHeaders });
      if (tr.ok) {
        const tj = await tr.json();
        const thtml = String(tj.html || "")
          .split("{{{FIRST_NAME}}}").join(first_name || "there")
          .split("%%UNSUB%%").join(unsubUrl)
          .split("{{{RESEND_UNSUBSCRIBE_URL}}}").join(unsubUrl);
        if (thtml) {
          const r = await send({ from, to: [email], subject, html: thtml, headers: listHeaders });
          sent = r.ok;
          if (!r.ok) console.error("Template html send failed:", r.status, await r.text());
        }
      } else {
        console.error("Template fetch failed:", tr.status);
      }
    } catch (e) { console.error("Template welcome error:", (e as Error).message); }
  }
  if (!sent) {
    try {
      const html = welcomeHtml(first_name) +
        `<div style="text-align:center;font-size:11px;color:#8494a5;padding:8px 0 20px;font-family:Arial,sans-serif"><a href="${unsubUrl}" style="color:#8494a5">Unsubscribe</a></div>`;
      const r = await send({ from, to: [email], subject, html, headers: listHeaders });
      if (!r.ok) console.error("Welcome email failed:", r.status, await r.text());
    } catch (e) { console.error("Welcome email error:", (e as Error).message); }
  }

  return json({ success: true });
});
