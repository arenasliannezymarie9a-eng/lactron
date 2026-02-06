from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import os
import pickle

app = Flask(__name__)
CORS(app)

# Model loading with multiple fallback options for Python 3.14 compatibility
model = None
model_type = None

# Try sklearn first (better Python 3.14 support)
try:
    model_path = os.path.join(os.path.dirname(__file__), 'shelf_life_model.pkl')
    if os.path.exists(model_path):
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        model_type = 'sklearn'
        print("Scikit-learn model loaded successfully")
except Exception as e:
    print(f"Scikit-learn model not found: {e}")

# Fallback to TensorFlow if sklearn model not available
if model is None:
    try:
        import tensorflow as tf
        model_path = os.path.join(os.path.dirname(__file__), 'shelf_life_model.h5')
        if os.path.exists(model_path):
            model = tf.keras.models.load_model(model_path)
            model_type = 'tensorflow'
            print("TensorFlow model loaded successfully")
    except Exception as e:
        print(f"TensorFlow not available or model not found: {e}")

# Normalization parameters - MUST match train_model.py
NORM_PARAMS = {
    'ethanol': {'min': 0, 'max': 150},  # train_max from SENSOR_CONFIG
    'ammonia': {'min': 0, 'max': 80},
    'h2s': {'min': 0, 'max': 30}
}

# Realistic spoilage thresholds based on milk chemistry
SPOILAGE_THRESHOLDS = {
    'ethanol': 80,   # Spoiled if > 80 ppm
    'ammonia': 40,   # Spoiled if > 40 ppm
    'h2s': 15        # Spoiled if > 15 ppm
}


def normalize(value, param):
    return (value - NORM_PARAMS[param]['min']) / (NORM_PARAMS[param]['max'] - NORM_PARAMS[param]['min'])


def predict_shelf_life(ethanol, ammonia, h2s):
    """Predict shelf life using ML model or fallback formula"""
    
    print(f"[PREDICT] Input: ethanol={ethanol}, ammonia={ammonia}, h2s={h2s}")
    
    if model is not None:
        input_data = np.array([[
            normalize(ethanol, 'ethanol'),
            normalize(ammonia, 'ammonia'),
            normalize(h2s, 'h2s')
        ]])
        print(f"[PREDICT] Normalized: {input_data[0]}")
        
        if model_type == 'sklearn':
            prediction = model.predict(input_data)[0]
            confidence = 0.90
        else:  # tensorflow
            prediction = model.predict(input_data, verbose=0)[0][0]
            confidence = 0.92
        
        # Keep 2 decimal places for precision
        shelf_life = max(0, round(float(prediction), 2))
        print(f"[PREDICT] Model output: {prediction:.4f}, shelf_life: {shelf_life}")
    else:
        # Fallback: Formula-based prediction with realistic thresholds
        eth_score = max(0, 1 - (ethanol / SPOILAGE_THRESHOLDS['ethanol']))
        amm_score = max(0, 1 - (ammonia / SPOILAGE_THRESHOLDS['ammonia']))
        h2s_score = max(0, 1 - (h2s / SPOILAGE_THRESHOLDS['h2s']))
        quality_score = (eth_score * 0.30 + amm_score * 0.30 + h2s_score * 0.40)
        shelf_life = max(0, round(quality_score * 7, 2))
        confidence = 0.78
        print(f"[PREDICT] Fallback - scores: eth={eth_score:.2f}, amm={amm_score:.2f}, h2s={h2s_score:.2f}")
    
    # Determine status based on realistic thresholds
    is_spoiled = (
        ethanol > SPOILAGE_THRESHOLDS['ethanol'] or 
        ammonia > SPOILAGE_THRESHOLDS['ammonia'] or 
        h2s > SPOILAGE_THRESHOLDS['h2s']
    )
    status = 'spoiled' if is_spoiled else 'good'
    
    result = {
        'status': status,
        'shelf_life': shelf_life if not is_spoiled else 0,
        'confidence': confidence
    }
    print(f"[PREDICT] Result: {result}")
    
    return result


@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    ethanol = float(data.get('ethanol', 0))
    ammonia = float(data.get('ammonia', 0))
    h2s = float(data.get('h2s', 0))
    
    result = predict_shelf_life(ethanol, ammonia, h2s)
    return jsonify(result)


@app.route('/test', methods=['GET'])
def test_prediction():
    """Test endpoint to verify model predictions with sample cases"""
    test_cases = [
        {'ethanol': 10, 'ammonia': 3, 'h2s': 0.5, 'expected': 'fresh (~6-7 days)'},
        {'ethanol': 25, 'ammonia': 12, 'h2s': 3, 'expected': 'slightly aged (~4-5 days)'},
        {'ethanol': 45, 'ammonia': 20, 'h2s': 6, 'expected': 'warning zone (~3-4 days)'},
        {'ethanol': 90, 'ammonia': 50, 'h2s': 20, 'expected': 'spoiled (0 days)'},
    ]
    
    results = []
    for case in test_cases:
        result = predict_shelf_life(case['ethanol'], case['ammonia'], case['h2s'])
        results.append({
            'input': {
                'ethanol': case['ethanol'],
                'ammonia': case['ammonia'],
                'h2s': case['h2s']
            },
            'expected': case['expected'],
            'prediction': result
        })
    
    return jsonify({
        'test_results': results,
        'model_loaded': model is not None,
        'model_type': model_type,
        'thresholds': SPOILAGE_THRESHOLDS,
        'norm_params': NORM_PARAMS
    })


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'model_type': model_type,
        'python_version': f'{__import__("sys").version}',
        'thresholds': SPOILAGE_THRESHOLDS
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
