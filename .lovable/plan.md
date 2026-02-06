

# Fix Simulation Mode Persistence

## Problem

When you click "Simulate Event", the simulated sensor values and status are immediately overwritten by the auto-refresh (every 5 seconds) which fetches real data from the backend.

```text
Timeline:
0s    - Click "Simulate Event" → UI shows spoiled state
5s    - Auto-refresh runs → loadSensorHistory() overwrites with real data
      - Simulated state disappears
```

## Solution

Add a "simulation mode" flag that:
1. Pauses auto-refresh while simulation is active
2. Shows a clear indicator that simulation is running
3. Provides a way to exit simulation and resume real-time data

## User Experience

```text
+------------------------------------------+
|  [!] SIMULATION MODE                     |
|      Click "Exit Simulation" to resume   |
|      real-time monitoring                |
+------------------------------------------+
```

When simulation is active:
- Auto-refresh pauses (no API calls)
- Simulated data displays
- Clear visual indicator shows simulation is running
- "Simulate Event" button changes to "Exit Simulation"

When user exits simulation:
- Auto-refresh resumes
- Real data loads immediately
- Button reverts to "Simulate Event"

## Code Changes

### File: `src/pages/Dashboard.tsx`

**Add new state variable:**
```typescript
const [isSimulating, setIsSimulating] = useState(false);
```

**Update auto-refresh logic to skip when simulating:**
```typescript
useEffect(() => {
  if (currentBatch && !isSimulating) {  // Skip refresh during simulation
    loadSensorHistory();
    const interval = setInterval(loadSensorHistory, 5000);
    return () => clearInterval(interval);
  }
}, [currentBatch, loadSensorHistory, isSimulating]);
```

**Update simulateEvent function to toggle mode:**
```typescript
const simulateEvent = () => {
  if (isSimulating) {
    // Exit simulation - reload real data
    setIsSimulating(false);
    loadSensorHistory();
  } else {
    // Enter simulation mode
    setIsSimulating(true);
    if (status === "good") {
      setStatus("spoiled");
      setSensorData({ ethanol: 85, ammonia: 70, h2s: 95 });
      setShelfLife(0.2);
    } else {
      setStatus("good");
      setSensorData({ ethanol: 15, ammonia: 10, h2s: 5 });
      setShelfLife(4.8);
    }
  }
};
```

**Pass simulation state to ShelfLifeCard:**
```typescript
<ShelfLifeCard
  days={shelfLife}
  status={status}
  batch={currentBatch}
  onSimulate={simulateEvent}
  isSimulating={isSimulating}  // New prop
/>
```

### File: `src/components/dashboard/ShelfLifeCard.tsx`

**Update props interface:**
```typescript
interface ShelfLifeCardProps {
  days: number;
  status: "good" | "spoiled";
  batch: Batch | null;
  onSimulate: () => void;
  isSimulating?: boolean;  // New prop
}
```

**Add simulation indicator and update button:**
```typescript
const ShelfLifeCard = ({ days, status, batch, onSimulate, isSimulating = false }) => {
  // ... existing code ...

  return (
    <motion.div className="glass-card rounded-3xl p-6 flex flex-col h-full">
      {/* Simulation Mode Banner */}
      {isSimulating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center"
        >
          <p className="text-amber-500 font-semibold text-sm flex items-center justify-center gap-2">
            <Activity className="w-4 h-4 animate-pulse" />
            SIMULATION MODE
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Auto-refresh paused. Click below to resume real-time data.
          </p>
        </motion.div>
      )}

      {/* ... rest of card content ... */}

      {/* Updated button */}
      <Button
        variant={isSimulating ? "default" : "outline"}
        onClick={onSimulate}
        className={`flex-1 rounded-xl h-11 hover:scale-[1.02] transition-transform ${
          isSimulating ? "bg-amber-500 hover:bg-amber-600" : ""
        }`}
      >
        <Activity className="w-4 h-4 mr-2" />
        {isSimulating ? "Exit Simulation" : "Simulate Event"}
      </Button>
    </motion.div>
  );
};
```

## Behavior Summary

| State | Auto-refresh | Button Text | Banner |
|-------|--------------|-------------|--------|
| Normal | Every 5s | "Simulate Event" | Hidden |
| Simulating | Paused | "Exit Simulation" | Shown (amber) |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Add `isSimulating` state, update effect and handler |
| `src/components/dashboard/ShelfLifeCard.tsx` | Add banner, update button styling |

