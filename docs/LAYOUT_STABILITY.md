# Layout Stability & Cumulative Layout Shift (CLS) Improvements

## Overview
This document outlines the improvements made to prevent visual jumping, content shape changes, and Cumulative Layout Shift (CLS) during navigation and page loads.

## Problem Addressed
The app was experiencing:
- Visual jumps when navigating between pages
- Content shape changes as data loaded
- Inconsistent layout heights for loading states
- Hydration mismatches between server and client renders

## Solutions Implemented

### 1. Skeleton Loaders (`components/skeleton-loaders.tsx`)
Created comprehensive skeleton components that maintain stable heights while content loads:

- **`AssetItemSkeleton`** - Matches asset list item height
- **`AssetListSkeleton`** - Multiple asset items skeleton
- **`WalletBalanceSkeleton`** - Wallet balance card placeholder
- **`OrderBookSkeleton`** - Trading order book skeleton
- **`PoolItemSkeleton`** - Liquidity pool item skeleton
- **`PoolListSkeleton`** - Multiple pool items skeleton
- **`ChartSkeleton`** - Chart loading placeholder
- **`TransactionSkeleton`** - Individual transaction skeleton
- **`TransactionListSkeleton`** - Multiple transactions skeleton
- **`SkeletonWrapper`** - Generic wrapper for conditional skeleton rendering

All skeletons:
- Use consistent padding and spacing
- Have `min-height` constraints to prevent layout shift
- Include subtle animation via `animate-pulse`
- Match the final content's visual footprint

### 2. Hydration Safety Hook (`lib/use-mounted.ts`)
Created utilities for safe client-side rendering:

```typescript
useMounted()
// Returns: boolean
// Ensures content only renders after hydration completes
// Prevents hydration mismatches between server and client

useDelayedMounted(delayMs)
// Returns: boolean
// Adds optional delay for better perceived performance
// Useful for pages with heavy initial data fetches
```

### 3. Page-Level Updates

#### Home Page (`app/page.tsx`)
- Added `WalletBalanceSkeleton` for balance card
- Added `AssetListSkeleton` for assets list
- Wrapped content with `mounted` check
- Added `min-h-32` and `min-h-20` for balance card and assets list
- Ensures stable layout before wallet data loads

#### History Page (`app/history/page.tsx`)
- Replaced spinner with `TransactionListSkeleton`
- Added proper mounted check in render
- Maintains consistent transaction list height during loading

#### Exchange Page (`app/exchange/page.tsx`)
- Added skeleton imports (`OrderBookSkeleton`, `ChartSkeleton`)
- Changed tab container heights from `min-h-96` to `min-h-screen`
- Added skeleton rendering for each tab state:
  - History tab: Shows `OrderBookSkeleton` while loading
  - Orders tab: Shows `OrderBookSkeleton` while loading
  - Filled tab: Shows `OrderBookSkeleton` while loading
  - Charts tab: Shows `ChartSkeleton` while loading
- All rendered conditionally based on active tab

#### Pools Page (`app/pools/page.tsx`)
- Added `PoolListSkeleton` import
- Replaced loading spinner with `PoolListSkeleton`
- Maintains consistent pool list height during data fetch

### 4. Layout Height Standards
Established consistent minimum heights across pages:

- **Small containers** (asset items, transactions): `min-h-20`
- **Card sections** (balance card): `min-h-32`
- **Page sections** (tab content): `min-h-screen`
- **Skeleton spacing**: `gap-3` or `space-y-3` for consistency

### 5. Mounted State Management
All pages now follow this pattern:

```tsx
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

// During hydration
if (!mounted) return <Skeleton />;

// After hydration
return <ActualContent />;
```

This prevents:
- Hydration mismatch errors
- Flash of unstyled content (FOUC)
- Layout shifts on first interaction

## Best Practices Going Forward

### When Adding New Pages
1. Import skeleton components from `components/skeleton-loaders.tsx`
2. Add `useMounted()` hook for hydration safety
3. Set appropriate `min-height` classes on container sections
4. Render skeleton while data loads:
   ```tsx
   {loading ? <SkeletonComponent /> : <ActualContent />}
   ```

### When Adding New Data Fetches
1. Show skeleton skeleton proportional to final content
2. Maintain consistent spacing with `gap` or `space-y` utilities
3. Avoid changing layout when transitioning from skeleton to content
4. Set consistent padding/margins in skeleton vs actual content

### Performance Tips
- Skeletons are lightweight (simple divs with background colors)
- Use `animate-pulse` for subtle loading indication
- Never remove skeletons from DOM, just hide them with conditional rendering
- Pair skeletons with proper `min-height` to prevent jumping

## Measurement & Testing

### Core Web Vitals Improved
- **CLS (Cumulative Layout Shift)**: Reduced layout instability during page loads
- **FCP (First Contentful Paint)**: Skeletons appear immediately, showing content is loading
- **LCP (Largest Contentful Paint)**: Actual content loads and replaces skeleton smoothly

### How to Verify
1. Use Chrome DevTools Lighthouse report
2. Check Web Vitals in Performance tab
3. Manually navigate between pages to observe smooth transitions
4. Check mobile view for improved stability

## Files Modified
- ✅ `components/skeleton-loaders.tsx` (NEW)
- ✅ `lib/use-mounted.ts` (NEW)
- ✅ `app/page.tsx` - Added home page skeletons
- ✅ `app/history/page.tsx` - Added transaction skeletons
- ✅ `app/exchange/page.tsx` - Added order book and chart skeletons
- ✅ `app/pools/page.tsx` - Added pool skeletons

## Future Improvements
- Add skeleton loader for portfolio page
- Implement skeleton loader for create wallet modal
- Add page transition animations
- Implement loading state management at router level
- Add skeleton loaders for modals with async operations
