import "express-session";

declare module "express-session" {
  interface SessionData {
    csrfToken?: string;
    csrfTokenTimestamp?: number;
    pendingMfaUserId?: number;
    pendingMfaRemember?: boolean;
  }
}

