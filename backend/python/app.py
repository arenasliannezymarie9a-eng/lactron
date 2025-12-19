from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# Try to load TensorFlow model
model = None
try:
    import tensorflow as tf
    model_path = os.path.join(os.path.dirname(__file__), 'shelf_life_model.h5')
    if os.path.exists(model_path):
        model = tf.keras.models.load_model(model_path)
        print("TensorFlow model loaded successfully")
except Exception as e:
    print(f"TensorFlow not available or model not found: {e}")

# Normalization parameters (from training)
NORM_PARAMS = {
    'ethanol': {'min': 0, 'max': 500},
    'ammonia': {'min': 0, 'max': 100},
    'h2s': {'min': 0, 'max': 50}
}

SPOILAGE_THRESHOLDS = {'ethanol': 200, 'ammonia': 30, 'h2s': 10}

def normalize(value, param):
    return (value - NORM_PARAMS[param]['min']) / (NORM_PARAMS[param]['max'] - NORM_PARAMS[param]['min'])

def predict_shelf_life(ethanol, ammonia, h2s):
    """Predict shelf life using TensorFlow model or fallback formula"""
    
    if model is not None:
        # Use TensorFlow model
        input_data = np.array([[normalize(ethanol, 'ethanol'), normalize(ammonia, 'ammonia'), normalize(h2s, 'h2s')]])
        prediction = model.predict(input_data, verbose=0)[0][0]
        shelf_life = max(0, int(round(prediction)))
        confidence = 0.92
    else:
        # Fallback: Formula-based prediction
        eth_score = max(0, 1 - (ethanol / SPOILAGE_THRESHOLDS['ethanol']))
        amm_score = max(0, 1 - (ammonia / SPOILAGE_THRESHOLDS['ammonia']))
        h2s_score = max(0, 1 - (h2s / SPOILAGE_THRESHOLDS['h2s']))
        quality_score = (eth_score * 0.4 + amm_score * 0.35 + h2s_score * 0.25)
        shelf_life = max(0, int(round(quality_score * 7)))
        confidence = 0.78
    
    # Determine status
    is_spoiled = ethanol > SPOILAGE_THRESHOLDS['ethanol'] or ammonia > SPOILAGE_THRESHOLDS['ammonia'] or h2s > SPOILAGE_THRESHOLDS['h2s']
    status = 'spoiled' if is_spoiled else 'good'
    
    return {'status': status, 'shelf_life': shelf_life if not is_spoiled else 0, 'confidence': confidence}

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    ethanol = float(data.get('ethanol', 0))
    ammonia = float(data.get('ammonia', 0))
    h2s = float(data.get('h2s', 0))
    
    result = predict_shelf_life(ethanol, ammonia, h2s)
    return jsonify(result)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'model_loaded': model is not None})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
