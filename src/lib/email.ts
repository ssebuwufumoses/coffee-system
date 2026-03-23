/**
 * Email utility — uses nodemailer with SMTP.
 * Requires these env vars (add to .env):
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=your@email.com
 *   SMTP_PASS=your_app_password
 *   SMTP_FROM="Victory Coffee Factory <your@email.com>"
 *
 * If any env var is missing, email is silently skipped.
 */

interface DispatchEmailParams {
  to: string;
  buyerName: string;
  orderNumber: string;
  gatePassNumber: string;
  variety: string;
  dispatchedKg: number;
  dispatchDate: Date;
  truckRegistration?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
}

export async function sendDispatchEmail(params: DispatchEmailParams): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log("[email] SMTP not configured — skipping dispatch email to", params.to);
    return;
  }

  try {
    // Dynamic import so the app still works if nodemailer isn't installed
    const nodemailer = await import("nodemailer").catch(() => null);
    if (!nodemailer) {
      console.log("[email] nodemailer not installed — run: npm install nodemailer");
      return;
    }

    const transporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT ?? "587"),
      secure: SMTP_PORT === "465",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const fmtDate = (d: Date) =>
      d.toLocaleString("en-UG", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

    const fmtKg = (kg: number) =>
      kg >= 1000 ? `${(kg / 1000).toFixed(2)} tonnes` : `${kg.toLocaleString()} kg`;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #1D1D1D; background: #F6F6F6; margin:0; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; border:1px solid #E8E8E8; overflow:hidden;">
    <div style="background:#240C64; padding:24px 28px;">
      <p style="color:#fff; font-size:12px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; margin:0 0 4px;">Victory Coffee Factory</p>
      <h1 style="color:#fff; font-size:20px; font-weight:700; margin:0;">Dispatch Confirmation</h1>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 20px; color:#6B6B6B;">Dear <strong style="color:#1D1D1D;">${params.buyerName}</strong>,</p>
      <p style="margin:0 0 20px; color:#6B6B6B;">Your order has been dispatched. Here are the details:</p>

      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B; width:45%;">Order Number</td>
          <td style="padding:10px 0; font-weight:600;">${params.orderNumber}</td>
        </tr>
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B;">Gate Pass</td>
          <td style="padding:10px 0; font-weight:700; color:#240C64;">${params.gatePassNumber}</td>
        </tr>
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B;">Coffee Variety</td>
          <td style="padding:10px 0; font-weight:600;">${params.variety}</td>
        </tr>
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B;">Quantity Dispatched</td>
          <td style="padding:10px 0; font-weight:600;">${fmtKg(params.dispatchedKg)}</td>
        </tr>
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B;">Dispatch Date & Time</td>
          <td style="padding:10px 0; font-weight:600;">${fmtDate(params.dispatchDate)}</td>
        </tr>
        ${params.truckRegistration ? `
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B;">Truck Registration</td>
          <td style="padding:10px 0; font-weight:600;">${params.truckRegistration}</td>
        </tr>` : ""}
        ${params.driverName ? `
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B;">Driver</td>
          <td style="padding:10px 0; font-weight:600;">${params.driverName}${params.driverPhone ? ` · ${params.driverPhone}` : ""}</td>
        </tr>` : ""}
      </table>

      <p style="margin:24px 0 0; font-size:12px; color:#9B9B9B;">
        For any queries, please contact Victory Coffee Factory directly.<br>
        Please retain your gate pass number <strong>${params.gatePassNumber}</strong> for reference.
      </p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: SMTP_FROM ?? `Victory Coffee Factory <${SMTP_USER}>`,
      to: params.to,
      subject: `Dispatch Confirmation — ${params.gatePassNumber} | Order ${params.orderNumber}`,
      html,
    });

    console.log(`[email] Dispatch confirmation sent to ${params.to}`);
  } catch (err) {
    // Never crash the dispatch because email failed
    console.error("[email] Failed to send dispatch email:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice email — sent to buyer when invoice is generated
// ─────────────────────────────────────────────────────────────────────────────

interface InvoiceEmailParams {
  to: string;
  buyerName: string;
  invoiceNumber: string;
  orderNumber: string;
  variety: string;
  quantityKg: number;
  pricePerKgUgx: number;
  totalAmountUgx: number;
  dueDate: Date;
}

export async function sendInvoiceEmail(params: InvoiceEmailParams): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log("[email] SMTP not configured — skipping invoice email to", params.to);
    return;
  }

  try {
    const nodemailer = await import("nodemailer").catch(() => null);
    if (!nodemailer) {
      console.log("[email] nodemailer not installed — run: npm install nodemailer");
      return;
    }

    const transporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT ?? "587"),
      secure: SMTP_PORT === "465",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const fmtDate = (d: Date) =>
      d.toLocaleDateString("en-UG", { day: "2-digit", month: "long", year: "numeric" });

    const fmtUgx = (n: number) =>
      `UGX ${n.toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;

    const fmtKg = (kg: number) =>
      kg >= 1000 ? `${(kg / 1000).toFixed(2)} tonnes` : `${kg.toLocaleString()} kg`;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #1D1D1D; background: #F6F6F6; margin:0; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; border:1px solid #E8E8E8; overflow:hidden;">
    <div style="background:#240C64; padding:24px 28px;">
      <p style="color:#fff; font-size:12px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; margin:0 0 4px;">Victory Coffee Factory</p>
      <h1 style="color:#fff; font-size:20px; font-weight:700; margin:0;">Invoice — ${params.invoiceNumber}</h1>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 20px; color:#6B6B6B;">
        Dear <strong style="color:#1D1D1D;">${params.buyerName}</strong>,
      </p>
      <p style="margin:0 0 20px; color:#6B6B6B;">
        Please find below your invoice for Order <strong style="color:#1D1D1D;">${params.orderNumber}</strong>.
        Payment is due by <strong style="color:#1D1D1D;">${fmtDate(params.dueDate)}</strong>.
      </p>

      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B; width:45%;">Invoice Number</td>
          <td style="padding:10px 0; font-weight:700; color:#240C64;">${params.invoiceNumber}</td>
        </tr>
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B;">Order Number</td>
          <td style="padding:10px 0; font-weight:600;">${params.orderNumber}</td>
        </tr>
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B;">Coffee Variety</td>
          <td style="padding:10px 0; font-weight:600;">${params.variety}</td>
        </tr>
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B;">Quantity</td>
          <td style="padding:10px 0; font-weight:600;">${fmtKg(params.quantityKg)}</td>
        </tr>
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B;">Price per kg</td>
          <td style="padding:10px 0; font-weight:600;">${fmtUgx(params.pricePerKgUgx)}</td>
        </tr>
        <tr style="border-bottom:2px solid #240C64;">
          <td style="padding:12px 0; color:#1D1D1D; font-weight:700; font-size:15px;">Total Amount Due</td>
          <td style="padding:12px 0; font-weight:700; font-size:18px; color:#240C64;">${fmtUgx(params.totalAmountUgx)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0; color:#9B9B9B;">Payment Due Date</td>
          <td style="padding:10px 0; font-weight:700; color:#F35C2C;">${fmtDate(params.dueDate)}</td>
        </tr>
      </table>

      <div style="margin:24px 0; background:#FEF5F2; border:1px solid #EDEFF0; border-radius:8px; padding:16px;">
        <p style="margin:0; font-size:13px; color:#6B6B6B; line-height:1.6;">
          Please make payment by the due date and send proof of payment to
          <strong style="color:#1D1D1D;">${SMTP_USER}</strong>
          referencing invoice number <strong style="color:#240C64;">${params.invoiceNumber}</strong>.
        </p>
      </div>

      <p style="margin:0; font-size:12px; color:#9B9B9B;">
        This is an automated invoice from the Victory Coffee Factory Management System.<br>
        For queries, please contact Victory Coffee Factory directly.
      </p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: SMTP_FROM ?? `Victory Coffee Factory <${SMTP_USER}>`,
      to: params.to,
      subject: `Invoice ${params.invoiceNumber} — ${fmtUgx(params.totalAmountUgx)} due ${fmtDate(params.dueDate)}`,
    html,
    });

    console.log(`[email] Invoice ${params.invoiceNumber} sent to ${params.to}`);
  } catch (err) {
    console.error("[email] Failed to send invoice email:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hulling ratio alert — sent to manager when ratio drops below 45%
// Requires MANAGER_EMAIL env var in addition to SMTP_* vars
// ─────────────────────────────────────────────────────────────────────────────

interface HullingAlertParams {
  batchNumber: string;
  inputKg: number;
  outputBeansKg: number;
  hullRatioPct: number;
}

export async function sendHullingAlertEmail(params: HullingAlertParams): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, MANAGER_EMAIL } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MANAGER_EMAIL) {
    console.log(
      `[email] SMTP or MANAGER_EMAIL not configured — skipping hulling alert for batch ${params.batchNumber}`
    );
    return;
  }

  try {
    const nodemailer = await import("nodemailer").catch(() => null);
    if (!nodemailer) return;

    const transporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT ?? "587"),
      secure: SMTP_PORT === "465",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const fmtKg = (kg: number) =>
      kg >= 1000 ? `${(kg / 1000).toFixed(2)} tonnes` : `${kg.toLocaleString()} kg`;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #1D1D1D; background: #F6F6F6; margin:0; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; border:1px solid #E8E8E8; overflow:hidden;">
    <div style="background:#893014; padding:24px 28px;">
      <p style="color:#fff; font-size:12px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; margin:0 0 4px;">Victory Coffee Factory — ALERT</p>
      <h1 style="color:#fff; font-size:20px; font-weight:700; margin:0;">Low Hulling Ratio Detected</h1>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 16px; color:#893014; font-weight:700; font-size:16px;">
        ⚠ Batch ${params.batchNumber} has a hulling ratio of <strong>${params.hullRatioPct.toFixed(1)}%</strong> — below the 45% minimum.
      </p>
      <p style="margin:0 0 20px; color:#6B6B6B;">
        This may indicate coffee is being stolen or the milling machine is underperforming. Please investigate immediately.
      </p>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B; width:45%;">Batch Number</td>
          <td style="padding:10px 0; font-weight:700; color:#240C64;">${params.batchNumber}</td>
        </tr>
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B;">Kiboko Input</td>
          <td style="padding:10px 0; font-weight:600;">${fmtKg(params.inputKg)}</td>
        </tr>
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 0; color:#9B9B9B;">Clean Beans Output</td>
          <td style="padding:10px 0; font-weight:600;">${fmtKg(params.outputBeansKg)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0; color:#9B9B9B;">Hulling Ratio</td>
          <td style="padding:10px 0; font-weight:700; color:#893014;">${params.hullRatioPct.toFixed(1)}% (minimum: 45%)</td>
        </tr>
      </table>
      <p style="margin:24px 0 0; font-size:12px; color:#9B9B9B;">
        This is an automated alert from the Victory Coffee Factory Management System.
      </p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: SMTP_FROM ?? `Victory Coffee Factory <${SMTP_USER}>`,
      to: MANAGER_EMAIL,
      subject: `⚠ LOW HULLING RATIO — Batch ${params.batchNumber} at ${params.hullRatioPct.toFixed(1)}%`,
      html,
    });

    console.log(`[email] Hulling alert sent to manager for batch ${params.batchNumber}`);
  } catch (err) {
    console.error("[email] Failed to send hulling alert:", err);
  }
}
