

# Fix Tooltip Clipping in BatchSelector

## Problem

The `glass-card` container on the BatchSelector has `overflow-hidden` (line 72), which clips the Radix UI Tooltip popups. The tooltips render inside this container but need to visually overflow it to be visible.

## Solution

Remove `overflow-hidden` from the BatchSelector card's class list. The rounded corners on the card do not require `overflow-hidden` since the inner sections already have their own backgrounds and borders.

## File Change

**`src/components/dashboard/BatchSelector.tsx`** (line 72)

Change:
```
className="glass-card rounded-2xl mb-5 overflow-hidden"
```
To:
```
className="glass-card rounded-2xl mb-5"
```

This single change allows the tooltips to render above the card boundary so they become visible on hover.

