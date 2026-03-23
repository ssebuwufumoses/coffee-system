/**
 * WhatsApp messaging helper.
 *
 * HOW IT WORKS (no API account needed):
 *   buildWhatsAppUrl(phone, message) returns a wa.me deep-link.
 *   Render this as a button in the UI — tapping it opens WhatsApp on the
 *   device with the message pre-filled. The operator taps Send once.
 *   Works with any WhatsApp or WhatsApp Business app. Zero setup, zero fees.
 *
 * OPTIONAL AUTOMATED MODE (Meta Cloud API):
 *   Set META_WHATSAPP_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID in .env to
 *   enable fully automated sending without any button tap.
 *   Get these from developers.facebook.com (requires Meta Business verification).
 *
 * Uganda phone normalisation: 0701234567 → +256701234567
 */

function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("256")) return digits;
  if (digits.startsWith("0"))   return `256${digits.slice(1)}`;
  return digits;
}

/**
 * Build a wa.me deep-link that opens WhatsApp with the message pre-filled.
 * Use this to render a "Send WhatsApp" button in the UI.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const number = normalisePhone(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * Attempt to send via Meta Cloud API if credentials are configured.
 * Falls back to logging the message (and returning the deep-link) if not.
 *
 * Returns the wa.me URL so the UI can always show a manual "Send" button
 * as a fallback, even when the API is configured.
 */
export async function sendWhatsApp(
  to: string,
  message: string
): Promise<{ sent: boolean; url: string }> {
  const url = buildWhatsAppUrl(to, message);
  const { META_WHATSAPP_TOKEN, META_WHATSAPP_PHONE_NUMBER_ID } = process.env;

  // ── Automated mode (Meta Cloud API) ─────────────────────────────────────────
  if (META_WHATSAPP_TOKEN && META_WHATSAPP_PHONE_NUMBER_ID) {
    try {
      const phone = `+${normalisePhone(to)}`;
      const apiUrl = `https://graph.facebook.com/v19.0/${META_WHATSAPP_PHONE_NUMBER_ID}/messages`;

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${META_WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: message },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        console.error(`[whatsapp] Meta API error to ${phone}:`, JSON.stringify(json));
        return { sent: false, url };
      }

      console.log(`[whatsapp] Auto-sent to ${phone}`);
      return { sent: true, url };
    } catch (err) {
      console.error("[whatsapp] Error:", err);
      return { sent: false, url };
    }
  }

  // ── Manual mode (deep-link fallback) ────────────────────────────────────────
  console.log(`[whatsapp] Manual mode — deep-link generated for ${to}`);
  return { sent: false, url };
}
