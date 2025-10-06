# Mobile App Setup Guide

This guide will help you set up and run the Journey Sync mobile app on Android and iOS devices.

## Prerequisites

### For Android Development:
- [Android Studio](https://developer.android.com/studio) (latest version)
- Android SDK (API level 33 or higher)
- Java Development Kit (JDK) 17 or higher
- Android device or emulator

### For iOS Development:
- [Xcode](https://developer.apple.com/xcode/) (latest version)
- macOS (required for iOS development)
- iOS device or simulator
- [CocoaPods](https://cocoapods.org/) (for dependency management)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Web App

```bash
npm run build
```

### 3. Add Mobile Platforms

The platforms have already been added, but if you need to re-add them:

```bash
# Add Android platform
npm run cap:add:android

# Add iOS platform (macOS only)
npm run cap:add:ios
```

### 4. Sync Code with Mobile Platforms

```bash
npm run cap:sync
```

## Development Workflow

### For Android:

1. **Open in Android Studio:**
   ```bash
   npm run cap:open:android
   ```

2. **Run on device/emulator:**
   ```bash
   npm run cap:run:android
   ```

3. **Build and sync changes:**
   ```bash
   npm run cap:build
   ```

### For iOS:

1. **Open in Xcode:**
   ```bash
   npm run cap:open:ios
   ```

2. **Run on device/simulator:**
   ```bash
   npm run cap:run:ios
   ```

3. **Build and sync changes:**
   ```bash
   npm run cap:build
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run cap:sync` - Sync web code with mobile platforms
- `npm run cap:build` - Build and sync in one command
- `npm run cap:open:android` - Open Android project in Android Studio
- `npm run cap:open:ios` - Open iOS project in Xcode
- `npm run cap:run:android` - Run on Android device/emulator
- `npm run cap:run:ios` - Run on iOS device/simulator

## Troubleshooting

### Common Issues:

1. **Build fails with "lovable-tagger" error:**
   - This has been fixed by removing the dependency from vite.config.ts

2. **Android build fails:**
   - Make sure Android Studio is properly installed
   - Check that ANDROID_HOME environment variable is set
   - Ensure you have the correct SDK version installed

3. **iOS build fails:**
   - Make sure Xcode is properly installed
   - Run `pod install` in the ios/App directory
   - Check that you're on macOS

4. **Capacitor sync issues:**
   - Run `npx cap doctor` to check for issues
   - Make sure all dependencies are installed
   - Try `npx cap sync` to force sync

### Platform-Specific Notes:

#### Android:
- Minimum SDK: API 22 (Android 5.1)
- Target SDK: API 33 (Android 13)
- The app will work on Android 5.1 and above

#### iOS:
- Minimum iOS version: 13.0
- The app will work on iOS 13.0 and above
- Requires Xcode 14.0 or later

## Features

The mobile app includes the following native features:

- **Camera Integration** - Take photos and select from gallery
- **Geolocation** - Get current location and track movement
- **Push Notifications** - Receive real-time notifications
- **Local Storage** - Secure data storage using device preferences
- **Splash Screen** - Custom splash screen with app branding
- **Status Bar** - Custom status bar styling
- **Safe Area Support** - Proper handling of device notches and safe areas

## Development Tips

1. **Always sync after making changes:**
   ```bash
   npm run cap:build
   ```

2. **Test on real devices:**
   - Emulators are good for initial testing
   - Real devices provide better performance and feature testing

3. **Use the Capacitor DevTools:**
   - Install the Capacitor DevTools browser extension
   - Helps with debugging and development

4. **Check platform-specific code:**
   - Use `isNative()`, `isAndroid()`, `isIOS()` utilities
   - Handle platform differences gracefully

## Deployment

### Android:
1. Build the app in Android Studio
2. Generate a signed APK or AAB
3. Upload to Google Play Store

### iOS:
1. Archive the app in Xcode
2. Upload to App Store Connect
3. Submit for review

## Support

If you encounter any issues:

1. Check the [Capacitor documentation](https://capacitorjs.com/docs)
2. Review the console logs for error messages
3. Ensure all prerequisites are properly installed
4. Try cleaning and rebuilding the project 