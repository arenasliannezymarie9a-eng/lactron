

# Improve ML Prediction Model and UI Integration

## Problem Analysis

After reviewing the codebase, I've identified several issues preventing the ML predictions from properly reflecting on the UI:

### Issue 1: Model Training Parameters Are Unrealistic

The current `train_model.py` uses thresholds that don't match real-world milk spoilage chemistry:

| Sensor | Current Threshold | Real ESP32 Reading | Problem |
|--------|-------------------|-------------------|---------|
| Ethanol | 200 ppm | ~10 ppm | Fresh milk reads 1-20 ppm, spoiled 50-150 ppm |
| Ammonia | 30 ppm | ~3 ppm | Fresh milk reads 0-10 ppm, spoiled 15-50 ppm |
| H2S | 10 ppm | ~0 ppm | Fresh milk reads 0-2 ppm, spoiled 5-20 ppm |

With current thresholds, all real readings show as "good" with maximum shelf life because they're far below the spoilage cutoff.

### Issue 2: Shelf Life Precision Lost

In `app.py` line 62:
```python
shelf_life = max(0, int(round(prediction)))  # Truncates 6.8 -> 7
```

This loses decimal precision. The UI shows "4.8 days" but the model returns integers only.

### Issue 3: PHP Returns Strings, UI Expects Numbers

PHP PDO returns all values as strings. The Dashboard component tries to use them directly:
```typescript
setShelfLife(latest.predicted_shelf_life);  // "6.00" (string) not 6.00 (number)
```

---

## Solution Overview

```text
+-------------------+     +------------------+     +------------------+
|  ESP32 Sensors    | --> |  PHP Backend     | --> |  React Dashboard |
|  (Real PPM data)  |     |  (Calls Flask)   |     |  (Displays data) |
+-------------------+     +------------------+     +------------------+
         |                        |                        |
         v                        v                        v
  Realistic ranges         Call ML server          Parse numbers from
  (0-50 ppm ethanol)       with timeout            string responses
                           + fallback
```

---

## Changes Required

### 1. Update Training Script with Realistic Thresholds

**File:** `backend/python/train_model.py`

Update spoilage thresholds to match actual milk chemistry research:

| Sensor | Fresh Range | Warning Range | Spoiled Range | Max Training |
|--------|-------------|---------------|---------------|--------------|
| Ethanol | 0-20 ppm | 20-50 ppm | >50 ppm | 150 ppm |
| Ammonia | 0-10 ppm | 10-25 ppm | >25 ppm | 80 ppm |
| H2S | 0-2 ppm | 2-8 ppm | >8 ppm | 30 ppm |

Add quality scoring that's more sensitive to lower readings:
- Fresh milk (all sensors in fresh range): 5-7 days shelf life
- Warning zone (any sensor elevated): 2-5 days shelf life
- Spoiled (any sensor exceeds threshold): 0-1 days shelf life

### 2. Update Flask Prediction Server

**File:** `backend/python/app.py`

- Update thresholds to match training script
- Return float precision for shelf_life (not integer)
- Add detailed logging for debugging
- Add confidence scoring based on how far from thresholds

### 3. Ensure UI Parses Numbers Correctly

**File:** `src/pages/Dashboard.tsx`

- Explicitly convert `predicted_shelf_life` and sensor values from string to number
- Add null checks for missing data

### 4. Add Model Health Endpoint with Test Prediction

**File:** `backend/python/app.py`

Add `/test` endpoint that returns a sample prediction so you can verify the model is working correctly from the browser.

---

## Detailed Code Changes

### A. `backend/python/train_model.py` (Complete Rewrite)

```python
"""
LACTRON Shelf Life Prediction Model - Realistic Milk Spoilage Parameters
Based on dairy science research for volatile compound detection
"""
import numpy as np
import pickle
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

np.random.seed(42)
n_samples = 10000

# Realistic sensor ranges based on milk spoilage chemistry
# Fresh milk: Low volatiles | Spoiled milk: High volatiles
SENSOR_CONFIG = {
    'ethanol': {
        'fresh_max': 20,      # Fresh milk < 20 ppm
        'warning': 50,        # Warning zone 20-50 ppm
        'spoiled': 80,        # Definite spoilage > 80 ppm
        'train_max': 150      # Max for training distribution
    },
    'ammonia': {
        'fresh_max': 10,      # Fresh milk < 10 ppm
        'warning': 25,        # Warning zone 10-25 ppm
        'spoiled': 40,        # Definite spoilage > 40 ppm
        'train_max': 80       # Max for training distribution
    },
    'h2s': {
        'fresh_max': 2,       # Fresh milk < 2 ppm
        'warning': 8,         # Warning zone 2-8 ppm
        'spoiled': 15,        # Definite spoilage > 15 ppm
        'train_max': 30       # Max for training distribution
    }
}

# Generate training data with realistic distribution
# More samples in the fresh/warning zone (where real readings occur)
ethanol = np.concatenate([
    np.random.uniform(0, 50, int(n_samples * 0.7)),   # 70% in normal range
    np.random.uniform(50, 150, int(n_samples * 0.3))  # 30% elevated
])
ammonia = np.concatenate([
    np.random.uniform(0, 25, int(n_samples * 0.7)),
    np.random.uniform(25, 80, int(n_samples * 0.3))
])
h2s = np.concatenate([
    np.random.uniform(0, 8, int(n_samples * 0.7)),
    np.random.uniform(8, 30, int(n_samples * 0.3))
])

np.random.shuffle(ethanol)
np.random.shuffle(ammonia)
np.random.shuffle(h2s)

# Calculate quality score (0-1) based on realistic thresholds
def calculate_quality(eth, amm, h2s_val):
    """Calculate milk quality score with sensitivity to low readings"""
    eth_score = np.clip(1 - (eth / SENSOR_CONFIG['ethanol']['spoiled']), 0, 1)
    amm_score = np.clip(1 - (amm / SENSOR_CONFIG['ammonia']['spoiled']), 0, 1)
    h2s_score = np.clip(1 - (h2s_val / SENSOR_CONFIG['h2s']['spoiled']), 0, 1)
    
    # Weighted combination (H2S is most indicative of bacterial spoilage)
    return eth_score * 0.30 + amm_score * 0.30 + h2s_score * 0.40

quality_scores = np.array([
    calculate_quality(e, a, h) 
    for e, a, h in zip(ethanol, ammonia, h2s)
])

# Shelf life: 0-7 days based on quality + some noise
shelf_life = np.clip(
    quality_scores * 7 + np.random.normal(0, 0.3, n_samples),
    0, 7
)

# Normalize for model input
X = np.column_stack([
    ethanol / SENSOR_CONFIG['ethanol']['train_max'],
    ammonia / SENSOR_CONFIG['ammonia']['train_max'],
    h2s / SENSOR_CONFIG['h2s']['train_max']
])
y = shelf_life

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print("Training Gradient Boosting Regressor with realistic milk parameters...")
model = GradientBoostingRegressor(
    n_estimators=150,
    max_depth=6,
    learning_rate=0.08,
    min_samples_split=5,
    random_state=42
)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
print(f"Model Performance - MAE: {mae:.4f} days, R2: {r2:.4f}")

# Test with realistic values
test_cases = [
    ("Fresh milk", 10, 3, 0.5),
    ("Slightly aged", 25, 12, 3),
    ("Warning zone", 45, 20, 6),
    ("Spoiled", 90, 45, 18),
]
print("\nTest Predictions:")
for name, eth, amm, h2s_val in test_cases:
    test_input = np.array([[
        eth / SENSOR_CONFIG['ethanol']['train_max'],
        amm / SENSOR_CONFIG['ammonia']['train_max'],
        h2s_val / SENSOR_CONFIG['h2s']['train_max']
    ]])
    pred = model.predict(test_input)[0]
    print(f"  {name}: Ethanol={eth}, NH3={amm}, H2S={h2s_val} -> {pred:.2f} days")

with open('shelf_life_model.pkl', 'wb') as f:
    pickle.dump(model, f)
print("\nModel saved to shelf_life_model.pkl")

norm_params = {
    'ethanol': {'min': 0, 'max': SENSOR_CONFIG['ethanol']['train_max']},
    'ammonia': {'min': 0, 'max': SENSOR_CONFIG['ammonia']['train_max']},
    'h2s': {'min': 0, 'max': SENSOR_CONFIG['h2s']['train_max']},
    'thresholds': {
        'ethanol': SENSOR_CONFIG['ethanol']['spoiled'],
        'ammonia': SENSOR_CONFIG['ammonia']['spoiled'],
        'h2s': SENSOR_CONFIG['h2s']['spoiled']
    }
}
with open('norm_params.pkl', 'wb') as f:
    pickle.dump(norm_params, f)
print("Parameters saved to norm_params.pkl")
```

### B. `backend/python/app.py` (Updated Prediction Logic)

Key changes:
- Updated `NORM_PARAMS` to match new training ranges
- Updated `SPOILAGE_THRESHOLDS` to realistic values
- Return shelf_life as float with 2 decimal places
- Add logging for debugging
- Add `/test` endpoint for verification

```python
# Updated constants
NORM_PARAMS = {
    'ethanol': {'min': 0, 'max': 150},
    'ammonia': {'min': 0, 'max': 80},
    'h2s': {'min': 0, 'max': 30}
}

SPOILAGE_THRESHOLDS = {
    'ethanol': 80,   # Spoiled if > 80 ppm (was 200)
    'ammonia': 40,   # Spoiled if > 40 ppm (was 30)
    'h2s': 15        # Spoiled if > 15 ppm (was 10)
}

# In predict_shelf_life function:
shelf_life = max(0, round(float(prediction), 2))  # Keep 2 decimal places

# Add /test endpoint
@app.route('/test', methods=['GET'])
def test_prediction():
    """Test endpoint to verify model predictions"""
    test_cases = [
        {'ethanol': 10, 'ammonia': 3, 'h2s': 0.5, 'expected': 'fresh'},
        {'ethanol': 45, 'ammonia': 20, 'h2s': 6, 'expected': 'warning'},
        {'ethanol': 90, 'ammonia': 50, 'h2s': 20, 'expected': 'spoiled'},
    ]
    results = []
    for case in test_cases:
        result = predict_shelf_life(case['ethanol'], case['ammonia'], case['h2s'])
        results.append({
            'input': case,
            'prediction': result
        })
    return jsonify({'test_results': results, 'model_type': model_type})
```

### C. `src/pages/Dashboard.tsx` (Number Parsing Fix)

Update `loadSensorHistory` to explicitly parse numbers:

```typescript
if (response.data.length > 0) {
  const latest = response.data[0];
  setSensorData({
    ethanol: Number(latest.ethanol) || 0,
    ammonia: Number(latest.ammonia) || 0,
    h2s: Number(latest.h2s) || 0,
  });
  setStatus(latest.status as MilkStatus);
  setShelfLife(Number(latest.predicted_shelf_life) || 0);
}
```

---

## Verification Steps After Implementation

1. **Retrain the model:**
   ```bash
   cd backend/python
   python train_model.py
   ```

2. **Restart Flask server:**
   ```bash
   python app.py
   ```

3. **Test predictions in browser:**
   - Visit `http://localhost:5000/test`
   - Confirm fresh milk (10, 3, 0.5) shows ~6 days
   - Confirm spoiled milk (90, 50, 20) shows ~0-1 days

4. **Verify on Dashboard:**
   - With ESP32 sending fresh readings (~10, ~3, ~0)
   - UI should show "GRADE: GOOD" and ~5-7 days shelf life

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `backend/python/train_model.py` | Complete rewrite with realistic thresholds |
| `backend/python/app.py` | Update thresholds, add float precision, add /test endpoint |
| `src/pages/Dashboard.tsx` | Add Number() parsing for sensor values |

