

# Refactor: Days to Hours Shelf Life (Max 72 Hours) + CSV Dataset

## Overview

Convert the entire shelf life system from **days (0-7)** to **hours (0-72)** across the ML model, Flask server, PHP backend fallback, React UI, and simulation values. Also restructure the training script to generate and consume CSV datasets for proper train/validation/test splitting.

## Changes Summary

### 1. `backend/python/train_model.py` - CSV Dataset + Hours Output

- Change shelf life target from **0-7 days** to **0-72 hours**
- Generate training data as a CSV file (`dataset.csv`) with columns: `ethanol, ammonia, h2s, shelf_life_hours`
- Load data from CSV, split into train/validation/test (70/15/15), and save each split as separate CSV files (`train.csv`, `val.csv`, `test.csv`)
- Train the model on the train set, evaluate on validation and test sets
- Print MAE/R2 for all three splits
- Model file stays `shelf_life_model.pkl`
- Update `norm_params.pkl` to include a `unit: 'hours'` field
- Test predictions print hours instead of days

### 2. `backend/python/app.py` - Return Hours

- Update the `predict_shelf_life` function: shelf life output is now in hours (0-72) instead of days (0-7)
- Update fallback formula: `quality_score * 72` instead of `quality_score * 7`
- Update `/test` endpoint expected values to reflect hours (e.g., "fresh (~45-50 hours)")
- Update `/health` endpoint to include `unit: 'hours'`

### 3. `src/pages/Dashboard.tsx` - UI Display in Hours

- Rename the `shelfLife` state semantics from days to hours (no variable rename needed, just the meaning changes)
- Update simulation values:
  - Fresh: `setShelfLife(45.5)` (was 6.5 days)
  - Spoiled: `setShelfLife(0)` (unchanged)
- Update the footer text from "TensorFlow Regression Model" to "Scikit-learn Regression Model"

### 4. `src/components/dashboard/ShelfLifeCard.tsx` - Display Hours

- Change the label from `"Days"` to `"Hours"`
- Rename prop from `days` to `hours` (and internal variable `safeDays` to `safeHours`)
- All display logic stays the same (`.toFixed(1)` formatting)

### 5. `src/components/dashboard/BatchHistoryModal.tsx` - Display Hours

- Change shelf life label from `"Days"` to `"Hours"` in the batch detail view (line 269)

### 6. `backend/php/api/sensor_data.php` - Update Fallback

- Update the PHP fallback prediction thresholds to match the model (Ethanol >80, Ammonia >40, H2S >15)
- Fallback shelf life calculation: return hours (0-72) instead of days (0-7)

## Detailed Technical Changes

### A. `backend/python/train_model.py`

```python
# Key changes:
# 1. Generate dataset CSV
import pandas as pd

# After generating ethanol, ammonia, h2s arrays:
# shelf_life = quality_scores * 72 + noise  (was * 7)
# np.clip(..., 0, 72)  (was 0, 7)

# Save full dataset to CSV
df = pd.DataFrame({
    'ethanol': ethanol,
    'ammonia': ammonia,
    'h2s': h2s,
    'shelf_life_hours': shelf_life
})
df.to_csv('dataset.csv', index=False)

# Split: 70% train, 15% val, 15% test
from sklearn.model_selection import train_test_split
train_df, temp_df = train_test_split(df, test_size=0.3, random_state=42)
val_df, test_df = train_test_split(temp_df, test_size=0.5, random_state=42)

train_df.to_csv('train.csv', index=False)
val_df.to_csv('val.csv', index=False)
test_df.to_csv('test.csv', index=False)

# Normalize and train on train set only
# Evaluate on val and test sets separately
# Print results for all three
```

Test predictions output example:
```
Fresh milk: Ethanol=10, NH3=3, H2S=0.5 -> 46.20 hours
Spoiled:    Ethanol=90, NH3=45, H2S=18 -> 1.40 hours
```

### B. `backend/python/app.py`

```python
# Fallback formula change:
shelf_life = max(0, round(quality_score * 72, 2))  # was * 7

# /test endpoint expected values:
{'ethanol': 10, 'ammonia': 3, 'h2s': 0.5, 'expected': 'fresh (~45-50 hours)'}
```

### C. `src/pages/Dashboard.tsx`

```typescript
// Simulation values updated for hours:
// Spoiled simulation:
setShelfLife(0);  // unchanged

// Fresh simulation:
setShelfLife(45.5);  // was 6.5 days, now ~45.5 hours
```

### D. `src/components/dashboard/ShelfLifeCard.tsx`

```typescript
// Props: days -> hours
interface ShelfLifeCardProps {
  hours: number;  // was: days
  // ... rest unchanged
}

// Display:
{safeHours.toFixed(1)}
<span>Hours</span>  // was: Days
```

### E. `src/components/dashboard/BatchHistoryModal.tsx`

```typescript
// Line 269:
{batch.shelf_life} <span>Hours</span>  // was: Days
```

### F. `backend/php/api/sensor_data.php`

```php
// Line 83-84 fallback:
$isSpoiled = $ethanol > 80 || $ammonia > 40 || $h2s > 15;
return ['shelfLife' => $isSpoiled ? 0 : rand(14, 50), ...];  // hours
```

## Files to Modify

| File | Summary |
|------|---------|
| `backend/python/train_model.py` | CSV output, 0-72 hours range, train/val/test split |
| `backend/python/app.py` | Return hours, update fallback and test endpoint |
| `src/pages/Dashboard.tsx` | Update simulation values for hours, fix footer text |
| `src/components/dashboard/ShelfLifeCard.tsx` | Rename days->hours, change label |
| `src/components/dashboard/BatchHistoryModal.tsx` | Change "Days" to "Hours" |
| `backend/php/api/sensor_data.php` | Update fallback thresholds and return hours |

## Post-Implementation Steps

1. Install pandas in Python env: `pip install pandas`
2. Retrain model: `cd backend/python && python train_model.py`
3. Verify CSV files generated: `dataset.csv`, `train.csv`, `val.csv`, `test.csv`
4. Restart Flask: `python app.py`
5. Test: `http://localhost:5000/test` - verify hours output
6. Dashboard should now show shelf life in hours (e.g., "45.5 Hours")

