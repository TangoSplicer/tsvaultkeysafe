# TSVaultKeySafe — Mobile App Interface Design

## Design Philosophy

TSVaultKeySafe is designed to be a **trust-first, minimal, and efficient** digital vault. The UI prioritizes security transparency, offline-first messaging, and zero friction for critical actions (unlock, add product, export). The app follows **iOS Human Interface Guidelines** for a native, polished feel.

**Key Principles:**
- **Dark mode first** — Reduces eye strain and reinforces "secure" aesthetic
- **One-handed usage** — All primary actions within thumb zone (bottom 1/3)
- **Minimal onboarding** — Vault usable in under 30 seconds
- **Security transparency** — Users always know encryption status and data location
- **Offline-first messaging** — Clearly communicate "no cloud, no accounts, no tracking"

---

## Screen List

### Tab 1: Vault (Home)
**Purpose:** Browse, search, and manage stored products/licenses.

**Content:**
- **Header:** "Vault" title + Lock status indicator (🔒 Locked / 🔓 Unlocked)
- **Search bar** (if unlocked) — Fast local search across product names, vendors, keys
- **Product list** — Scrollable list of stored items with:
  - Product name (bold)
  - Vendor name (secondary text)
  - Expiry status badge (🟢 Active, 🟡 Expiring soon, 🔴 Expired)
  - Quick copy icon (copy license key to clipboard)
- **Empty state** (if no products) — "No products yet" + "Add your first product" button
- **Floating action button (FAB)** — "+" button to add new product (always visible, bottom-right)

**Functionality:**
- Tap product → Detail screen
- Tap quick copy → Copy key, show "Copied!" toast, auto-clear after 30s
- Tap search → Filter products by name/vendor/key
- Tap "+" → Add product modal

---

### Tab 2: Security
**Purpose:** Manage PIN, biometrics, encryption keys, and security settings.

**Content:**
- **Unlock Method** — Current method (PIN / Biometric) + "Change" button
- **PIN Management** — "Set PIN" / "Change PIN" / "Remove PIN"
- **Biometric Toggle** — "Enable Face ID / Fingerprint" (if device supports)
- **Encryption Status** — "AES-256-GCM" + "Locally encrypted, never synced"
- **Screenshot Blocking** — Toggle "Disable screenshots in vault"
- **Clipboard Auto-Clear** — Dropdown (30s / 60s / 2min / Never)
- **Stealth Mode** (paid feature) — Toggle "Show decoy vault when forced open"
- **Root/Jailbreak Warning** — If detected: "⚠️ Device is rooted/jailbroken. Security may be compromised."
- **Export Vault** — "Export encrypted backup" button (paid feature)
- **Danger Zone** — "Wipe all data" button (red, requires PIN confirmation)

**Functionality:**
- Tap "Set PIN" → PIN setup modal (6-digit numeric)
- Tap "Change PIN" → Old PIN verification → New PIN setup
- Tap "Enable Biometric" → Biometric enrollment
- Tap "Export" → Choose format (ZIP / PDF / CSV) → Enter export passphrase → Download
- Tap "Wipe all data" → Confirmation dialog → Wipe

---

### Tab 3: Settings
**Purpose:** App preferences, about, and legal.

**Content:**
- **App Preferences**
  - Theme (Auto / Light / Dark)
  - Auto-lock timeout (1min / 5min / 15min / Never)
  - Language (English / [future])
- **About**
  - App version
  - "Offline-first, no accounts, no tracking"
  - "Privacy policy" link
  - "Terms of service" link
  - "Threat model" link
  - "Source code" link (GitHub)
- **License & Compliance**
  - "Licenses" (open-source dependencies)
  - "Data safety" (Play Store compliance)
- **Support**
  - "Report bug" (email)
  - "Request feature" (email)

**Functionality:**
- Tap theme → Radio select
- Tap auto-lock timeout → Radio select
- Tap links → Open in browser (external)

---

### Screen: Vault Unlock
**Purpose:** Authenticate user before accessing vault.

**Content:**
- **Large lock icon** (center, animated)
- **"Unlock Vault"** title
- **PIN entry field** (6 dots, numeric keypad below)
- **OR**
- **"Use Face ID / Fingerprint"** button (if enabled)
- **"Forgot PIN?"** link (recovery flow, requires backup code)

**Functionality:**
- Enter PIN → Validate → Unlock vault
- Tap biometric button → Trigger biometric auth
- Tap "Forgot PIN?" → Recovery code entry

---

### Screen: Product Detail
**Purpose:** View, edit, and manage a single product/license.

**Content:**
- **Header:** Product name + "Edit" / "Delete" buttons
- **Product fields** (read-only or editable):
  - Product name
  - Vendor
  - License key / Serial (with quick copy button)
  - Purchase date
  - Expiry / Renewal date
  - Notes (text area)
  - Attachments (PDFs, images) — thumbnails with download/delete
  - Download URLs (links, not fetched)
  - Category (e.g., "Software", "Game", "Subscription")
- **Action buttons:**
  - "Copy License Key" (with auto-clear timer)
  - "Copy All" (JSON format)
  - "Export as PDF"
  - "Delete"

**Functionality:**
- Tap "Edit" → Edit modal
- Tap "Copy License Key" → Copy to clipboard, show toast
- Tap attachment → Preview or download
- Tap "Delete" → Confirmation → Delete
- Tap "Export as PDF" → Generate PDF, download

---

### Screen: Add / Edit Product
**Purpose:** Create or modify a vault item.

**Content (Modal):**
- **Form fields:**
  - Product name (required, text input)
  - Vendor (text input)
  - License key / Serial (text input, masked option)
  - Purchase date (date picker)
  - Expiry / Renewal date (date picker, optional)
  - Category (dropdown: Software, Game, Subscription, Template, Other)
  - Notes (text area)
  - Attachments (file picker — PDF, images)
  - Download URLs (comma-separated list)
- **Action buttons:**
  - "Save" (bottom, full-width)
  - "Cancel" (secondary)
- **Quick actions:**
  - "Scan QR code" (opens camera, scans license card)
  - "Import from CSV" (bulk add)

**Functionality:**
- Tap "Scan QR" → Camera opens, scans license info
- Tap "Import CSV" → File picker → Parse and bulk-add products
- Tap "Save" → Validate → Encrypt → Store → Return to vault
- Tap "Cancel" → Close modal without saving

---

### Screen: QR Scanner
**Purpose:** Scan license cards, emails, or product barcodes.

**Content:**
- **Full-screen camera view**
- **Scan frame** (center, with guides)
- **"Torch" toggle** (top-right)
- **"Cancel" button** (top-left)

**Functionality:**
- Scan QR → Extract product info → Pre-fill Add Product form
- Tap torch → Toggle flashlight
- Tap cancel → Close scanner

---

### Screen: Import / Export
**Purpose:** Backup and restore vault data.

**Content:**
- **Export options:**
  - Format: PDF / CSV / Encrypted ZIP
  - Passphrase (for ZIP export)
  - "Export" button
- **Import options:**
  - File picker (CSV, ZIP)
  - Passphrase (for ZIP import)
  - "Import" button
- **Import preview:**
  - Show number of items to import
  - Confirm before importing

**Functionality:**
- Tap "Export" → Choose format → Enter passphrase → Download
- Tap "Import" → File picker → Validate → Confirm → Import
- Show progress bar during import/export

---

## Primary Content and Functionality

### Data Model
Each product stores:
- `id` (UUID)
- `name` (string)
- `vendor` (string)
- `licenseKey` (string, encrypted)
- `serialNumber` (string, encrypted)
- `purchaseDate` (ISO 8601)
- `expiryDate` (ISO 8601, optional)
- `renewalDate` (ISO 8601, optional)
- `notes` (string, encrypted)
- `category` (enum: Software, Game, Subscription, Template, Other)
- `attachments` (array of encrypted file metadata)
- `downloadUrls` (array of URLs, metadata only)
- `createdAt` (ISO 8601)
- `updatedAt` (ISO 8601)
- `isArchived` (boolean)

### Encryption
- **Master key:** Stored in platform keystore (Android Keystore / iOS Keychain)
- **Database key:** Derived from master key, encrypts SQLite
- **Attachment key:** Separate key for file encryption
- **Algorithm:** AES-256-GCM
- **Memory hygiene:** Sensitive strings cleared after use

---

## Key User Flows

### Flow 1: First-Time Setup
1. User opens app → Splash screen
2. "Set up vault" prompt
3. User sets 6-digit PIN
4. User optionally enables biometric
5. User sees empty vault → "Add your first product" button
6. User taps "+" → Add Product modal
7. User enters product details → Saves
8. User sees product in vault

### Flow 2: Daily Use — Add License
1. User opens app → Unlock screen
2. User enters PIN → Vault unlocks
3. User taps "+" FAB → Add Product modal
4. User enters product name, license key, vendor
5. User taps "Save" → Product encrypted and stored
6. User returns to vault, sees new product

### Flow 3: Quick Copy
1. User opens app → Unlock → Vault visible
2. User taps product → Detail screen
3. User taps "Copy License Key" → Key copied to clipboard
4. Toast shows "Copied! (Auto-clear in 30s)"
5. After 30s, clipboard is cleared automatically

### Flow 4: Search & Filter
1. User opens app → Unlock → Vault visible
2. User taps search bar → Search field activates
3. User types "Adobe" → List filters to matching products
4. User taps product → Detail screen

### Flow 5: Export Backup
1. User opens app → Unlock → Security tab
2. User taps "Export Vault" → Export modal
3. User selects format (ZIP / PDF / CSV)
4. User enters passphrase (for ZIP)
5. User taps "Export" → File downloaded
6. User backs up file to external storage

### Flow 6: Import Backup
1. User opens app → Unlock → Security tab
2. User taps "Import Vault" → File picker
3. User selects backup file (CSV or ZIP)
4. If ZIP, user enters passphrase
5. System validates and shows preview ("5 products to import")
6. User confirms → Products imported and encrypted

### Flow 7: Biometric Unlock
1. User opens app → Unlock screen
2. User taps "Use Face ID" → Biometric prompt
3. User authenticates → Vault unlocks
4. User sees vault

### Flow 8: Stealth Mode (Paid Feature)
1. User enables "Stealth Mode" in Security tab
2. If app is force-opened (e.g., by malware), it shows decoy vault
3. Real vault only accessible with correct PIN

---

## Color Choices

### Brand Colors (Dark Mode First)
- **Primary accent:** `#00D084` (Vibrant teal — trust, security, freshness)
- **Background:** `#0F0F0F` (Near-black, reduces eye strain)
- **Card surface:** `#1A1A1A` (Elevated surface)
- **Text primary:** `#FFFFFF` (High contrast)
- **Text secondary:** `#A0A0A0` (Muted)
- **Text disabled:** `#606060` (Very muted)
- **Border:** `#2A2A2A` (Subtle divider)
- **Success:** `#00D084` (Green, matches primary)
- **Warning:** `#FFB800` (Amber, expiry soon)
- **Error:** `#FF3B30` (Red, expired or critical)
- **Lock icon:** `#00D084` (Teal, matches primary)

### Light Mode (Secondary)
- **Primary accent:** `#0066CC` (Deep blue)
- **Background:** `#FFFFFF` (Pure white)
- **Card surface:** `#F5F5F5` (Light gray)
- **Text primary:** `#000000` (High contrast)
- **Text secondary:** `#666666` (Muted)
- **Border:** `#E0E0E0` (Subtle divider)

---

## Typography & Spacing

### Font Sizes
- **Title (32pt):** Screen headers, vault unlock title
- **Subtitle (20pt):** Section headers, product name
- **Body (16pt):** Product details, form fields
- **Caption (12pt):** Secondary info, timestamps
- **Monospace (14pt):** License keys, code snippets

### Spacing (8pt grid)
- **Padding:** 16pt (2×8) standard, 8pt (1×8) compact
- **Gaps:** 8pt (vertical), 12pt (horizontal)
- **Margins:** 16pt (top/bottom), 12pt (left/right)

### Corner Radius
- **Buttons:** 8pt
- **Cards:** 12pt
- **Modals:** 16pt (top corners)
- **Input fields:** 8pt

---

## Accessibility

- **Minimum touch target:** 44pt × 44pt
- **Color contrast:** WCAG AA (4.5:1 for text)
- **Font size:** Minimum 14pt for body text
- **VoiceOver support:** All interactive elements labeled
- **Haptic feedback:** Tap feedback on buttons, success/error notifications
- **Reduced motion:** Respect system preference for animations

---

## Summary

TSVaultKeySafe is a **minimal, trust-first vault** that prioritizes security, privacy, and ease of use. The UI is designed for one-handed operation, dark-mode-first aesthetics, and zero friction for critical actions. Every screen reinforces the offline-first, no-account, no-tracking message that differentiates the app from cloud-based competitors.
