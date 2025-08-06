import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    this.apiKey = null;
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
    this.client.defaults.headers['x-apify-token'] = apiKey;
  }

  async validateApiKey(apiKey) {
    try {
      const response = await this.client.post('/apify/validate', { apiKey });
      if (response.data.valid) {
        this.setApiKey(apiKey);
        localStorage.setItem('apify_token', apiKey); // Store for ActorSelector
      }
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to validate API key');
    }
  }

  async getActors() {
    try {
      const response = await this.client.get('/apify/actors');
      return response.data.actors;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch actors');
    }
  }

  async getActorSchema(actorId) {
    try {
      const response = await this.client.get(`/apify/actors/${actorId}/schema`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch actor schema');
    }
  }

  async executeActor(actorId, input) {
    try {
      const response = await this.client.post(`/apify/actors/${actorId}/execute`, { input });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to execute actor');
    }
  }

  async getRunStatus(runId) {
    try {
      const response = await this.client.get(`/apify/runs/${runId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get run status');
    }
  }
}

export default new ApiService();