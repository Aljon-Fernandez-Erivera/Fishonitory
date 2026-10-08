// Owner notification emails: registration received, approved, rejected.q
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

const clientUrl = () =>
  (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");

const loginUrl = () => `${clientUrl()}/login`;
const termsUrl = () => process.env.TERMS_URL || `${clientUrl()}/about`;
const privacyUrl = () => process.env.PRIVACY_URL || `${clientUrl()}/about`;
const supportEmail = () =>
  process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || "";

async function sendEmail({ to, subject, html, text }) {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: process.env.EMAIL_FROM_NAME || "Fishonitory",
          email: process.env.EMAIL_FROM,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    if (!response.ok) {
      let details;
      try {
        details = await response.json();
      } catch {
        details = await response.text();
      }
      return { error: { status: response.status, details } };
    }
    return { error: null };
  } catch (error) {
    return { error: { status: 0, details: error.message } };
  }
}

// All inputs are plain text. Everything is escaped here, so business names
// and rejection reasons typed by users/admins cannot inject HTML.
function buildNotice({
  title,
  paragraphs = [],
  reason,
  bulletsTitle,
  bullets = [],
  links = [],
  button,
  footer,
}) {
  const p = (value) =>
    `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3d5d6b;">${escapeHtml(value)}</p>`;

  const reasonHtml = reason
    ? `<div style="margin:6px 0 18px;padding:14px 16px;border-radius:12px;background:#fdf3f3;border:1px solid #f0d4d4;">
         <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a45a5a;font-weight:700;margin-bottom:6px;">Reason</div>
         <div style="font-size:15px;line-height:1.6;color:#5a2d2d;white-space:pre-wrap;">${escapeHtml(reason)}</div>
       </div>`
    : "";

  const bulletsHtml = bullets.length
    ? `${bulletsTitle ? `<p style="margin:6px 0 8px;font-size:14px;font-weight:700;color:#12314a;">${escapeHtml(bulletsTitle)}</p>` : ""}
       <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.7;color:#496a76;">
         ${bullets.map((item) => `<li style="margin-bottom:6px;">${escapeHtml(item)}</li>`).join("")}
       </ul>`
    : "";

  const linksHtml = links.length
    ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#496a76;">
         ${links
           .map(
             (link) =>
               `<a href="${escapeHtml(link.url)}" style="color:#0a6c7d;">${escapeHtml(link.label)}</a>`,
           )
           .join(" &nbsp;·&nbsp; ")}
       </p>`
    : "";

  const buttonHtml = button
    ? `<p style="margin:8px 0 6px;text-align:center;">
         <a href="${escapeHtml(button.url)}" style="display:inline-block;padding:12px 28px;border-radius:999px;background:#0a6c7d;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">${escapeHtml(button.label)}</a>
       </p>`
    : "";

  const html = `
  <div style="margin:0;padding:32px 16px;background:#edf7fb;font-family:Arial,Helvetica,sans-serif;color:#12314a;">
    <div style="max-width:560px;margin:0 auto;border:1px solid #d8ebf3;border-radius:18px;overflow:hidden;background:#ffffff;box-shadow:0 10px 30px rgba(16,76,98,0.08);">
      <div style="background:linear-gradient(135deg,#0d4a5f,#0a6c7d);padding:22px 28px;color:#ffffff;">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:0.9;">Fishonitory</div>
        <div style="margin-top:8px;font-size:26px;font-weight:700;line-height:1.25;">${escapeHtml(title)}</div>
      </div>
      <div style="padding:26px 24px 18px;">
        ${paragraphs.map(p).join("")}
        ${reasonHtml}
        ${bulletsHtml}
        ${linksHtml}
        ${buttonHtml}
      </div>
      <div style="padding:0 24px 24px;font-size:12px;color:#6b8591;">
        <div style="border-top:1px solid #e5edf1;padding-top:14px;">${escapeHtml(footer || "Fishonitory")}</div>
      </div>
    </div>
  </div>`;

  const text = [
    title,
    "",
    ...paragraphs,
    ...(reason ? ["", `Reason: ${reason}`] : []),
    ...(bullets.length
      ? ["", ...(bulletsTitle ? [bulletsTitle] : []), ...bullets.map((b) => `- ${b}`)]
      : []),
    ...(links.length ? ["", ...links.map((l) => `${l.label}: ${l.url}`)] : []),
    ...(button ? ["", `${button.label}: ${button.url}`] : []),
    "",
    footer || "Fishonitory",
  ].join("\n");

  return { html, text };
}

const supportLine = () =>
  supportEmail()
    ? `Questions? Contact us at ${supportEmail()}.`
    : "Questions? Please contact the Fishonitory team.";

// 1) Sent right after the owner finishes registering (permit uploaded).
exports.sendRegistrationReceivedEmail = async (owner) => {
  const { html, text } = buildNotice({
    title: "We received your registration",
    paragraphs: [
      `Hi ${owner.ownerName},`,
      `Thank you for registering ${owner.businessName} on Fishonitory. We received your details and your business permit.`,
      "Our team will review your permit. You will not be able to sign in until the review is finished, and you don't need to do anything else right now.",
      "We will email you at this address as soon as a decision is made, whether approved or not. If you don't see our email, please check your spam folder.",
      supportLine(),
    ],
    footer: "Fishonitory · Registration received",
  });

  return sendEmail({
    to: owner.email,
    subject: "Fishonitory - We received your registration",
    html,
    text,
  });
};

// 2) Sent when the Super Admin approves the account.
exports.sendApprovalEmail = async (owner) => {
  const { html, text } = buildNotice({
    title: "Your business is approved",
    paragraphs: [
      `Hi ${owner.ownerName},`,
      `Good news: ${owner.businessName} has been approved on Fishonitory. Your account is now active and you can sign in.`,
    ],
    bulletsTitle: "Before you start",
    bullets: [
      "Sign in with the email and password you registered with.",
      "On your first sign-in you will be asked to connect an authenticator app (such as Google Authenticator or Authy). This extra step is required for every account.",
      "If you ever lose access to your authenticator app, choose \"Reset authenticator\" on the sign-in screen. A reset code will be sent to this email address.",
      "Never share your password or your authenticator codes with anyone, including Fishonitory staff.",
      "You are responsible for the accuracy of the records in your workspace and for the staff accounts you create.",
    ],
    links: [
      { label: "Terms of Service", url: termsUrl() },
      { label: "Privacy Policy", url: privacyUrl() },
    ],
    button: { label: "Sign in to Fishonitory", url: loginUrl() },
    footer: `By using Fishonitory you agree to the Terms of Service and Privacy Policy. ${supportLine()}`,
  });

  return sendEmail({
    to: owner.email,
    subject: "Fishonitory - Your business registration is approved",
    html,
    text,
  });
};

// 3) Sent when the Super Admin rejects the registration, with the reason.
exports.sendRejectionEmail = async (owner, reason) => {
  const { html, text } = buildNotice({
    title: "Registration not approved",
    paragraphs: [
      `Hi ${owner.ownerName},`,
      `Thank you for your interest in Fishonitory. After reviewing the registration for ${owner.businessName}, we were not able to approve it.`,
    ],
    reason,
    bulletsTitle: "What you can do",
    bullets: [
      "Read the reason above carefully.",
      "If you believe this was a mistake, or you have a corrected document to send, contact us and mention your registered email address.",
    ],
    links: [
      { label: "Terms of Service", url: termsUrl() },
      { label: "Privacy Policy", url: privacyUrl() },
    ],
    footer: supportLine(),
  });

  return sendEmail({
    to: owner.email,
    subject: "Fishonitory - Update on your business registration",
    html,
    text,
  });
};

exports._escapeHtml = escapeHtml;