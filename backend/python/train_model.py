"""Training script for LACTRON shelf life prediction model"""
import numpy as np
import tensorflow as tf
from tensorflow import keras

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
shelf_life = np.clip((eth_score * 0.4 + amm_score * 0.35 + h2s_score * 0.25) * 7 + np.random.normal(0, 0.5, n_samples), 0, 7)

# Normalize inputs
X = np.column_stack([ethanol / 500, ammonia / 100, h2s / 50])
y = shelf_life

# Build model
model = keras.Sequential([
    keras.layers.Dense(64, activation='relu', input_shape=(3,)),
    keras.layers.Dropout(0.2),
    keras.layers.Dense(32, activation='relu'),
    keras.layers.Dense(16, activation='relu'),
    keras.layers.Dense(1)
])

model.compile(optimizer='adam', loss='mse', metrics=['mae'])
model.fit(X, y, epochs=100, batch_size=32, validation_split=0.2, verbose=1)
model.save('shelf_life_model.h5')
print("Model saved to shelf_life_model.h5")
