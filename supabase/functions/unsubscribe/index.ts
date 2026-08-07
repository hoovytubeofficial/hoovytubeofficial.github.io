// unsubscribe — token-verified one-click unsubscribe. Public (no JWT).
// GET /unsubscribe?email=<addr>&t=<token>   (also accepts POST for RFC 8058 one-click)
// Marks the contact unsubscribed in the Resend audience + newsletter_subscribers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" };

async function token(email: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 20);
}

const page = (msg: string, ok = true) =>
  new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HoovyTube</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#cbd4dd;color:#2b4056;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center">
<div style="background:#f7f3e6;border:1px solid #c3ccd6;border-radius:16px;padding:2.2rem 2.6rem;text-align:center;max-width:440px">
<div style="font-size:1.4rem;font-weight:800;margin-bottom:.6rem">Hoovy<span style="color:#3f6288">Tube</span></div>
<p style="font-size:1.05rem;line-height:1.6;color:${ok ? "#2b4056" : "#b0413f"}">${msg}</p>
<a href="https://hoovytube.com" style="color:#3f6288;text-decoration:none;font-weight:600">← back to hoovytube.com</a>
</div></body></html>`, { headers: { ...cors, "Content-Type": "text/html; charset=utf-8" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  const t = url.searchParams.get("t") || "";
  const secret = Deno.env.get("UNSUB_SECRET") || "hoovytube-unsub";

  if (!email) return page("This unsubscribe link is missing its address.", false);
  if (t !== await token(email, secret)) return page("This unsubscribe link is invalid or expired.", false);

  const RK = Deno.env.get("RESEND_API_KEY");
  const AUD = Deno.env.get("RESEND_AUDIENCE_ID");
  try {
    await fetch(`https://api.resend.com/audiences/${AUD}/contacts/${encodeURIComponent(email)}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${RK}`, "Content-Type": "application/json" },
      body: JSON.stringify({ unsubscribed: true }),
    });
  } catch (e) { console.error("Resend unsubscribe error:", (e as Error).message); }
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await sb.from("newsletter_subscribers").update({ status: "unsubscribed" }).eq("email", email);
  } catch (e) { console.error("DB unsubscribe error:", (e as Error).message); }

  return page("You've been unsubscribed. Sorry to see you go — you can resubscribe any time at hoovytube.com.");
});
