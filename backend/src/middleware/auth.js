const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-apify-token'] || req.body.apiKey;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  if (!apiKey.startsWith('apify_api_')) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }

  req.apiKey = apiKey;
  next();
};

module.exports = { validateApiKey };