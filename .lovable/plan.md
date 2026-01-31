

# Dashboard UX Refactor Plan

## Overview

This plan addresses the usability issues with the current dashboard by introducing a clear, guided workflow for batch management and milk quality analysis. The main problems are:

1. **No clear starting point** - Users see results immediately without understanding what to do first
2. **Batch creation is hidden** - Users must find it in the profile dropdown menu
3. **No batch selection** - Users can't switch between batches or see existing ones
4. **Database sync issues** - Batches created don't appear due to missing refresh after creation

---

## Solution: Guided Dashboard with Batch Management Panel

The refactored dashboard will have two states:

```text
+------------------------------------------------------------------+
|                     EMPTY STATE (No Batch)                        |
+------------------------------------------------------------------+
|  [Nav Bar with Logo + Profile Menu]                              |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |              Welcome Card (Full Width)                      |  |
|  |                                                            |  |
|  |     "Start by creating or selecting a batch"               |  |
|  |                                                            |  |
|  |     [+ Create New Batch]     [Select Existing Batch v]     |  |
|  |                                                            |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  (Sensor cards and status hero are hidden or greyed out)        |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|                   ACTIVE STATE (Batch Selected)                   |
+------------------------------------------------------------------+
|  [Nav Bar]                                                       |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | Batch Selector Strip                                        |  |
|  | [LAC-2025-001 v]  Collector: John  |  Time: Jan 31, 09:00  |  |
|  |                                 [+ New]  [Save]  [History] |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  [Status Hero - Good/Spoiled]                                    |
|                                                                  |
|  +----------------------------+  +---------------------------+   |
|  |  Molecular Fingerprint     |  |  Shelf Life Card          |   |
|  |  (Sensor Charts)           |  |  (Prediction + Tips)      |   |
|  +----------------------------+  +---------------------------+   |
+------------------------------------------------------------------+
```

---

## Components to Create/Modify

### 1. NEW: Batch Selector Component
**File:** `src/components/dashboard/BatchSelector.tsx`

A dropdown/strip component that:
- Shows currently selected batch with key info
- Allows switching between existing batches
- Has quick action buttons: Create New, Save, View History
- Displays empty state when no batches exist

### 2. NEW: Welcome State Component
**File:** `src/components/dashboard/WelcomeState.tsx`

Displayed when no batch is selected:
- Clean, welcoming design matching the LACTRON branding
- Two primary actions: "Create New Batch" or "Select Existing"
- Brief explanation of the workflow

### 3. MODIFY: Dashboard Page
**File:** `src/pages/Dashboard.tsx`

Changes:
- Add conditional rendering based on whether a batch is selected
- Add batch selector component below the nav
- Move quick actions from profile dropdown to batch selector strip
- Fix immediate data refresh after batch creation
- Add loading states for better feedback

### 4. MODIFY: Create Batch Modal
**File:** `src/components/dashboard/CreateBatchModal.tsx`

Changes:
- On successful creation, immediately select the new batch
- Force refresh of batch list after creation
- Close modal and transition to active state smoothly

### 5. MODIFY: Profile Dropdown
**File:** `src/components/dashboard/ProfileDropdown.tsx`

Changes:
- Simplify to only contain: Greeting, Theme Toggle, Logout
- Remove Add Batch/Save Batch (moved to batch selector strip)
- Batch History stays as a secondary access point

---

## User Flow After Changes

1. **Login** - User arrives at dashboard
2. **Empty State** - Dashboard shows welcome card if no batches
3. **Create/Select** - User creates new batch or selects existing one
4. **Active Monitoring** - Dashboard shows full sensor data and predictions
5. **Switch Batches** - User can switch between batches using the selector
6. **Save to History** - When analysis is complete, save batch
7. **View History** - Access saved records anytime

---

## Data Synchronization Fixes

### Problem: Batches Not Showing
The `loadBatches` function in Dashboard.tsx has a dependency issue that prevents proper refresh.

### Fix:
```typescript
// Before: Has dependency that prevents update
const loadBatches = useCallback(async () => {
  const response = await batchAPI.getAll();
  if (response.success && response.data) {
    setBatches(response.data);
    if (response.data.length > 0 && !currentBatch) { // Problem: checks currentBatch
      setCurrentBatch(response.data[0]);
    }
  }
}, [currentBatch]); // This dependency causes issues

// After: Force update and proper selection
const loadBatches = useCallback(async (selectLatest = false) => {
  const response = await batchAPI.getAll();
  if (response.success && response.data) {
    setBatches(response.data);
    if (selectLatest && response.data.length > 0) {
      setCurrentBatch(response.data[0]); // Select the newest batch
    }
  }
}, []); // No dependency on currentBatch
```

### After Batch Creation:
```typescript
// In CreateBatchModal, after successful creation:
onBatchCreated(true); // Signal to select the new batch

// In Dashboard:
const handleBatchCreated = async (selectNew: boolean) => {
  await loadBatches(selectNew);
};
```

---

## Technical Implementation Details

### BatchSelector Component Structure:

```typescript
interface BatchSelectorProps {
  batches: Batch[];
  currentBatch: Batch | null;
  onSelectBatch: (batch: Batch) => void;
  onCreateNew: () => void;
  onSaveBatch: () => void;
  onViewHistory: () => void;
  isSaving: boolean;
}
```

Key features:
- Radix UI Select component for batch dropdown
- Shows batch count badge
- Displays selected batch's metadata inline
- Quick action buttons on the right side

### WelcomeState Component Structure:

```typescript
interface WelcomeStateProps {
  onCreateBatch: () => void;
  onSelectBatch: () => void;
  hasBatches: boolean;
}
```

Features:
- Animated entrance with Framer Motion
- LACTRON logo and branding
- Clear call-to-action buttons
- Subtle background matching the design system

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/dashboard/BatchSelector.tsx` | Batch dropdown + quick actions strip |
| `src/components/dashboard/WelcomeState.tsx` | Empty state welcome card |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Add conditional rendering, batch selection logic, fix refresh |
| `src/components/dashboard/CreateBatchModal.tsx` | Add callback to select new batch after creation |
| `src/components/dashboard/ProfileDropdown.tsx` | Simplify menu, remove batch actions |
| `src/components/dashboard/MetaStrip.tsx` | Remove duplicate display (merged into BatchSelector) |

---

## Summary of Benefits

- **Clear starting point** - Users know exactly what to do first
- **Easy batch access** - Visible dropdown for switching batches
- **Proper data sync** - Immediate refresh after creating batches
- **Streamlined workflow** - Logical progression from create to monitor to save
- **Reduced confusion** - Actions are where users expect them
- **Maintains existing design** - Uses glassmorphism and LACTRON branding consistently

