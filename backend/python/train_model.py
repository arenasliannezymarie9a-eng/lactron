"""
LACTRON Shelf Life Prediction Model - Realistic Milk Spoilage Parameters
Based on dairy science research for volatile compound detection
Compatible with Python 3.14 using scikit-learn
Predicts shelf life in HOURS (0-72)
"""
import numpy as np
import pandas as pd
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

# Shelf life: 0-72 HOURS based on quality + some noise
shelf_life = np.clip(
    quality_scores * 72 + np.random.normal(0, 2.5, n_samples),
    0, 72
)

# Save full dataset to CSV
df = pd.DataFrame({
    'ethanol': ethanol,
    'ammonia': ammonia,
    'h2s': h2s,
    'shelf_life_hours': shelf_life
})
df.to_csv('dataset.csv', index=False)
print(f"Full dataset saved to dataset.csv ({len(df)} samples)")

# Split: 70% train, 15% validation, 15% test
train_df, temp_df = train_test_split(df, test_size=0.3, random_state=42)
val_df, test_df = train_test_split(temp_df, test_size=0.5, random_state=42)

train_df.to_csv('train.csv', index=False)
val_df.to_csv('val.csv', index=False)
test_df.to_csv('test.csv', index=False)
print(f"Split — Train: {len(train_df)}, Validation: {len(val_df)}, Test: {len(test_df)}")

# Normalize for model input
def normalize_df(data):
    return np.column_stack([
        data['ethanol'].values / SENSOR_CONFIG['ethanol']['train_max'],
        data['ammonia'].values / SENSOR_CONFIG['ammonia']['train_max'],
        data['h2s'].values / SENSOR_CONFIG['h2s']['train_max']
    ])

X_train = normalize_df(train_df)
y_train = train_df['shelf_life_hours'].values

X_val = normalize_df(val_df)
y_val = val_df['shelf_life_hours'].values

X_test = normalize_df(test_df)
y_test = test_df['shelf_life_hours'].values

print("\nTraining Gradient Boosting Regressor (shelf life in hours)...")
model = GradientBoostingRegressor(
    n_estimators=150,
    max_depth=6,
    learning_rate=0.08,
    min_samples_split=5,
    random_state=42
)
model.fit(X_train, y_train)

# Evaluate on all splits
for split_name, X_split, y_split in [
    ("Train", X_train, y_train),
    ("Validation", X_val, y_val),
    ("Test", X_test, y_test)
]:
    y_pred = model.predict(X_split)
    mae = mean_absolute_error(y_split, y_pred)
    r2 = r2_score(y_split, y_pred)
    print(f"  {split_name} — MAE: {mae:.4f} hours, R²: {r2:.4f}")

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
    print(f"  {name}: Ethanol={eth}, NH3={amm}, H2S={h2s_val} -> {pred:.2f} hours")

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
    },
    'unit': 'hours',
    'max_shelf_life': 72
}
with open('norm_params.pkl', 'wb') as f:
    pickle.dump(norm_params, f)
print("Parameters saved to norm_params.pkl")
