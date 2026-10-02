import "server-only";

import { randomBytes } from "crypto";

import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
} from "@/lib/workspaces/members/types";

/** Cryptographically random invite code (no symbols, lowercase alnum, length 8). */
export function generateWorkspaceInviteCode(): string {
  const bytes = randomBytes(INVITE_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_CODE_ALPHABET[bytes[i]! % INVITE_CODE_ALPHABET.length]!;
  }
  return code;
}
