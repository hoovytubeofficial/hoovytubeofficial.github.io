// contact-form — stores a contact submission and emails a notification to the owner.
// Public function (no JWT). Requires secret: RESEND_API_KEY.
// Optional secrets: CONTACT_NOTIFY_TO (default hoovytube@gmail.com),
//                   RESEND_FROM (default "HoovyTube <onboarding@resend.dev>").
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const subject = (body.subject || "").trim();
  const message = (body.message || "").trim();

  if (!name || !email || !message) return json({ error: "Missing required fields" }, 400);
  if (!isEmail(email)) return json({ error: "Invalid email" }, 400);
  if (message.length > 5000) return json({ error: "Message too long" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase
    .from("contact_messages")
    .insert({ name, email, subject: subject || null, message })
    .select("id")
    .single();

  if (error) {
    console.error("DB insert error:", error.message);
    return json({ error: "Failed to save message" }, 500);
  }

  // Notify the owner (best-effort — don't fail the submission if email fails).
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    const to = Deno.env.get("CONTACT_NOTIFY_TO") || "hoovytube@gmail.com";
    const from = Deno.env.get("RESEND_FROM") || "HoovyTube <onboarding@resend.dev>";
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: email,
          subject: `New contact form message${subject ? `: ${subject}` : ""}`,
          html: `<h2>New contact message</h2>
            <p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p>
            ${subject ? `<p><strong>Subject:</strong> ${esc(subject)}</p>` : ""}
            <p><strong>Message:</strong></p>
            <p style="white-space:pre-wrap">${esc(message)}</p>`,
        }),
      });
      if (!r.ok) console.error("Resend notify failed:", r.status, await r.text());
    } catch (e) { console.error("Resend notify error:", (e as Error).message); }
  } else {
    console.warn("RESEND_API_KEY not set — notification email skipped.");
  }

  return json({ success: true, id: data.id });
});
