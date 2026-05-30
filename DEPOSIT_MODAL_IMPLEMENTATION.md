# Deposit to Pool Modal - Auto-Calculation Implementation

## Summary
Implemented bidirectional auto-calculation of deposit amounts based on liquidity pool reserves ratio in the "Deposit to Pool" modal. When a user types an amount in one field, the other field automatically calculates based on the current pool reserves.

## Implementation Details

### 1. **New State Variables**
```typescript
const [poolReserves, setPoolReserves] = useState<{ reserveA: number; reserveB: number } | null>(null);
const [reservesLoading, setReservesLoading] = useState(false);
const [reservesError, setReservesError] = useState<string | null>(null);
const [editingField, setEditingField] = useState<'amountA' | 'amountB' | null>(null);
```

- **poolReserves**: Stores the current reserves ratio from the liquidity pool
- **reservesLoading**: Tracks loading state while fetching reserves
- **reservesError**: Stores error messages for edge cases (zero reserves, fetch failures)
- **editingField**: Tracks which field the user is currently editing to prevent circular updates

### 2. **Fetch Pool Reserves**
When the deposit modal opens with a selected pool:
- Calls `getLiquidityPoolDetails()` to fetch current pool reserves
- Extracts reserveA and reserveB from the response
- Handles edge cases:
  - Zero reserves: Shows warning message, allows manual entry
  - Fetch failures: Shows error, allows manual entry
  - Loading state: Shows spinner while fetching

### 3. **Bidirectional Auto-Calculation**

**When amountA is edited:**
```typescript
amountB = amountA × (reserveB / reserveA)
```

**When amountB is edited:**
```typescript
amountA = amountB × (reserveA / reserveB)
```

- Uses `editingField` flag to only calculate the non-edited field
- Validates input (no NaN, positive numbers only)
- Results are formatted to 7 decimal places for precision

### 4. **Enhanced Modal UI**

**Displays:**
- Loading spinner while fetching reserves
- Pool reserve ratio display when available
- Warning message if pool has zero reserves or fetch fails
- "Editing"/"Auto" indicators showing which field is being manually entered vs auto-calculated
- Disabled input fields during reserve loading

**Input Behavior:**
- `onBlur` clears the `editingField` flag to prepare for next input
- Bidirectional calculation works symmetrically
- Manual override works - users can type in either field

### 5. **Form Reset**
When the deposit modal closes or another pool is selected:
- Clears amountA and amountB
- Resets editingField to null
- Resets pool reserves state

## Edge Case Handling

| Scenario | Behavior |
|----------|----------|
| Zero pool reserves | Shows warning "Pool has zero reserves - manual entry required"; disables auto-calculation |
| Failed to fetch reserves | Shows warning "Failed to fetch pool reserves"; allows manual entry |
| User types invalid number | Clears the auto-calculated field (NaN detection) |
| User types 0 or negative | Clears the auto-calculated field |
| Fetch in progress | Input fields disabled; loading spinner shown |

## User Experience

1. User opens deposit modal for a pool
2. Spinner briefly shows while reserves are fetched
3. User types amount in "Amount A" field → "Amount B" auto-calculates
4. User can then type in "Amount B" → "Amount A" auto-calculates (or vice versa)
5. Both values maintain proper ratio based on pool reserves
6. User confirms deposit with auto-calculated values

## Technical Notes

- Uses existing `getLiquidityPoolDetails()` function from stellar-utils
- No new dependencies added
- Leverages React hooks for state management (useState, useEffect)
- Prevents circular updates with `editingField` flag
- Non-blocking error handling (user can still input manually)
