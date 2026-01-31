

# LACTRON Database Schema Optimization and UX Improvements

## Issues Identified

### 1. Database Schema Redundancy
The current schema has two tables storing batch information:

| Table | Purpose | Fields |
|-------|---------|--------|
| `batches` | Active monitoring batches | batch_id, user_id, collector_name, collection_datetime, status |
| `batch_history` | Saved/archived analysis results | batch_id, user_id, collector_name, collection_datetime, ethanol, ammonia, h2s, grade, shelf_life |

**Analysis**: This is NOT redundant. The design is intentional:
- `batches` = Active work items (what you're currently monitoring)
- `batch_history` = Completed snapshots (saved analysis results with sensor data at that moment)

However, there's a minor issue: `sensor_readings` already stores individual sensor readings linked to batches, but `batch_history` stores a single snapshot. This is acceptable for the "save final result" workflow.

**Recommendation**: Keep current schema but ensure clear workflow separation.

### 2. Login Session Persistence Missing
Currently, when users reload the page:
- The frontend does not check for existing PHP sessions
- Users are redirected to login every time
- No session validation on initial load

### 3. UI: Batches Not Showing in Dropdown
The `WelcomeState` and `BatchSelector` components receive batches from the API, but:
- If the PHP backend returns batches from a different user, they won't show
- If session expires, the API returns "Not authenticated" and frontend shows empty list
- No loading state feedback when batches are being fetched

### 4. UI: No Back Button from Batch View
When a batch is selected, users cannot deselect it to return to the Welcome state.

---

## Proposed Solution

### Phase 1: Session Persistence (PHP + Frontend)

**PHP Changes** (`backend/php/api/auth.php`):
- Already has `check` action that validates session
- No changes needed on PHP side

**Frontend Changes** (`src/pages/Index.tsx` and `src/pages/Dashboard.tsx`):
- Add session check on initial load
- If authenticated, redirect to dashboard
- If not authenticated on dashboard, redirect to login

```text
                         +-------------------+
                         |   App Loads (/)   |
                         +--------+----------+
                                  |
                         Check PHP Session
                         (authAPI.checkSession)
                                  |
                    +-------------+-------------+
                    |                           |
              Authenticated              Not Authenticated
                    |                           |
                    v                           v
            Redirect to              Show Login Page
            /dashboard
```

### Phase 2: Dashboard Batch Loading Fix

**Root Cause**: The `loadBatches` function works, but:
1. Session may not be valid (user not logged in or session expired)
2. No error handling shown to user when API fails

**Fix**:
- Add authentication check before loading batches
- Show toast error if session is invalid
- Redirect to login if not authenticated

### Phase 3: Back Button from Batch View

**Add a "Close Batch" button** to `BatchSelector`:
- Clicking it sets `currentBatch` to `null`
- Returns user to the Welcome state
- Simple UX improvement

---

## Detailed Implementation Plan

### File: `src/pages/Index.tsx`
Add session check on mount:
- Call `authAPI.checkSession()` when page loads
- If successful, navigate to `/dashboard`
- If failed, show the Auth page normally

### File: `src/pages/Dashboard.tsx`
Add authentication guard:
- On mount, call `authAPI.checkSession()`
- If not authenticated, redirect to `/` (login page)
- Add loading state while checking session
- Pass `onCloseBatch` handler to `BatchSelector`

### File: `src/components/dashboard/BatchSelector.tsx`
Add close/back button:
- New prop: `onCloseBatch: () => void`
- Add X or ArrowLeft button to deselect current batch
- Returns user to Welcome state

### File: `src/components/dashboard/WelcomeState.tsx`
Minor enhancements:
- Show loading state if batches are still being fetched
- Add better empty state messaging

---

## Technical Details

### Session Persistence Flow

```text
User Opens App
       |
       v
+------+------+
|  Index.tsx  |
+------+------+
       |
  checkSession()
       |
  +----+----+
  |         |
Success   Failure
  |         |
  v         v
/dashboard  Show Auth
       |
       v
+------+------+
| Dashboard   |
+------+------+
       |
  checkSession()
       |
  +----+----+
  |         |
Success   Failure
  |         |
  v         v
Load      Redirect
Batches   to Login
```

### Code Changes Summary

**`src/pages/Index.tsx`**:
```typescript
// Add session check
useEffect(() => {
  const checkAuth = async () => {
    const response = await authAPI.checkSession();
    if (response.success) {
      navigate('/dashboard');
    }
  };
  checkAuth();
}, [navigate]);
```

**`src/pages/Dashboard.tsx`**:
```typescript
// Add auth check and close batch handler
const [isAuthChecking, setIsAuthChecking] = useState(true);

useEffect(() => {
  const checkAuth = async () => {
    const response = await authAPI.checkSession();
    if (!response.success) {
      navigate('/');
      return;
    }
    setIsAuthChecking(false);
    loadBatches();
  };
  checkAuth();
}, []);

const handleCloseBatch = () => {
  setCurrentBatch(null);
};
```

**`src/components/dashboard/BatchSelector.tsx`**:
```typescript
// Add new prop and button
interface BatchSelectorProps {
  // ... existing props
  onCloseBatch: () => void;
}

// Add button in the UI
<Button
  variant="ghost"
  size="sm"
  onClick={onCloseBatch}
  className="h-9 rounded-xl"
>
  <X className="w-4 h-4" />
</Button>
```

### Database Schema: No Changes Needed

The current schema is correctly designed:
- `batches`: Active monitoring sessions
- `batch_history`: Saved analysis snapshots
- `sensor_readings`: Time-series sensor data

This separation allows:
1. Creating a batch (just metadata)
2. Receiving sensor readings over time (stored in sensor_readings)
3. Saving a final snapshot (batch_history with current sensor values + grade)

---

## Summary of Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/Index.tsx` | Modify | Add session check, redirect if logged in |
| `src/pages/Dashboard.tsx` | Modify | Add auth guard, loading state, close batch handler |
| `src/components/dashboard/BatchSelector.tsx` | Modify | Add close/back button |
| `vite.config.ts` | Modify | Restore port 8080 (per system requirements) |

No database schema changes are needed - the current design is appropriate for the workflow.

