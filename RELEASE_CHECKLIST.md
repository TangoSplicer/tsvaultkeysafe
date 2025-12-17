# TSVaultKeySafe — Release Checklist

## Pre-Release Verification

### Code Quality

- [ ] All TypeScript errors resolved (`tsc --noEmit`)
- [ ] All ESLint warnings fixed
- [ ] No console errors or warnings in development
- [ ] No deprecated API usage
- [ ] Code formatted consistently (`prettier --write .`)
- [ ] All imports are used and optimized

### Testing

- [ ] Unit tests passing (100% coverage for crypto and auth)
- [ ] Integration tests passing
- [ ] Manual testing completed on iOS and Android
- [ ] All user flows tested end-to-end
- [ ] Error handling tested
- [ ] Edge cases tested

### Security

- [ ] Encryption/decryption working correctly
- [ ] PIN hashing and verification working
- [ ] Biometric authentication working
- [ ] Rate limiting working (3 attempts → 30s lockout)
- [ ] Auto-lock timeout working
- [ ] Clipboard auto-clear working
- [ ] Screenshot blocking working
- [ ] No sensitive data in logs
- [ ] No hardcoded secrets or API keys
- [ ] No analytics or tracking code

### Performance

- [ ] App startup time < 3 seconds
- [ ] List scrolling smooth (60 FPS)
- [ ] Search responds in < 500ms
- [ ] Encryption/decryption fast enough
- [ ] Memory usage reasonable
- [ ] No memory leaks detected
- [ ] Bundle size optimized

### Accessibility

- [ ] All interactive elements have minimum 44pt touch target
- [ ] Color contrast meets WCAG AA standard (4.5:1)
- [ ] Text size minimum 14pt for body text
- [ ] VoiceOver/TalkBack labels present
- [ ] Haptic feedback working
- [ ] No flashing or rapid animations

### Documentation

- [ ] README.md complete and accurate
- [ ] BUILD_INSTRUCTIONS.md complete
- [ ] THREAT_MODEL.md complete and reviewed
- [ ] ENCRYPTION_DESIGN.md complete and reviewed
- [ ] API documentation complete
- [ ] Code comments clear and helpful
- [ ] Changelog updated

---

## Version Management

### Update Version Numbers

```bash
# Update version in app.config.ts
# Update version in package.json
# Update version in CHANGELOG.md

# Example: v1.0.0 → v1.0.1
```

### Version Format

Use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes
- **MINOR:** New features
- **PATCH:** Bug fixes

---

## Build Preparation

### Android Build

- [ ] Update `versionCode` in `app.config.ts`
- [ ] Update `versionName` in `app.config.ts`
- [ ] Generate signed APK/AAB
- [ ] Test APK on multiple Android versions (API 31+)
- [ ] Test on various screen sizes
- [ ] Verify app signing certificate

### iOS Build

- [ ] Update `buildNumber` in `app.config.ts`
- [ ] Update `version` in `app.config.ts`
- [ ] Generate signed IPA
- [ ] Test on multiple iOS versions (14+)
- [ ] Test on various screen sizes
- [ ] Verify code signing certificate

---

## Store Listing Preparation

### Google Play Store

- [ ] App name finalized
- [ ] Short description (80 characters max)
- [ ] Full description (4000 characters max)
- [ ] Screenshots (5-8 images, 1080x1920px)
- [ ] Feature graphic (1024x500px)
- [ ] Icon (512x512px)
- [ ] Content rating completed
- [ ] Privacy policy URL set
- [ ] Support email configured
- [ ] Pricing and distribution configured
- [ ] Release notes written

### Apple App Store

- [ ] App name finalized
- [ ] Subtitle (30 characters max)
- [ ] Description (4000 characters max)
- [ ] Screenshots (5-8 images, 1170x2532px for iPhone)
- [ ] Preview video (optional)
- [ ] App icon (1024x1024px)
- [ ] Privacy policy URL set
- [ ] Support URL set
- [ ] Support email configured
- [ ] Pricing and distribution configured
- [ ] Release notes written

---

## Compliance Verification

### Data Privacy

- [ ] Privacy policy reviewed and accurate
- [ ] No personal data collection
- [ ] No cloud sync or backup (offline-only)
- [ ] No analytics or tracking
- [ ] No third-party SDKs with tracking
- [ ] GDPR compliant
- [ ] CCPA compliant

### App Store Compliance

#### Google Play

- [ ] No prohibited permissions requested
- [ ] Data Safety form completed
- [ ] No ads or ad SDKs
- [ ] No malware or spyware
- [ ] Complies with Play Store policies
- [ ] Content rating appropriate

#### Apple App Store

- [ ] Privacy label accurate
- [ ] No prohibited APIs used
- [ ] No ads or ad SDKs
- [ ] Complies with App Store Review Guidelines
- [ ] Content rating appropriate
- [ ] Export compliance checked (encryption)

### Security

- [ ] Encryption properly disclosed
- [ ] No backdoors or vulnerabilities
- [ ] Threat model documented
- [ ] Security best practices followed
- [ ] Root/jailbreak detection implemented

---

## Final Checks

### Device Testing

- [ ] Tested on iPhone (latest 2 versions)
- [ ] Tested on Android (API 31, 33, 34)
- [ ] Tested on various screen sizes
- [ ] Tested with slow network
- [ ] Tested with no network (offline)
- [ ] Tested with low battery
- [ ] Tested with low storage

### User Flows

- [ ] First-time setup works
- [ ] PIN setup and verification works
- [ ] Biometric setup and authentication works
- [ ] Product creation works
- [ ] Product editing works
- [ ] Product deletion works
- [ ] Search and filtering works
- [ ] Export/import works
- [ ] Auto-lock works
- [ ] Clipboard auto-clear works
- [ ] Settings changes persist

### Error Scenarios

- [ ] Network error handled gracefully
- [ ] Storage error handled gracefully
- [ ] Encryption error handled gracefully
- [ ] Invalid data handled gracefully
- [ ] App crash recovery works
- [ ] Data corruption detected and reported

---

## Release Day

### Pre-Release

- [ ] Final build generated and tested
- [ ] Build signed correctly
- [ ] Build uploaded to stores
- [ ] Store listings reviewed one final time
- [ ] Release notes reviewed
- [ ] Team notified of release

### During Release

- [ ] Monitor crash reports
- [ ] Monitor user reviews
- [ ] Monitor error logs
- [ ] Be available for support

### Post-Release

- [ ] Announce release on social media
- [ ] Send release email to users
- [ ] Monitor app store reviews
- [ ] Monitor crash reports for 24 hours
- [ ] Prepare hotfix if needed

---

## Post-Release Monitoring

### First 24 Hours

- [ ] Check crash reports every hour
- [ ] Monitor user reviews
- [ ] Monitor support emails
- [ ] Check error logs
- [ ] Verify all features working

### First Week

- [ ] Analyze user feedback
- [ ] Monitor performance metrics
- [ ] Check for security issues
- [ ] Prepare next release

### Ongoing

- [ ] Monitor app store reviews
- [ ] Monitor crash reports
- [ ] Respond to user feedback
- [ ] Plan next release

---

## Rollback Plan

If critical issues are discovered:

1. **Immediate Actions**
   - Disable auto-update if possible
   - Prepare hotfix build
   - Notify users of issue

2. **Hotfix Build**
   - Create hotfix branch
   - Fix critical issue
   - Test thoroughly
   - Build and sign

3. **Re-Release**
   - Submit hotfix to stores
   - Update release notes
   - Notify users

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | ________ | ________ | ________ |
| QA Lead | ________ | ________ | ________ |
| Product Manager | ________ | ________ | ________ |
| Security Lead | ________ | ________ | ________ |

---

## Notes

_Use this section for any additional notes or concerns about this release._

---

## Appendix: Quick Commands

```bash
# Check for TypeScript errors
tsc --noEmit

# Run tests
pnpm test

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Submit to Play Store
eas submit --platform android

# Submit to App Store
eas submit --platform ios

# View logs
adb logcat  # Android
xcrun simctl spawn booted log stream  # iOS

# Clean build
rm -rf node_modules && pnpm install
```
