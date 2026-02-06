

# Align Simulation with Real-World Model Parameters

## Problem

The current simulation uses arbitrary values that don't match the trained ML model's realistic milk chemistry thresholds:

| Sensor | Current "Spoiled" Sim | Model Spoiled Threshold | UI Max Display | Issue |
|--------|----------------------|------------------------|----------------|-------|
| Ethanol | 85 ppm | >80 ppm | 100 ppm | Slightly high but acceptable |
| Ammonia | 70 ppm | >40 ppm | 100 ppm | Too high (training max is 80) |
| H2S | **95 ppm** | >15 ppm | 50 ppm | **Breaks UI** - exceeds display max |

The H2S value of 95 ppm is completely unrealistic. Real spoiled milk produces 15-30 ppm H2S based on dairy science research.

## Model Thresholds Reference

From `train_model.py`:

```text
Sensor     Fresh (<)   Warning     Spoiled (>)   Training Max
---------  ----------  ----------  ------------  ------------
Ethanol    20 ppm      20-50 ppm   80 ppm        150 ppm
Ammonia    10 ppm      10-25 ppm   40 ppm        80 ppm
H2S        2 ppm       2-8 ppm     15 ppm        30 ppm
```

## Solution

Update the simulation values to use realistic readings that match the ML model's training parameters:

### Spoiled Milk Simulation (Realistic)
Values that clearly indicate spoilage but stay within real-world ranges:
- Ethanol: **95 ppm** (above 80 threshold, within training range)
- Ammonia: **52 ppm** (above 40 threshold, realistic bacterial activity)
- H2S: **22 ppm** (above 15 threshold, within 30 ppm training max)
- Shelf Life: **0** days (model returns 0 for spoiled)

### Fresh Milk Simulation (Realistic)
Values that represent ideal fresh milk:
- Ethanol: **12 ppm** (well below 20 fresh_max)
- Ammonia: **5 ppm** (well below 10 fresh_max)
- H2S: **0.8 ppm** (well below 2 fresh_max)
- Shelf Life: **6.5** days (realistic high-quality prediction)

## Code Changes

### File: `src/pages/Dashboard.tsx`

Update the `simulateEvent` function:

```typescript
const simulateEvent = () => {
  if (isSimulating) {
    // Exit simulation - reload real data
    setIsSimulating(false);
    loadSensorHistory();
  } else {
    // Enter simulation mode with realistic values based on ML model thresholds
    setIsSimulating(true);
    if (status === "good") {
      // Simulate SPOILED milk - values above spoilage thresholds
      // Model thresholds: Ethanol >80, Ammonia >40, H2S >15
      setStatus("spoiled");
      setSensorData({ 
        ethanol: 95,   // Above 80 ppm threshold
        ammonia: 52,   // Above 40 ppm threshold  
        h2s: 22        // Above 15 ppm threshold (within 30 max)
      });
      setShelfLife(0);
    } else {
      // Simulate FRESH milk - values in fresh range
      // Fresh ranges: Ethanol <20, Ammonia <10, H2S <2
      setStatus("good");
      setSensorData({ 
        ethanol: 12,   // Well below 20 ppm fresh_max
        ammonia: 5,    // Well below 10 ppm fresh_max
        h2s: 0.8       // Well below 2 ppm fresh_max
      });
      setShelfLife(6.5);
    }
  }
};
```

## Why These Values?

### Spoiled Values (95, 52, 22)
- **Ethanol 95 ppm**: Fermentation produces ethanol; 95 ppm indicates active bacterial metabolism
- **Ammonia 52 ppm**: Protein breakdown releases ammonia; 52 ppm shows significant spoilage
- **H2S 22 ppm**: Sulfur-producing bacteria; 22 ppm is clear spoilage but realistic (not exceeding sensor range)

### Fresh Values (12, 5, 0.8)
- **Ethanol 12 ppm**: Fresh milk has minimal volatile compounds
- **Ammonia 5 ppm**: Very low protein degradation
- **H2S 0.8 ppm**: Negligible bacterial activity

## Visual Impact

After this change, the UI gauges will display proportionally correct values:

```text
FRESH SIMULATION:
Ethanol:  [====                    ] 12/100 ppm (12%)
Ammonia:  [===                     ] 5/100 ppm (5%)
H2S:      [=                       ] 0.8/50 ppm (1.6%)

SPOILED SIMULATION:
Ethanol:  [======================  ] 95/100 ppm (95%)
Ammonia:  [============            ] 52/100 ppm (52%)
H2S:      [======================  ] 22/50 ppm (44%)
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Update simulation values in `simulateEvent` function (lines 118-126) |

