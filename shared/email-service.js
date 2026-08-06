/**
 * email-service.js — minimal shim.
 *
 * HoovyTube's email setup (Resend) powers the public contact form and newsletter
 * signup via dedicated edge functions (`contact-form`, `newsletter-signup`).
 *
 * The template's admin "invite user" emails are NOT wired up: sending to arbitrary
 * addresses requires a verified sending domain in Resend, which isn't configured
 * (no custom domain yet). Admin invitations are still recorded in the
 * `user_invitations` table, so an invited email becomes the intended role on first
 * sign-in — the notification email is simply skipped for now.
 *
 * When a domain is verified in Resend, replace these no-ops with real sends.
 */

function skipped(reason) {
  console.warn(`[email-service] ${reason} — invitation email skipped (no verified sending domain).`);
  return { success: true, skipped: true, reason };
}

export const emailService = {
  async sendStaffInvitation(email /*, role, loginUrl, name */) {
    return skipped(`staff invitation for ${email}`);
  },
  async sendProspectInvitation(email /*, name, accessUrl */) {
    return skipped(`prospect invitation for ${email}`);
  },
};

export default emailService;
