# drive.readonly Scope Justification - Short Version
## For Google OAuth Verification Form (English)

---

## APPLICATION DESCRIPTION (max 4000 characters)

**Application Name:** SGI-Cruscotto  
**Type:** Business document management system for regulatory compliance tracking

### Core Functionality

SGI-Cruscotto is a professional web platform that helps businesses monitor regulatory documents (ISO certifications, licenses, quality documents) already stored in their personal Google Drive, providing:
- Automatic synchronization of document metadata
- Expiration date tracking with automated alerts
- Compliance dashboard for audits and management
- Document viewing through Google Drive Viewer

**User Value:** Companies keep documents in THEIR OWN Google Drive (data sovereignty) while gaining professional tracking and automatic alerts without re-uploading files to third-party platforms.

### Complete User Flow

**1. Registration**
- User creates account with email/password (bcrypt-hashed)
- Each client receives isolated account with JWT authentication + HTTP-only cookies

**2. Google Drive Authorization (clients-page.tsx)**
- User navigates to "Google Drive Configuration" page
- Clicks "Select Folder" → Google OAuth popup opens (500x600px)
- User authorizes `drive.readonly` scope on official Google consent screen
- Backend receives authorization code and exchanges it server-side for access_token + refresh_token
- Tokens stored ENCRYPTED in MongoDB database (never exposed to frontend)

**3. Folder Selection (Google Picker API)**
- After OAuth, Google Picker automatically opens
- User NAVIGATES their own Drive and SELECTS business folder to monitor
  (e.g., "Company/Quality Documents/Certifications")
- App stores: driveFolderId + folderName
- Configuration saved to client record

**4. Document Synchronization**
- Click "Sync Now" (or configured automatic sync)
- Backend uses refresh_token to obtain fresh access_token
- API calls: `drive.files.list(folderId)` → retrieves ONLY METADATA:
  * File name
  * MIME type (PDF, DOCX, XLSX)
  * Last modified date
  * Drive File ID
- Parses information: title, revision, expiration date (from filename)
- **NO file content downloaded to our servers**
- Saves metadata to database with Drive links for future access

**5. Dashboard View (document-table.tsx)**
- User sees document table with:
  * Document reference/path
  * Title and revision
  * Status badge (Valid/Expiring/Expired)
  * Last updated date
- Click "Preview" → redirect to official Google Drive Viewer (iframe)
- User sees ONLY their own documents (multi-tenant isolation by clientId)

### Why drive.readonly Is REQUIRED (not drive.file)

**PROBLEM WITH drive.file:**
- `drive.file` allows access ONLY to files created/opened by the app itself
- Client documents ALREADY EXIST in their Drive BEFORE using our app
- App does NOT create files, does NOT upload files → did NOT create these documents
- **RESULT: drive.file would return 0 files → app completely unusable**

**Real-world scenario:**
```
Client has Drive folder: "ISO Certifications/"
  - ISO9001_Cert_Rev3_Exp20251231.pdf (uploaded by client in 2023)
  - Quality_Manual_v5.docx (created by client)
  - Audit_Report_2024.pdf (uploaded by external consultant)

WITH drive.file scope:
  → App requests file list → Google returns []
  → Reason: app did not create these files
  → FUNCTIONALITY IMPOSSIBLE

WITH drive.readonly scope:
  → App requests file list → Google returns all 3 files
  → App reads metadata (name, date, type)
  → App displays in dashboard with expiration tracking
  → Files remain in client's Drive, secure and controlled
```

**WHY READ-ONLY IS SUFFICIENT:**
- Our app is EXCLUSIVELY a MONITORING service
- We do NOT create, modify, or delete files in Drive
- API operations used: ONLY `files.list()` and `files.get(metadata)`
- Operations NOT used: `files.create()`, `files.update()`, `files.delete()`
- Read-only PROTECTS user: impossible accidental or malicious modifications to their documents

---

## SCOPE JUSTIFICATION (max 2000 characters)

**Reason for drive.readonly request:**

Our application monitors PRE-EXISTING business documents in the client's Google Drive. Typical scenario:
1. Company already has "Certifications" folder with ISO, licenses, safety documents
2. Wants expiration tracking without uploading files elsewhere (data sovereignty)
3. Selects folder via Google Picker after OAuth
4. App reads ONLY metadata (name, date, type) to create compliance dashboard
5. Click preview → redirect to official Drive viewer

**drive.file DOES NOT work because:**
- Limits access to files created BY THE APP
- Client's files existed BEFORE the app
- App doesn't create files → drive.file returns 0 results → service unusable

**drive.readonly is necessary because:**
- Accesses PRE-EXISTING files selected by user
- Allows reading user-organized folder structures
- Is the MINIMUM privilege to read documents not created by app

**Security implemented:**
- OAuth tokens encrypted in database (never exposed to frontend)
- Multi-tenant isolation: each client sees ONLY their own data
- ZERO file content downloads (metadata only)
- Preview through Drive viewer (no proxy)
- HTTPS, bcrypt, JWT, CSRF protection, rate limiting
- GDPR compliant and follows Google API Data Policy

**User benefit:**
- Documents remain in THEIR OWN Drive
- Zero re-uploads
- Total control (revoke OAuth = immediate stop)
- Automatic expiration alerts

---

## LIMITED USE DISCLOSURE

SGI-Cruscotto uses data from Google APIs exclusively to:
- Provide document tracking service requested by user
- Display document metadata dashboard
- Send expiration notifications

We commit to:
- ✅ NOT transfer Drive data to third parties
- ✅ NOT use data for advertising
- ✅ NOT allow human access to content (except for security/legal requirements)
- ✅ Full compliance with Google API Services User Data Policy
- ✅ Complete privacy policy at /privacy.html
- ✅ Full transparency on OAuth consent screen

---

## DATA USE DECLARATION (max 1000 characters)

SGI-Cruscotto accesses Google Drive to:
1. Read file metadata (name, modification date, MIME type) from user-selected folder
2. Store metadata in our database for tracking dashboard
3. Generate Drive links for document preview

We do NOT access:
- File content (never downloaded)
- Folders not selected by user
- Other users' Drives

Data stored:
- Document metadata (name, type, date, Drive ID)
- Drive folder ID selected by user
- OAuth tokens (encrypted, for API calls only)

Security:
- Database encryption
- Per-client isolation
- Server-side tokens only
- GDPR compliant

User controls:
- Which folder to share (Google Picker)
- Revoke access anytime (Google Account settings)
- Account and data deletion

ZERO third-party data transfer. ZERO advertising.

---

## ALTERNATIVES CONSIDERED (max 500 characters)

**drive.file:** ❌ Impossible - only accesses files created by app, not client's pre-existing files
**drive.metadata.readonly:** ❌ Insufficient - doesn't include folder navigation and file type info needed
**drive.appdata:** ❌ Only for hidden app data, not user documents
**drive (full):** ❌ Excessive - includes write/delete we don't need, violates least privilege principle

**drive.readonly:** ✅ IDEAL - minimum privilege to read existing files without modification capabilities

---

## YOUTUBE VIDEO DEMONSTRATION SCRIPT (optional)

**Title:** "SGI-Cruscotto - Google Drive Integration Demo for OAuth Verification"  
**Duration:** 3-4 minutes  
**Language:** English with subtitles

**Script Outline:**

[0:00-0:30] Introduction
- "Hello, I'm demonstrating SGI-Cruscotto for Google OAuth verification"
- "Our app helps businesses track regulatory documents in their own Google Drive"
- "Let me show you exactly how we use drive.readonly scope"

[0:30-1:00] User Registration & Login
- Show registration form
- Create demo account "demo@example.com"
- Successful login with JWT authentication

[1:00-2:00] Google Drive Authorization Flow
- Navigate to "Google Drive Configuration" page
- Show current status: "Not configured"
- Click "Select Folder" button
- **OAuth popup opens** - show Google consent screen
- Point out: "Requesting drive.readonly scope"
- Point out: "See our privacy policy link"
- **User grants permission**
- Show success message: "Authorization successful"

[2:00-2:45] Folder Selection with Google Picker
- Google Picker automatically opens
- Navigate through Drive folders: "My Drive → Business Documents → Certifications"
- Highlight: "User can choose ANY folder they want"
- Select "Certifications" folder
- Confirm selection
- Show: Folder ID and name saved

[2:45-3:15] Document Synchronization
- Click "Sync Now" button
- Show loading indicator
- Backend calls Drive API (explain voiceover)
- Show success: "3 documents synchronized"
- Redirect to dashboard

[3:15-3:45] Document Dashboard (document-table.tsx)
- Show document table with:
  * ISO9001_Certificate.pdf - Status: Valid
  * Safety_License_Exp20250630.pdf - Status: Expiring Soon (amber badge)
  * Quality_Manual_v3.docx - Status: Valid
- Click "Preview" on one document
- **Opens Google Drive Viewer** (show URL: drive.google.com)
- Highlight: "No file download, direct link to user's Drive"

[3:45-4:00] Security & Privacy Demonstration
- Show: "Each user sees only their documents"
- Logout
- Login as different demo user
- Show: Completely different document list (isolation)
- Optional: Show revoking access in Google Account settings

[4:00-4:15] Conclusion
- "Summary: We read metadata only from user-selected folder"
- "drive.file cannot access pre-existing files"
- "drive.readonly is minimum needed scope"
- "Thank you for reviewing SGI-Cruscotto"

**Technical Notes for Video:**
- Screen resolution: 1920x1080
- Capture browser console showing API calls (optional)
- Show network tab with Drive API requests (optional)
- Use demo Google account with sample documents

---

## CONTACT INFORMATION

**Primary Contact:**  
Name: [Your Name / Team Name]  
Email: [your-support-email@domain.com]  
Response Time: Within 24 hours for verification queries

**Application URLs:**  
- Production: https://[your-domain.com]
- Privacy Policy: https://[your-domain.com]/privacy.html
- Terms of Service: https://[your-domain.com]/terms.html

**Google Cloud Project:**  
- Project ID: [your-project-id]
- OAuth Client ID: [your-client-id].apps.googleusercontent.com

**Additional Documentation:**  
- Full technical documentation: Available in repository docs/
- Security audit: Available upon request
- Code samples: Can provide read-only repository access

---

## FREQUENTLY ANTICIPATED QUESTIONS

**Q: Why not use Drive App Data folder?**  
A: App Data folder is hidden and for app-specific storage. Our users need to select their existing business document folders which are visible and managed by them.

**Q: Why not have users share folders with a service account?**  
A: This would require users to manually configure sharing permissions and wouldn't scale. OAuth + Picker provides better UX and proper consent flow.

**Q: Can you use drive.metadata.readonly?**  
A: No - this scope lacks folder hierarchy access and file type information essential for our tracking logic.

**Q: Do you download files?**  
A: Absolutely not. We only read metadata via API. File preview uses Google's official Drive viewer with direct links.

**Q: What happens if user revokes access?**  
A: Sync immediately stops. Dashboard shows last-synced state. User can re-authorize anytime to resume.

**Q: Do you support team/shared drives?**  
A: Currently personal Drive only. Shared Drive support planned for future with appropriate additional scope request.

---

*Document prepared for Google OAuth Verification Team*  
*SGI-Cruscotto Development Team*  
*Version: 1.0 - [Date]*

---

## ✅ VERIFICATION CHECKLIST

Before submitting, ensure:

- [ ] OAuth consent screen fully configured
- [ ] Privacy policy published and linked
- [ ] Terms of service published and linked
- [ ] Domain ownership verified
- [ ] App logo uploaded (120x120px minimum)
- [ ] Support email configured and monitored
- [ ] All scope justifications filled
- [ ] Video demo recorded (if required)
- [ ] Test users added for reviewer access
- [ ] Production environment stable

**Estimated Review Time:** 4-6 weeks (per Google documentation)  
**Recommendation:** Submit during low-volume periods (avoid December holidays)

Good luck with your verification! 🚀

