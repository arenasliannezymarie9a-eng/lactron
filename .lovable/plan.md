

# Fix Type Coercion Errors in Sensor Components

## Problem Identified

The errors occur because sensor values from the PHP backend are being returned as **strings** (common with MySQL/PHP JSON responses), but the frontend code assumes they are numbers. Calling `.toFixed()` on a string throws `TypeError: value.toFixed is not a function`.

### Error Locations:
1. **SensorHistoryChart.tsx line 22**: `reading[sensorType]` returns a string from database
2. **SensorHistoryChart.tsx line 62**: Tooltip formatter receives string value, calls `.toFixed(2)`

---

## Solution

### Fix 1: SensorHistoryChart.tsx - Convert Values to Numbers

**File:** `src/components/dashboard/SensorHistoryChart.tsx`

Update the chart data mapping to convert values to numbers:

```typescript
// Line 20-23: Change from
.map((reading) => ({
  time: format(new Date(reading.created_at), "HH:mm:ss"),
  value: reading[sensorType] ?? 0,
}))

// To
.map((reading) => ({
  time: format(new Date(reading.created_at), "HH:mm:ss"),
  value: Number(reading[sensorType]) || 0,
}))
```

Update the Tooltip formatter to handle potential non-number values:

```typescript
// Line 62: Change from
formatter={(value: number) => [`${value.toFixed(2)} ppm`, label]}

// To
formatter={(value: number | string) => [`${Number(value).toFixed(2)} ppm`, label]}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/SensorHistoryChart.tsx` | Add `Number()` conversion in data mapping (line 22) and formatter (line 62) |

---

## Root Cause

PHP's `json_encode()` with MySQL results often returns numeric columns as strings. The frontend must defensively convert these values using `Number()` or `parseFloat()` before performing numeric operations.

---

## Expected Behavior After Fix

- Chart displays sensor history without errors
- Tooltip shows properly formatted values like "45.23 ppm"
- Both SensorCard and SensorHistoryChart handle string-typed values gracefully

