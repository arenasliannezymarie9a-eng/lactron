"""
Training script for LACTRON shelf life prediction model
Compatible with Python 3.14 using scikit-learn
"""
import numpy as np
import pickle
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

# Generate synthetic training data
np.random.seed(42)
n_samples = 5000

ethanol = np.random.uniform(0, 500, n_samples)
ammonia = np.random.uniform(0, 100, n_samples)
h2s = np.random.uniform(0, 50, n_samples)

# Calculate shelf life based on sensor readings
eth_score = np.clip(1 - (ethanol / 200), 0, 1)
amm_score = np.clip(1 - (ammonia / 30), 0, 1)
h2s_score = np.clip(1 - (h2s / 10), 0, 1)
shelf_life = np.clip(
    (eth_score * 0.4 + amm_score * 0.35 + h2s_score * 0.25) * 7 + 
    np.random.normal(0, 0.5, n_samples), 
    0, 7
)

# Normalize inputs
X = np.column_stack([ethanol / 500, ammonia / 100, h2s / 50])
y = shelf_life

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Build and train scikit-learn model (Python 3.14 compatible)
print("Training Gradient Boosting Regressor...")
model = GradientBoostingRegressor(
    n_estimators=100,
    max_depth=5,
    learning_rate=0.1,
    random_state=42
)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
print(f"Model Performance - MAE: {mae:.4f}, R²: {r2:.4f}")

# Save model
with open('shelf_life_model.pkl', 'wb') as f:
    pickle.dump(model, f)
print("Model saved to shelf_life_model.pkl")

# Save normalization parameters
norm_params = {
    'ethanol': {'min': 0, 'max': 500},
    'ammonia': {'min': 0, 'max': 100},
    'h2s': {'min': 0, 'max': 50}
}
with open('norm_params.pkl', 'wb') as f:
    pickle.dump(norm_params, f)
print("Normalization parameters saved to norm_params.pkl")
