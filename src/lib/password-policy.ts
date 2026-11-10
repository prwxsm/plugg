export const PASSWORD_HELP =
  "Use at least 15 characters. A few unrelated words work well. Maximum 72 UTF-8 bytes.";
const common = new Set([
  "123456789012345",
  "1234567890123456",
  "passwordpassword",
  "password123456789",
  "qwertyuiopasdfgh",
  "qwertyuiopasdfghjkl",
  "letmeinletmeinletmein",
]);
export function passwordError(password: unknown): string | null {
  if (typeof password !== "string" || [...password].length < 15)
    return "Use at least 15 characters for your password.";
  if (new TextEncoder().encode(password).length > 72)
    return "Password is too long (maximum 72 UTF-8 bytes).";
  if (
    common.has(password.toLowerCase()) ||
    /^(.)\1+$/u.test(password) ||
    /^(?:1234567890|0123456789|12345678|password)+$/i.test(password)
  )
    return "This password is too common. Choose a unique passphrase.";
  return null;
}
