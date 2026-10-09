/** Invite codes are upper-case letters and digits; anything else in a pasted link is dropped. */
export function normalizeInviteCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 32);
}
