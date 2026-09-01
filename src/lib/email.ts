import "server-only";

export type PasswordResetEmail = {
  to: string;
  token: string;
  expiresInMinutes: number;
};

export type PasswordResetMailer = (
  message: PasswordResetEmail,
) => Promise<{ delivered: boolean }>;

function applicationBaseUrl() {
  const configured = process.env.APP_BASE_URL?.trim();
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  const value = configured || (vercelHost ? `https://${vercelHost}` : "");
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function resetUrl(token: string) {
  const baseUrl = applicationBaseUrl();
  if (!baseUrl) return null;
  const url = new URL("/reset-password", baseUrl);
  url.hash = `token=${encodeURIComponent(token)}`;
  return url.toString();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const sendPasswordResetEmail: PasswordResetMailer = async ({
  to,
  token,
  expiresInMinutes,
}) => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const url = resetUrl(token);
  if (!apiKey || !from || !url) return { delivered: false };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your restaurant account password",
      text: `Use this link to reset your password. It expires in ${expiresInMinutes} minutes:\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>Use the link below to reset your password. It expires in ${expiresInMinutes} minutes.</p><p><a href="${escapeHtml(url)}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    }),
    cache: "no-store",
  });

  return { delivered: response.ok };
};
