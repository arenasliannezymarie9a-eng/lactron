

# Fix BatchHistoryModal Detail View Scrolling

## Problem

The detail view (showing batch info, molecular fingerprint, grade, and shelf life) is not scrollable. The `h-full` on the `motion.div` children inside `AnimatePresence` doesn't properly inherit the constrained height from the `flex-1` parent, so the content overflows without enabling scroll.

## Solution

Move the scroll behavior to the outer flex-1 container itself instead of relying on nested `h-full overflow-y-auto` children. This is more robust because it removes the dependency on `h-full` resolving correctly through AnimatePresence.

## File Change

**`src/components/dashboard/BatchHistoryModal.tsx`**

1. **Line 107** - Change the content wrapper from `overflow-hidden` to `overflow-y-auto`:
   - From: `className="flex-1 overflow-hidden min-h-0"`
   - To: `className="flex-1 overflow-y-auto min-h-0"`

2. **Line 121** - Remove redundant scroll classes from the list view:
   - From: `className="h-full overflow-y-auto pr-2 space-y-3 pb-2"`
   - To: `className="space-y-3 pb-2"`

3. **Line 197** - Remove redundant scroll classes from the detail view:
   - From: `className="h-full overflow-y-auto pr-2 pb-2"`
   - To: `className="pb-4"`

This moves scrolling to a single parent container that has a guaranteed constrained height via `flex-1 min-h-0`, making both the list view and detail view scrollable without relying on nested height inheritance.

