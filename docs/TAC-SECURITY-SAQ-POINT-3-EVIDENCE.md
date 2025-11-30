# SAQ – Evidence for Point 3
**Server-Side Only Access Controls (Trusted Enforcement Points)**

---

## Declaration

The application enforces authentication and authorization **exclusively on trusted enforcement points server-side**. Every API endpoint is protected by dedicated middleware (`isAuthenticated`, `isAdmin`, `isSuperAdmin`) that verify the session and role before granting access to resources.

Authentication is implemented with **Passport.js** and **server-side sessions stored in MongoDB**. The client performs no security enforcement: it may hide UI elements for usability, but **every request is validated by the server** regardless. This architecture follows the principle of **never trust the client**.

---

## 1) Authentication and Authorization Middleware (server-side)

**File:** `server/routes.ts`

```typescript
// Authentication check
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (handleSessionTimeout(req, res, next)) return;
  
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      message: "Not authenticated",
      code: "NOT_AUTHENTICATED" 
    });
  }
  next();
};

// Authorization: admin or superadmin
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (handleSessionTimeout(req, res, next)) return;
  
  if (!req.isAuthenticated()) {
    return res.status(401).json({ code: "NOT_AUTHENTICATED" });
  }
  
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
    logger.warn("Admin access denied - insufficient permissions", {
      userId: req.user?.legacyId,
      userRole: req.user?.role,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: "Access denied - admin privileges required",
      code: "INSUFFICIENT_PERMISSIONS" 
    });
  }
  next();
};

// Authorization: superadmin only
const isSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (handleSessionTimeout(req, res, next)) return;
  
  if (!req.isAuthenticated() || req.user.role !== "superadmin") {
    return res.status(403).json({ 
      message: "Access restricted to super-admin" 
    });
  }
  next();
};
```

**🔒 Enforcement:** Server-side only, validated on every request

---

## 2) Enforcement on Endpoints (always validated server-side)

**File:** `server/routes.ts`

```typescript
// Authenticated users only - documents filtered by clientId
app.get("/api/documents", isAuthenticated, async (req, res) => {
  const clientId = req.user?.clientId;
  if (!clientId) return res.json([]);
  
  // Query filtered by user's clientId (from database session)
  const documents = await mongoStorage.getDocuments(clientId);
  res.json(documents);
});

// Admin/superadmin only - clientId enforced server-side
app.post("/api/documents", isAdmin, async (req, res) => {
  if (!req.user?.clientId) {
    return res.status(403).json({ 
      message: "No client associated with this account" 
    });
  }
  
  const newDocument = await mongoStorage.createDocument({
    ...req.body,
    clientId: req.user.clientId  // ENFORCED server-side from session
  });
  
  // Audit log
  await mongoStorage.createLog({
    userId: req.user.legacyId,
    action: "create",
    documentId: newDocument.legacyId,
    details: { message: "Document created" }
  });
  
  res.status(201).json(newDocument);
});

// Data isolation: verify document belongs to user's client
app.get("/api/documents/:id", isAuthenticated, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const document = await mongoStorage.getDocument(id);
  
  // Double validation: document must belong to user's client
  if (!document || document.clientId !== req.user.clientId) {
    return res.status(404).json({ message: "Document not found" });
  }
  
  res.json(document);
});
```

**🔒 Key Points:**
- `clientId` always enforced from `req.user.clientId` (database session)
- Data isolation: users can only access their client's data
- All write operations require admin role
- Audit logging for critical operations

---

## 3) Authentication with Server-Side Sessions in MongoDB (Passport.js)

**File:** `server/auth.ts`

```typescript
export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    console.error("SESSION_SECRET required (min 32 chars)");
    process.exit(1);
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,  // MongoDB (server-side storage)
    cookie: {
      httpOnly: true,              // Not accessible from JavaScript
      secure: process.env.NODE_ENV === "production",  // HTTPS only
      sameSite: "lax",             // CSRF protection
      maxAge: 24 * 60 * 60 * 1000  // 24 hours default
    }
  };
  
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  passport.use(new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: "Invalid credentials" });
      }
      
      // Brute force protection
      if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
        const timeLeft = Math.ceil(
          (new Date(user.lockoutUntil).getTime() - Date.now()) / 60000
        );
        return done(null, false, { 
          message: `Account locked. Retry in ${timeLeft} minutes.` 
        });
      }
      
      const passwordsMatch = await comparePasswords(password, user.password);
      if (passwordsMatch) {
        await storage.resetLoginAttempts(email);
        return done(null, user);
      } else {
        await storage.recordFailedLoginAttempt(email);
        return done(null, false, { message: "Invalid credentials" });
      }
    }
  ));
}
```

**🔒 Security Features:**
- **Session storage:** MongoDB (server-side), never client-side
- **Secure cookies:** `httpOnly`, `secure` in production, `sameSite=lax`
- **Brute force protection:** Account lockout after failed attempts
- **SESSION_SECRET validation:** Minimum 32 characters required
- **Session regeneration:** After login to prevent session fixation

---

## 4) No Enforcement on the Client (UI hiding only)

**File:** `client/src/lib/protected-route.tsx`

```typescript
export function ProtectedRoute({ 
  path, 
  component: Component, 
  adminOnly = false 
}) {
  const { user } = useAuth();
  
  // UI-only check: does NOT enforce security
  if (adminOnly && user.role !== "admin" && user.role !== "superadmin") {
    return <Redirect to="/" />;
  }
  
  return <Route path={path} component={Component} />;
}
```

**⚠️ IMPORTANT:**
- This is **UI hiding only**, NOT security enforcement
- Easy to bypass by navigating directly or using DevTools
- **Real protection:** Every API call is validated server-side regardless
- **Purpose:** Improve UX by hiding inaccessible pages

**Example bypass attempt (that FAILS):**
```javascript
// User could try to navigate manually:
window.location.href = "/admin/users";

// Client shows "Access denied" page
// BUT even if they bypass UI, every API call fails:
fetch("/api/users")
  .then(res => res.json())
  // ❌ Server responds: 403 Forbidden
  // ❌ isAdmin middleware blocks the request
  // ❌ No sensitive data exposed
```

---

## 5) Quick Verification Tests

### Test 1: Non-admin user tries admin endpoint
```bash
# Authenticated user with role="user"
curl -X POST https://<host>/api/documents \
  -H "Cookie: connect.sid=<user-session>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","type":"PDF"}'

# Expected response:
# HTTP 403
# {"message":"Access denied - admin privileges required","code":"INSUFFICIENT_PERMISSIONS"}
```

### Test 2: Unauthenticated request
```bash
curl -X GET https://<host>/api/documents

# Expected response:
# HTTP 401
# {"message":"Not authenticated","code":"NOT_AUTHENTICATED"}
```

### Test 3: Admin tries to access another client's document
```bash
# Admin of client 1 tries to access document from client 2
curl -X GET https://<host>/api/documents/999 \
  -H "Cookie: connect.sid=<admin-client1-session>"

# Expected response:
# HTTP 404
# {"message":"Document not found"}
# (document exists but belongs to different client - data isolation)
```

---

## Summary

**Access controls are enforced exclusively on server-side trusted enforcement points.**

✅ **Middleware protection:** All endpoints use `isAuthenticated`, `isAdmin`, `isSuperAdmin`  
✅ **Session-based auth:** Passport.js with MongoDB sessions (httpOnly cookies, secure in production)  
✅ **Data isolation:** `clientId` enforced server-side, cross-client access prevented  
✅ **Brute force protection:** Account lockout after failed login attempts  
✅ **Audit logging:** All critical operations tracked with userId, IP, timestamp  
✅ **No client enforcement:** Client only hides UI; every request validated server-side  
✅ **Defense in depth:** Session timeout, CSRF protection, secure cookies, role verification  

**Architecture principle:** Never trust the client

---

**Document prepared for:** TAC Security Team  
**Date:** November 11, 2025  
**Application:** SGI Cruscotto  

**Reference files:**
- `server/auth.ts` - Authentication setup
- `server/routes.ts` - Protected endpoints
- `server/mfa-routes.ts` - MFA endpoints
- `server/backup-routes.ts` - Backup operations
- `client/src/lib/protected-route.tsx` - Client-side routing (UI only)



