# PWA Metadata & Theme Configuration

## Overview
Updated the Stellar Lumens Multiwallet application with comprehensive PWA support, custom wallet branding, and dark blue theme integration for seamless full-screen PWA mode.

## Changes Made

### 1. **Application Metadata** (`app/layout.tsx`)

#### Enhanced Metadata Object
```typescript
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Stellar Lumens Multiwallet',
  description: 'Non-custodial Stellar multiwallet with DEX and portfolio tracking',
  generator: 'v0.app',
  
  // Icon configuration for light/dark modes
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
  
  // Open Graph configuration for social media sharing
  openGraph: {
    title: 'Stellar Lumens Multiwallet',
    description: 'Non-custodial Stellar multiwallet with DEX and portfolio tracking',
    url: '/',
    type: 'website',
    images: [
      {
        url: '/wallet-logo.png',
        width: 512,
        height: 512,
        alt: 'Stellar Lumens Multiwallet Logo',
      },
    ],
  },
  
  // Apple-specific web app configuration
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stellar Lumens Multiwallet',
  },
  
  // Disable automatic phone number detection
  formatDetection: {
    telephone: false,
  },
  
  // PWA manifest file reference
  manifest: '/manifest.webmanifest',
}
```

#### Viewport Configuration
```typescript
export const viewport = {
  themeColor: '#0a0e27',        // Dark blue palette for status bar
  userScalable: false,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}
```

### 2. **PWA Manifest File** (`public/manifest.webmanifest`)

Created a comprehensive Web App Manifest with:

#### Core PWA Configuration
- **Name**: Stellar Lumens Multiwallet
- **Short Name**: XLM Wallet
- **Display Mode**: `standalone` (full-screen PWA mode)
- **Theme Color**: `#0a0e27` (dark blue - matches wallet interface)
- **Background Color**: `#0a0e27` (consistent with theme)
- **Orientation**: `portrait-primary`

#### Icons
- **512x512 PNG**: Primary wallet logo (for home screen and splashscreens)
- **512x512 Maskable**: For adaptive icons on Android 8.0+
- **32x32 Icons**: Light and dark variants for browser tabs

#### App Shortcuts (Quick Actions)
1. **Portfolio** - View Stellar asset portfolio and balances
   - URL: `/?shortcut=portfolio`
2. **Trade** - Trade assets on the Stellar DEX
   - URL: `/exchange?shortcut=trade`
3. **Pools** - Deposit or withdraw from liquidity pools
   - URL: `/pools?shortcut=pools`
4. **History** - View transaction history
   - URL: `/history?shortcut=history`

#### Screenshots
- Wide format: 512x512 for tablet/desktop displays
- Narrow format: 192x192 for mobile displays

#### Metadata
- **Category**: finance
- **Scope**: Root path `/`
- **Start URL**: Root path `/`

### 3. **Wallet Logo Asset** (`public/wallet-logo.png`)

Generated a professional cryptocurrency wallet logo featuring:
- Dark blue gradient background (#0a0e27) - matches wallet interface
- Glowing XLM symbol for visual appeal
- 512x512 resolution suitable for:
  - PWA home screen icons
  - Open Graph social media sharing
  - App splashscreens
  - Various Android adaptive icon formats

## Key Features

### PWA Support
- **Standalone Display**: App runs in full-screen mode without browser chrome
- **App Shortcuts**: Quick access to key features from home screen long-press menu
- **Offline Support**: Manifest enables service worker installation
- **Installable**: "Add to Home Screen" prompts on compatible devices

### Theme Integration
- **Status Bar Blending**: `theme-color: #0a0e27` ensures status bar matches wallet's dark blue interface in PWA mode
- **Black Translucent Status Bar**: Apple-specific configuration for seamless iOS integration
- **Consistent Branding**: Logo and theme colors unified across all touchpoints

### Responsive Design
- **Dark Mode Support**: Icon variants for light/dark system preferences
- **Adaptive Icons**: Maskable icon format for Android 8.0+ adaptive icon system
- **Multiple Sizes**: Icons optimized for tabs (32x32), home screens (512x512), and splashscreens

### SEO & Social Media
- **Open Graph Images**: Wallet logo used for social media previews
- **Metadata Base URL**: Dynamic URL configuration for environment-specific sharing
- **Apple Web App**: Full iOS support with custom title and status bar styling

## Browser & Device Support

### Full Support
- Chrome/Edge (all versions with PWA support)
- Safari iOS 15+ (limited PWA)
- Samsung Internet
- Firefox (Linux/Windows PWA)

### Partial Support
- Opera
- UC Browser
- Other Chromium-based browsers

## Files Modified

1. **app/layout.tsx**
   - Enhanced Metadata object with OpenGraph, Apple Web App, and PWA configuration
   - Updated Viewport configuration with device parameters
   - Added metadataBase for dynamic URL resolution

2. **public/manifest.webmanifest** (New)
   - Complete PWA Web App Manifest with 4 app shortcuts
   - Icon declarations for various sizes and purposes
   - Screenshot definitions for app store listings
   - Theme and display configuration

3. **public/wallet-logo.png** (New)
   - Professional wallet branding asset
   - 512x512 resolution with dark blue theme

## Testing Checklist

- [ ] Build completes without errors
- [ ] Manifest is valid JSON
- [ ] Logo displays correctly in public folder
- [ ] Home screen "Add to Home Screen" prompt appears on mobile
- [ ] App shortcuts visible on long-press of home screen icon
- [ ] Status bar color (#0a0e27) blends with app interface in PWA mode
- [ ] Open Graph preview works when sharing URL
- [ ] Standalone PWA mode works without browser chrome
- [ ] All shortcuts navigate to correct URLs with parameters

## Environment Variables

Optional - for dynamic URL resolution:
```
NEXT_PUBLIC_SITE_URL=https://stellar-multiwallet.vercel.app
```

If not set, defaults to `http://localhost:3000` for development.
