

# Remove Simulation & Redesign Batch Control Panel

## What Changes

### 1. Remove Simulate Event Completely

Delete all simulation-related code:
- **Dashboard.tsx**: Remove `isSimulating` state, `simulateEvent` function, and all simulation references in polling/auto-save effects
- **ShelfLifeCard.tsx**: Remove `onSimulate`, `isSimulating` props, the simulation mode banner, and the simulate button. Only show "Generate Report" when complete, and nothing when in progress (tips section remains)

### 2. Redesign BatchSelector into a "Batch Control Panel"

Replace the current cramped single-row layout (batch dropdown + metadata + tiny progress bar + button row) with a structured two-section card:

**Top Section -- Batch Identity & Actions**
- Left: Batch dropdown selector with the batch ID
- Right: Action buttons (New, History, Report, Close) as icon buttons with tooltips

**Bottom Section -- Collection Progress (the hero of this card)**
- A prominent, full-width progress bar with gradient coloring
- Large readable text: "12 of 30 Readings Collected" (or "Analysis Complete" with checkmark)
- Below: a compact meta strip showing Collector, Collection Time, and ESP32 status inline
- When complete: the progress bar turns green with a subtle glow effect

This makes the progress bar the visual focal point of the batch panel instead of a tiny afterthought squeezed between buttons.

```text
+---------------------------------------------------------------+
|  [# Batch Dropdown v]              [+New] [History] [X Close] |
|---------------------------------------------------------------|
|                                                                |
|  ████████████████████░░░░░░░░░░░░  12 of 30 Readings          |
|                                                                |
|  Collector: Juan    |  Collected: Feb 18, 2026  |  ESP32: On  |
+---------------------------------------------------------------+

When complete:
+---------------------------------------------------------------+
|  [# LAC-2026-0012 v]         [+New] [Report] [History] [Close]|
|---------------------------------------------------------------|
|                                                                |
|  ✓ Analysis Complete -- 30 / 30 Readings                      |
|  ████████████████████████████████  (green glow)                |
|                                                                |
|  Collector: Juan    |  Collected: Feb 18, 2026  |  ESP32: On  |
+---------------------------------------------------------------+
```

## Files to Change

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Dashboard.tsx` | Modify | Remove `isSimulating`, `simulateEvent`, remove simulation refs from effects, remove simulation props from ShelfLifeCard |
| `src/components/dashboard/ShelfLifeCard.tsx` | Modify | Remove simulation props/banner/button, simplify to just shelf life display + tips + report button |
| `src/components/dashboard/BatchSelector.tsx` | Modify | Full redesign: two-section layout with prominent progress bar, compact meta strip, cleaner button arrangement |

## Technical Details

### Dashboard.tsx Cleanup

Remove these items:
- `const [isSimulating, setIsSimulating] = useState(false)` (line 46)
- The entire `simulateEvent` function (lines 185-201)
- `!isSimulating` conditions in polling effect (line 124) and auto-save effect (line 138)
- `onSimulate={simulateEvent}` and `isSimulating={isSimulating}` props on ShelfLifeCard (lines 301, 303)

### ShelfLifeCard.tsx Cleanup

- Remove `onSimulate`, `isSimulating` from props interface
- Remove simulation mode banner (lines 62-76)
- Remove the simulate button branch (lines 173-184) -- when not complete, show nothing (or a subtle "Collecting..." label)
- Keep the "Generate Report" button when `isComplete`

### BatchSelector.tsx Redesign

Restructure into two rows inside the glass card:
- **Row 1**: Batch selector (left) + action buttons (right), clean and minimal
- **Row 2**: Full-width progress section with large progress bar, percentage/count text, and a completion state with green styling and checkmark animation
- **Row 3**: Compact meta strip (Collector, Time, ESP32 status) with subtle dividers

The progress bar will use a custom gradient (primary color) with increased height (`h-3` instead of `h-2`) and rounded corners. When complete, it switches to a green success color with a subtle pulse animation on the checkmark icon.
