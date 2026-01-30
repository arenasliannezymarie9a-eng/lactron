// LACTRON API Configuration and Services

// NOTE:
// - Port 8080 is often already used locally (and Vite may auto-switch ports).
// - Default to 8083 for the PHP API, but allow overriding via Vite env vars.
//   Example: VITE_PHP_BASE_URL=http://localhost:9000/api
const DEFAULT_PHP_BASE_URL = "http://localhost:8083/api";

const API_CONFIG = {
  PHP_BASE_URL:
    import.meta.env.VITE_PHP_BASE_URL ||
    import.meta.env.VITE_PHP_API_URL ||
    DEFAULT_PHP_BASE_URL,
  FLASK_BASE_URL: import.meta.env.VITE_FLASK_BASE_URL || "http://localhost:5000",
} as const;

const PHP_BACKEND_UNAVAILABLE_MESSAGE =
  "Backend not available. Start the PHP API (example): php -S localhost:8083 -t backend/php";

// Types
export interface User {
  id: number;
  email: string;
  name: string;
}

export interface SecurityQuestion {
  id: number;
  question: string;
}

export interface SensorData {
  ethanol: number;
  ammonia: number;
  h2s: number;
}

export interface SensorReading extends SensorData {
  id: number;
  batch_id: string;
  status: 'good' | 'spoiled';
  predicted_shelf_life: number;
  created_at: string;
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
  collector_name: string;
  collection_datetime: string;
  status: 'good' | 'spoiled';
  created_at: string;
  reading_count?: number;
  latest_shelf_life?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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
      return { success: false, error: PHP_BACKEND_UNAVAILABLE_MESSAGE };
    }
  },

  async signup(
    email: string, 
    password: string, 
    name: string
  ): Promise<ApiResponse<User>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'signup', 
          email, 
          password, 
          name
        }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: PHP_BACKEND_UNAVAILABLE_MESSAGE };
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

  async getSecurityQuestions(): Promise<ApiResponse<SecurityQuestion[]>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_security_questions' }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Connection failed' };
    }
  },

  async getUserSecurityQuestion(email: string): Promise<ApiResponse<{ user_id: number; question: string }>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_user_security_question', email }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Connection failed' };
    }
  },

  async verifySecurityAnswer(email: string, answer: string): Promise<ApiResponse<{ reset_token: string }>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'verify_security_answer', email, answer }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Connection failed' };
    }
  },

  async resetPassword(resetToken: string, newPassword: string): Promise<ApiResponse<null>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reset_password', reset_token: resetToken, new_password: newPassword }),
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
      return { success: false, error: PHP_BACKEND_UNAVAILABLE_MESSAGE };
    }
  },

  async getHistory(batchId: string, limit = 50): Promise<ApiResponse<SensorReading[]>> {
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
  async create(batchId: string, collectorName: string, collectionDatetime: string): Promise<ApiResponse<Batch>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/batches.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'create', 
          batch_id: batchId,
          collector_name: collectorName,
          collection_datetime: collectionDatetime
        }),
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

  async delete(batchId: string): Promise<ApiResponse<null>> {
    try {
      const response = await fetch(`${API_CONFIG.PHP_BASE_URL}/batches.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete', batch_id: batchId }),
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

export { API_CONFIG };
