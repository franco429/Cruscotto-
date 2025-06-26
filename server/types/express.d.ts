import { UserDocument } from '../shared-types/schema';

declare global {
  namespace Express {
    interface User extends UserDocument {}
  }
  
  namespace Express.Session {
    interface SessionData {
      legacyId?: number;
      csrfToken?: string;
    }
  }
}


declare module 'express-session' {
  interface SessionData {
    legacyId?: number;
    csrfToken?: string;
  }
}

export {}; 