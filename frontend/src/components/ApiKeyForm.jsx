import { useState } from 'react';

const ApiKeyForm = ({ onValidate, loading }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!apiKey.trim()) {
      setError('Please enter your Apify API key');
      return;
    }
    
    if (!apiKey.startsWith('apify_api_')) {
      setError('Invalid API key format. Should start with "apify_api_"');
      return;
    }

    try {
      await onValidate(apiKey);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>🚀 Apify Integration App</h2>
        <p>Enter your Apify API key to get started</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="apiKey">API Key</label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="apify_api_..."
              disabled={loading}
              className={error ? 'error' : ''}
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" disabled={loading || !apiKey.trim()}>
            {loading ? 'Validating...' : 'Connect to Apify'}
          </button>
        </form>
        
        <div className="help-text">
          <p>🔑 Get your API key from <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer">Apify Console</a></p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyForm;