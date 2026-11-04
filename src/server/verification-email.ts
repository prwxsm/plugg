export function requireVerificationEmailConfig() {
  if (!process.env["RESEND_API_KEY"] || !process.env["PLUGG_EMAIL_FROM"]) {
    throw new Error("Email verification is being set up. Please try creating your account later.");
  }
}
export async function sendVerificationEmail(email: string, code: string, id: string) {
  requireVerificationEmailConfig();
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${process.env["RESEND_API_KEY"]}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `registration/${id}`,
      },
      body: JSON.stringify({
        from: process.env["PLUGG_EMAIL_FROM"],
        to: [email],
        subject: "Verify your Plugg email",
        text: `Your Plugg verification code is: ${code}\n\nEnter it in the signup window within 15 minutes. Never share this code. If you did not request a Plugg account, ignore this email.`,
      }),
    });
    if (!response.ok) throw new Error("delivery_failed");
  } catch {
    // Do not expose provider responses, credentials or verification codes.
    throw new Error("We could not send your verification email. Please try again later.");
  }
}
