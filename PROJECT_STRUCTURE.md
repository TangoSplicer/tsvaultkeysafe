# TSVaultKeySafe — Project Structure

This document provides a comprehensive overview of the project structure, file organization, and the purpose of each file.

---

## Directory Structure

```
tsvaultkeysafe/
├── app/                              # Expo Router screens and navigation
│   ├── (tabs)/                       # Tab-based navigation
│   │   ├── _layout.tsx              # Tab bar configuration
│   │   ├── index.tsx                # Vault home screen
│   │   ├── security.tsx             # Security settings screen
│   │   └── settings.tsx             # App settings screen
│   ├── _layout.tsx                  # Root layout with route configuration
│   ├── modal.tsx                    # Modal screen template
│   ├── unlock.tsx                   # Vault unlock screen
│   └── oauth/
│       └── callback.tsx             # OAuth callback handler
├── lib/                              # Business logic and services
│   ├── encryption.ts                # Encryption/decryption service
│   ├── database.ts                  # Database CRUD operations
│   ├── vault-auth.ts                # PIN and biometric authentication
│   ├── auth.ts                      # User authentication service
│   ├── trpc.ts                      # tRPC API client
│   ├── api.ts                       # API utilities
│   └── manus-runtime.ts             # Manus platform integration
├── components/                       # Reusable React components
│   ├── themed-text.tsx              # Text with theme support
│   ├── themed-view.tsx              # View with theme support
│   ├── haptic-tab.tsx               # Tab with haptic feedback
│   ├── hello-wave.tsx               # Greeting animation
│   ├── parallax-scroll-view.tsx     # Parallax scrolling container
│   ├── external-link.tsx            # External link component
│   └── ui/
│       ├── icon-symbol.tsx          # Icon mapping component
│       ├── icon-symbol.ios.tsx      # iOS-specific icon component
│       └── collapsible.tsx          # Collapsible container
├── constants/                        # App constants and configuration
│   ├── theme.ts                     # Colors, fonts, spacing
│   ├── oauth.ts                     # OAuth configuration
│   └── const.ts                     # General constants
├── hooks/                            # React hooks
│   ├── use-color-scheme.ts          # Dark/light mode hook
│   ├── use-color-scheme.web.ts      # Web-specific color scheme
│   └── use-theme-color.ts           # Theme color hook
├── assets/                           # Images and icons
│   └── images/
│       ├── icon.png                 # App icon
│       ├── splash-icon.png          # Splash screen icon
│       └── favicon.png              # Web favicon
├── server/                           # Backend server (optional)
│   ├── README.md                    # Backend documentation
│   ├── routers.ts                   # API route definitions
│   ├── db.ts                        # Database configuration
│   ├── storage.ts                   # File storage service
│   └── _core/                       # Core server utilities
│       ├── context.ts               # Request context
│       ├── trpc.ts                  # tRPC server setup
│       ├── oauth.ts                 # OAuth implementation
│       ├── llm.ts                   # LLM integration
│       └── ...                      # Other utilities
├── shared/                           # Shared code (client & server)
│   ├── types.ts                     # Shared TypeScript types
│   ├── const.ts                     # Shared constants
│   └── _core/
│       └── errors.ts                # Error definitions
├── drizzle/                          # Database schema (ORM)
│   ├── schema.ts                    # Table definitions
│   ├── relations.ts                 # Table relationships
│   └── meta/                        # Migration metadata
├── tests/                            # Test files
│   └── auth.logout.test.ts          # Authentication tests
├── Documentation Files
│   ├── README_PROJECT.md            # Project overview
│   ├── THREAT_MODEL.md              # Security threat analysis
│   ├── ENCRYPTION_DESIGN.md         # Cryptographic architecture
│   ├── BUILD_INSTRUCTIONS.md        # Build and deployment guide
│   ├── RELEASE_CHECKLIST.md         # Pre-release verification
│   ├── STORE_LISTING.md             # App store marketing copy
│   ├── CONTRIBUTING.md              # Contribution guidelines
│   ├── PRIVACY_POLICY.md            # Privacy policy
│   ├── CHANGELOG.md                 # Version history
│   ├── design.md                    # UI/UX design specification
│   ├── PROJECT_STRUCTURE.md         # This file
│   └── LICENSE                      # MIT License
├── Configuration Files
│   ├── app.config.ts                # Expo configuration
│   ├── tsconfig.json                # TypeScript configuration
│   ├── package.json                 # Dependencies and scripts
│   ├── drizzle.config.ts            # Drizzle ORM configuration
│   └── .gitignore                   # Git ignore rules
├── todo.md                          # Feature tracking
└── README.md                        # Quick start guide (auto-generated)
```

---

## File Descriptions

### App Screens (`app/`)

#### `app/(tabs)/_layout.tsx`
Configures the bottom tab navigation with three tabs: Vault, Security, and Settings. Handles tab bar styling, icons, and safe area insets.

#### `app/(tabs)/index.tsx`
The main Vault screen displaying a list of stored products. Features include search, filtering, quick copy, product deletion, and a floating action button to add new products. Implements auto-lock checking and product loading.

#### `app/(tabs)/security.tsx`
Security settings screen showing encryption status, PIN/biometric configuration, privacy settings (screenshot blocking, clipboard auto-clear), and vault statistics. Includes a "Wipe All Data" button for factory reset.

#### `app/(tabs)/settings.tsx`
App settings screen with information about the app, legal links (privacy policy, terms, threat model), support options, and privacy notice. Links to external resources and support email.

#### `app/_layout.tsx`
Root layout component that sets up the overall app structure, theme provider, safe area context, and route configuration. Initializes Manus runtime and handles safe area metrics for web.

#### `app/unlock.tsx`
Vault unlock screen with numeric PIN entry keypad, biometric authentication button, PIN dots indicator, failed attempt counter, and lockout timer. Handles PIN verification and auto-unlock with biometric.

#### `app/modal.tsx`
Template modal screen demonstrating modal presentation. Can be extended for additional modal screens.

#### `app/oauth/callback.tsx`
OAuth callback handler for user authentication flow. Processes authorization codes and manages login state.

### Business Logic (`lib/`)

#### `lib/encryption.ts`
Core encryption service providing:
- AES-256-GCM encryption and decryption
- HKDF key derivation for database and attachment keys
- PBKDF2 PIN hashing with 100,000 iterations
- Master key generation and management
- Secure memory clearing for sensitive data
- Constant-time comparison for security

#### `lib/database.ts`
Database service for product management:
- CRUD operations (Create, Read, Update, Delete)
- Product search and filtering
- Expiry date tracking
- Database initialization and encryption
- Statistics (product count, database size)
- Bulk operations (clear all products)

#### `lib/vault-auth.ts`
Authentication service for vault security:
- PIN setup and verification
- Biometric authentication (Face ID/Fingerprint)
- Rate limiting (3 attempts → 30s lockout)
- Auto-lock timeout management
- Failed attempt tracking
- Biometric availability checking

#### `lib/auth.ts`
User authentication service for OAuth and session management. Handles login/logout flow and user state.

#### `lib/trpc.ts`
tRPC client configuration for API communication. Sets up the client-side API client with proper error handling.

#### `lib/api.ts`
General API utilities and helpers for HTTP communication.

#### `lib/manus-runtime.ts`
Integration with Manus platform for cookie injection and runtime configuration.

### Components (`components/`)

#### `components/themed-text.tsx`
Text component with automatic dark/light mode support. Provides different text styles (title, subtitle, default, link, etc.).

#### `components/themed-view.tsx`
View container with automatic dark/light mode support for backgrounds.

#### `components/haptic-tab.tsx`
Tab bar button with haptic feedback on press.

#### `components/hello-wave.tsx`
Animated greeting wave component.

#### `components/parallax-scroll-view.tsx`
Scroll view with parallax header effect.

#### `components/external-link.tsx`
Link component for opening external URLs.

#### `components/ui/icon-symbol.tsx`
Icon mapping component that converts SF Symbols (iOS) to Material Icons (Android/Web).

#### `components/ui/collapsible.tsx`
Collapsible container component for expandable sections.

### Constants (`constants/`)

#### `constants/theme.ts`
Color palette, typography scale, and spacing constants. Defines light and dark mode colors.

#### `constants/oauth.ts`
OAuth configuration including client ID, redirect URI, and authorization endpoints.

#### `constants/const.ts`
General app constants and configuration values.

### Hooks (`hooks/`)

#### `hooks/use-color-scheme.ts`
Hook for detecting and using the device's color scheme (light/dark mode).

#### `hooks/use-theme-color.ts`
Hook for accessing themed colors from the theme constants.

### Assets (`assets/`)

#### `assets/images/`
App icons, splash screen images, and favicon. Includes:
- `icon.png` — App launcher icon
- `splash-icon.png` — Splash screen icon
- `favicon.png` — Web favicon

### Documentation Files

#### `README_PROJECT.md`
Comprehensive project overview including features, architecture, getting started guide, security details, and roadmap.

#### `THREAT_MODEL.md`
Security threat analysis using STRIDE methodology. Identifies potential threats, attack scenarios, and mitigation strategies.

#### `ENCRYPTION_DESIGN.md`
Detailed cryptographic architecture explaining encryption algorithms, key hierarchy, key derivation, and security practices.

#### `BUILD_INSTRUCTIONS.md`
Step-by-step guide for building, testing, and deploying the app to Google Play Store and Apple App Store.

#### `RELEASE_CHECKLIST.md`
Pre-release verification checklist covering code quality, testing, security, performance, accessibility, and compliance.

#### `STORE_LISTING.md`
Marketing copy for app store listings including descriptions, keywords, screenshots, press release, and email campaigns.

#### `CONTRIBUTING.md`
Guidelines for contributing to the project including code style, testing, and pull request process.

#### `PRIVACY_POLICY.md`
Comprehensive privacy policy explaining data collection (zero), storage, protection, and user rights.

#### `CHANGELOG.md`
Version history documenting all changes, features, and improvements.

#### `design.md`
UI/UX design specification including screen list, content layout, user flows, and color choices.

#### `PROJECT_STRUCTURE.md`
This file, documenting the project structure and file organization.

#### `LICENSE`
MIT License for the project.

### Configuration Files

#### `app.config.ts`
Expo configuration file defining app metadata, build settings, plugins, and platform-specific configurations.

#### `tsconfig.json`
TypeScript configuration for strict type checking and compilation settings.

#### `package.json`
Project dependencies, scripts, and metadata. Includes all npm packages required for development and production.

#### `drizzle.config.ts`
Drizzle ORM configuration for database schema management.

#### `.gitignore`
Git ignore rules to exclude unnecessary files from version control.

### Other Files

#### `todo.md`
Feature tracking document with checkboxes for planned, in-progress, and completed features.

#### `tests/auth.logout.test.ts`
Example test file for authentication logout functionality.

---

## Key Technologies

| Technology | Purpose | File(s) |
|-----------|---------|---------|
| React Native | Mobile framework | `app/`, `components/` |
| Expo | Development platform | `app.config.ts` |
| TypeScript | Type safety | All `.ts` and `.tsx` files |
| crypto-js | Encryption | `lib/encryption.ts` |
| expo-sqlite | Database | `lib/database.ts` |
| expo-secure-store | Key storage | `lib/vault-auth.ts` |
| expo-local-authentication | Biometric | `lib/vault-auth.ts` |
| AsyncStorage | Local storage | `lib/vault-auth.ts` |
| Expo Router | Navigation | `app/` |
| React Reanimated | Animations | `components/` |

---

## Data Flow

### Encryption Flow

```
User Input (Product Data)
    ↓
Validation (lib/database.ts)
    ↓
Encryption (lib/encryption.ts - AES-256-GCM)
    ↓
Encrypted SQLite Database
    ↓
Platform Keystore (Master Key)
```

### Authentication Flow

```
User PIN/Biometric
    ↓
Verification (lib/vault-auth.ts)
    ↓
Master Key Retrieval
    ↓
Database Unlock
    ↓
Product Access
```

### UI Flow

```
Root Layout (app/_layout.tsx)
    ↓
Tab Navigation (app/(tabs)/_layout.tsx)
    ├─ Vault Screen (app/(tabs)/index.tsx)
    ├─ Security Screen (app/(tabs)/security.tsx)
    └─ Settings Screen (app/(tabs)/settings.tsx)
    
Additional Screens
    ├─ Unlock Screen (app/unlock.tsx)
    ├─ Modal (app/modal.tsx)
    └─ OAuth Callback (app/oauth/callback.tsx)
```

---

## Development Workflow

### Adding a New Feature

1. **Update todo.md** — Add feature to tracking list
2. **Create Screen** — Add new screen in `app/` directory
3. **Add Navigation** — Update route configuration in `app/_layout.tsx`
4. **Implement Logic** — Add business logic in `lib/`
5. **Create Components** — Add reusable components in `components/`
6. **Write Tests** — Add tests in `tests/`
7. **Update Documentation** — Update relevant `.md` files
8. **Commit Changes** — Commit with descriptive message

### File Naming Conventions

- **Screens:** Use kebab-case (e.g., `product-detail.tsx`)
- **Components:** Use PascalCase (e.g., `ProductCard.tsx`)
- **Services:** Use kebab-case (e.g., `encryption.ts`)
- **Hooks:** Use camelCase with `use` prefix (e.g., `useColorScheme.ts`)
- **Constants:** Use UPPER_SNAKE_CASE (e.g., `MAX_PIN_ATTEMPTS`)

---

## Build Artifacts

When building for production, the following artifacts are generated:

- **Android:** `app-release.aab` (App Bundle for Play Store)
- **iOS:** `app.ipa` (App Archive for App Store)
- **Web:** `dist/` directory with static files

See [BUILD_INSTRUCTIONS.md](./BUILD_INSTRUCTIONS.md) for detailed build steps.

---

## Testing

Test files are located in the `tests/` directory:

```bash
# Run all tests
pnpm test

# Run specific test
pnpm test -- auth.logout.test.ts

# Watch mode
pnpm test --watch

# Coverage report
pnpm test --coverage
```

---

## Performance Considerations

- **Code Splitting:** Expo Router automatically code-splits screens
- **Image Optimization:** Use expo-image for optimized image loading
- **Memory Management:** Clear sensitive data after use
- **Database Queries:** Use indexed queries for fast searches
- **Animation Performance:** Use React Native Reanimated for 60 FPS animations

---

## Security Considerations

- **Encryption Keys:** Stored in platform keystore, never in code
- **Sensitive Data:** Cleared from memory after use
- **Network:** No external API calls for sensitive operations
- **Storage:** All data encrypted at rest
- **Authentication:** PIN and biometric with rate limiting

---

## Future Improvements

- [ ] Add product detail screen with full metadata editing
- [ ] Implement QR code scanner for license capture
- [ ] Add bulk CSV import functionality
- [ ] Implement expiry reminders with notifications
- [ ] Add attachment storage and encryption
- [ ] Implement encrypted export/import
- [ ] Add stealth mode (decoy vault)
- [ ] Support multiple vaults
- [ ] Create browser extension
- [ ] Build desktop companion app

---

## Resources

- **Expo Documentation:** https://docs.expo.dev
- **React Native Documentation:** https://reactnative.dev
- **TypeScript Documentation:** https://www.typescriptlang.org/docs/
- **GitHub Repository:** https://github.com/tsvaultkeysafe/app

---

## License

TSVaultKeySafe is released under the MIT License. See [LICENSE](./LICENSE) file for details.
