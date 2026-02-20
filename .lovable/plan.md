

# Fix BatchHistoryModal Scrollability

## Problem

The modal uses `flex flex-col` with `max-h-[85vh]`, but the scrollable content area lacks `min-h-0` on the flex child, which prevents `overflow-y-auto` from working in a flex container. Without this, the content overflows the modal instead of scrolling.

## Solution

**File: `src/components/dashboard/BatchHistoryModal.tsx`**

1. **Line 83** -- Add `min-h-0` to the flex-1 overflow container:
   - Change: `className="flex-1 overflow-hidden"`
   - To: `className="flex-1 overflow-hidden min-h-0"`

2. **Line 99** (list view div) -- Ensure scroll container fills available space:
   - Change: `className="h-full overflow-y-auto pr-2 space-y-3"`
   - To: `className="h-full overflow-y-auto pr-2 space-y-3 pb-2"`

3. **Line 155** (detail view div) -- Same fix for the detail scroll container:
   - Change: `className="h-full overflow-y-auto pr-2"`
   - To: `className="h-full overflow-y-auto pr-2 pb-2"`

The key fix is `min-h-0` on the flex child -- by default, flex children have `min-height: auto` which prevents them from shrinking below their content size, breaking overflow scrolling.

