# Contributing to TSVaultKeySafe

Thank you for your interest in contributing to TSVaultKeySafe! We welcome contributions from the community, whether it's bug reports, feature requests, documentation improvements, or code contributions.

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

---

## How to Contribute

### Reporting Bugs

If you discover a bug, please create an issue on GitHub with the following information:

- **Title:** Clear, descriptive title
- **Description:** Detailed description of the bug
- **Steps to Reproduce:** Step-by-step instructions to reproduce the issue
- **Expected Behavior:** What you expected to happen
- **Actual Behavior:** What actually happened
- **Environment:** OS, device, app version, etc.
- **Screenshots:** If applicable, include screenshots or screen recordings

### Requesting Features

We'd love to hear your feature ideas! Please create an issue with:

- **Title:** Clear, descriptive title
- **Description:** Detailed description of the feature
- **Use Case:** Why you need this feature
- **Proposed Solution:** Your suggested implementation (optional)
- **Alternatives:** Alternative approaches you've considered

### Submitting Code

1. **Fork the Repository**
   ```bash
   git clone https://github.com/tsvaultkeysafe/app.git
   cd tsvaultkeysafe
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Follow the code style guidelines (see below)
   - Write tests for new features
   - Update documentation as needed

4. **Commit Your Changes**
   ```bash
   git commit -m "Add feature: description of changes"
   ```

5. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Provide a clear description of your changes
   - Reference any related issues
   - Include screenshots or videos if applicable
   - Ensure all tests pass

---

## Code Style Guidelines

### TypeScript

- Use TypeScript for all code
- Enable strict mode (`"strict": true` in tsconfig.json)
- Avoid `any` types; use proper typing
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

```typescript
/**
 * Encrypts data using AES-256-GCM
 * @param plaintext - Data to encrypt
 * @param key - Encryption key (256-bit)
 * @returns Encrypted data with IV and auth tag
 */
function encryptData(plaintext: string, key: Uint8Array): EncryptedData {
  // Implementation
}
```

### React Components

- Use functional components with hooks
- Use `React.memo` for expensive components
- Keep components small and focused
- Use descriptive prop names
- Add PropTypes or TypeScript interfaces

```typescript
interface ProductCardProps {
  product: Product;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
}

const ProductCard = React.memo(({ product, onPress, onDelete }: ProductCardProps) => {
  // Component code
});
```

### Naming Conventions

- **Files:** Use kebab-case (e.g., `product-card.tsx`)
- **Components:** Use PascalCase (e.g., `ProductCard`)
- **Functions:** Use camelCase (e.g., `encryptData`)
- **Constants:** Use UPPER_SNAKE_CASE (e.g., `MAX_PIN_ATTEMPTS`)
- **Interfaces:** Use PascalCase with `I` prefix (e.g., `IProduct`)

### Formatting

- Use Prettier for code formatting
- Use ESLint for linting
- Line length: 100 characters (soft limit)
- Indentation: 2 spaces

```bash
# Format code
pnpm format

# Lint code
pnpm lint

# Fix linting errors
pnpm lint --fix
```

---

## Testing

### Writing Tests

- Write unit tests for all utility functions
- Write integration tests for complex flows
- Aim for 80%+ code coverage
- Use descriptive test names

```typescript
describe('encryptData', () => {
  it('should encrypt plaintext and return encrypted data with IV', () => {
    const plaintext = 'sensitive data';
    const key = generateRandomKey();
    
    const result = encryptData(plaintext, key);
    
    expect(result.iv).toBeDefined();
    expect(result.ciphertext).toBeDefined();
    expect(result.authTag).toBeDefined();
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Generate coverage report
pnpm test --coverage
```

---

## Documentation

### README Updates

If your changes affect how users interact with the app, update the relevant documentation:

- `README_PROJECT.md` — Project overview and features
- `BUILD_INSTRUCTIONS.md` — Build and deployment
- `THREAT_MODEL.md` — Security analysis
- `ENCRYPTION_DESIGN.md` — Cryptographic architecture

### Code Comments

- Add comments for complex logic
- Explain the "why," not just the "what"
- Keep comments up-to-date with code changes

```typescript
// Rate limit PIN attempts to prevent brute force attacks
// After 3 failed attempts, lock out for 30 seconds
async function verifyVaultPin(pin: string): Promise<boolean> {
  const failedAttempts = await getVaultFailedAttempts();
  if (failedAttempts >= 3) {
    throw new Error('Too many failed attempts');
  }
  // ...
}
```

---

## Security Considerations

### Sensitive Data

- Never log sensitive data (passwords, keys, PINs)
- Clear sensitive data from memory after use
- Use constant-time comparisons for security-critical operations
- Avoid hardcoding secrets or API keys

### Cryptography

- Use well-established algorithms (AES-256, HKDF, PBKDF2)
- Don't implement custom crypto; use proven libraries
- Validate all cryptographic operations
- Document cryptographic design decisions

### Code Review

- All code changes require review before merging
- Security-critical changes require additional scrutiny
- Be respectful and constructive in reviews

---

## Pull Request Process

1. **Ensure Tests Pass**
   ```bash
   pnpm test
   tsc --noEmit
   pnpm lint
   ```

2. **Update Documentation**
   - Update README if needed
   - Add/update code comments
   - Update CHANGELOG

3. **Create Pull Request**
   - Use a descriptive title
   - Reference related issues
   - Provide clear description of changes
   - Include screenshots/videos if applicable

4. **Respond to Feedback**
   - Address review comments
   - Make requested changes
   - Push updates to your branch

5. **Merge**
   - Once approved, your PR will be merged
   - Your contribution will be credited

---

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Expo CLI
- iOS Simulator or Android Emulator

### Installation

```bash
# Clone repository
git clone https://github.com/tsvaultkeysafe/app.git
cd tsvaultkeysafe

# Install dependencies
pnpm install

# Start development server
pnpm start
```

### Common Commands

```bash
# Start dev server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android

# Run tests
pnpm test

# Type check
tsc --noEmit

# Format code
pnpm format

# Lint code
pnpm lint
```

---

## Commit Message Guidelines

Use clear, descriptive commit messages:

```
feat: Add QR code scanner for license cards
fix: Resolve clipboard auto-clear timing issue
docs: Update encryption design documentation
test: Add unit tests for PIN hashing
refactor: Simplify product search logic
chore: Update dependencies
```

Format: `<type>: <subject>`

Types:
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `test` — Tests
- `refactor` — Code refactoring
- `chore` — Maintenance

---

## Questions?

- **Documentation:** See [README_PROJECT.md](./README_PROJECT.md)
- **Issues:** Create an issue on GitHub
- **Email:** support@tsvaultkeysafe.com

---

## License

By contributing to TSVaultKeySafe, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to TSVaultKeySafe! 🎉
