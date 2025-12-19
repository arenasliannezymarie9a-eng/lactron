// LACTRON API Configuration and Services
// Configure these URLs based on your local server setup

const API_CONFIG = {
  PHP_BASE_URL: 'http://localhost:8080/api',
  FLASK_BASE_URL: 'http://localhost:5000',
};

// Types
export interface User {
  id: number;
  email: string;
  name: string;
}

export interface SensorData {
  ethanol: number;
  ammonia: number;
  h2s: number;
}

export interface PredictionResult {
  status: 'good' | 'spoiled';
  shelfLife: number;
  confidence: number;
  timestamp: string;
}

export interface Batch {
  id: number;
  batch_id: string;
  collection_site: string;
  created_at: string;
  status: 'good' | 'spoiled';
  latest_reading?: SensorData;
  predicted_shelf_life?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Auth API
export const authAPI = {
  async login(email: string, password: string): Promise<ApiResponse<User>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'login', email, password }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Connection failed. Is the PHP server running?' };
    }
  },

  async signup(email: string, password: string, name: string): Promise<ApiResponse<User>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'signup', email, password, name }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Connection failed. Is the PHP server running?' };
    }
  },

  async logout(): Promise<ApiResponse<null>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'logout' }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Connection failed' };
    }
  },

  async checkSession(): Promise<ApiResponse<User>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'check' }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Connection failed' };
    }
  },
};

// Sensor Data API
export const sensorAPI = {
  async getLatest(batchId?: string): Promise<ApiResponse<SensorData & PredictionResult>> {
    try {
      const url = batchId 
        ? `${API_CONFIG.PHP_BASE_URL}/sensor_data.php?action=latest&batch_id=${batchId}`
        : `${API_CONFIG.PHP_BASE_URL}/sensor_data.php?action=latest`;
      const response = await fetch(url, { credentials: 'include' });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Connection failed. Is the PHP server running?' };
    }
  },

  async getHistory(batchId: string, limit = 100): Promise<ApiResponse<(SensorData & { timestamp: string })[]>> {
    try {
      const response = await fetch(
        `${API_CONFIG.PHP_BASE_URL}/sensor_data.php?action=history&batch_id=${batchId}&limit=${limit}`,
        { credentials: 'include' }
      );
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Connection failed' };
    }
  },

  async saveSensorData(batchId: string, data: SensorData): Promise<ApiResponse<PredictionResult>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/sensor_data.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'save', batch_id: batchId, ...data }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Connection failed' };
    }
  },
};

// Batch API
export const batchAPI = {
  async create(collectionSite: string): Promise<ApiResponse<Batch>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/batches.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'create', collection_site: collectionSite }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Connection failed' };
    }
  },

  async getAll(): Promise<ApiResponse<Batch[]>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/batches.php?action=list`, {
        credentials: 'include',
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Connection failed' };
    }
  },

  async getById(batchId: string): Promise<ApiResponse<Batch>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/batches.php?action=get&batch_id=${batchId}`, {
        credentials: 'include',
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Connection failed' };
    }
  },
};

// ML Prediction API (Flask)
export const mlAPI = {
  async predict(data: SensorData): Promise<ApiResponse<PredictionResult>> {
    try {
      const response = await fetch(`${API_CONFIG.FLASK_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'ML server not available. Is Flask running?' };
    }
  },

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_CONFIG.FLASK_BASE_URL}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch {
      return false;
    }
  },
};

// Export config for external use
export { API_CONFIG };
