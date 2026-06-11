export const BINUS_CAMPUSES = [
  "Anggrek Campus",
  "Syahdan Campus",
  "Alam Sutera Campus",
  "Senayan Campus (JWC Campus)",
  "FX Sudirman Campus",
  "Bekasi Campus",
  "Bandung Campus",
  "Malang Campus",
  "Semarang Campus",
] as const;

export type BinusCampus = (typeof BINUS_CAMPUSES)[number];

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const AUTH_COOKIE_PREFIX = "inkcuba";

export const AUTH_ROUTES = {
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
  dashboard: "/dashboard",
} as const;

export function generateDefaultAvatarUrl(seed?: string): string {
  const avatarSeed = seed ?? crypto.randomUUID().slice(0, 8);
  return `https://api.dicebear.com/10.x/glyphs/svg?seed=${encodeURIComponent(avatarSeed)}`;
}
