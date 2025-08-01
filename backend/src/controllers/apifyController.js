const axios = require('axios');

const APIFY_API_BASE = 'https://api.apify.com/v2';

const createApifyRequest = (apiKey) => {
  return axios.create({
    baseURL: APIFY_API_BASE,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
};

const validateApiKey = async (req, res) => {
  try {
    const apify = createApifyRequest(req.apiKey);
    const response = await apify.get('/users/me');
    
    res.json({
      valid: true,
      user: {
        username: response.data.data.username,
        email: response.data.data.email
      }
    });
  } catch (error) {
    console.error('API Key validation error:', error.response?.data || error.message);
    res.status(401).json({
      valid: false,
      error: 'Invalid API key or network error'
    });
  }
};

const getActors = async (req, res) => {
  try {
    const apify = createApifyRequest(req.apiKey);
    
    // First try to get user's own actors
    let actors = [];
    try {
      const response = await apify.get('/acts', {
        params: {
          limit: 50,
          offset: 0,
          desc: true
        }
      });
      
      actors = response.data.data.items.map(actor => ({
        id: actor.id,
        name: actor.name,
        title: actor.title || actor.name,
        description: actor.description,
        username: actor.username,
        isPublic: actor.isPublic,
        stats: {
          totalRuns: actor.stats?.totalRuns || 0,
          lastRunAt: actor.stats?.lastRunAt
        }
      }));
    } catch (userActorsError) {
      console.log('No user actors found, will include public actors');
    }

    // If no user actors, include some popular public actors for testing
    if (actors.length === 0) {
      const publicActors = [
        {
          id: 'apify/web-scraper',
          name: 'web-scraper',
          title: 'Web Scraper',
          description: 'Crawls arbitrary websites using the Chrome browser and extracts data from pages using a provided JavaScript code. The actor supports both recursive crawling and lists of URLs and automatically manages concurrency for maximum performance.',
          username: 'apify',
          isPublic: true,
          stats: { totalRuns: 1000000, lastRunAt: new Date().toISOString() }
        },
        {
          id: 'apify/website-content-crawler',
          name: 'website-content-crawler',
          title: 'Website Content Crawler',
          description: 'Crawls websites and extracts text content from web pages. Supports various output formats including HTML, Markdown, and text. Perfect for content analysis and data extraction.',
          username: 'apify',
          isPublic: true,
          stats: { totalRuns: 800000, lastRunAt: new Date().toISOString() }
        },
        {
          id: 'apify/google-search-results-scraper',
          name: 'google-search-results-scraper',
          title: 'Google Search Results Scraper',
          description: 'Scrapes Google Search result pages (SERPs) and extracts organic results, ads, related queries, People Also Ask, and more. Supports all Google domains and custom geolocation.',
          username: 'apify',
          isPublic: true,
          stats: { totalRuns: 500000, lastRunAt: new Date().toISOString() }
        },
        {
          id: 'apify/instagram-scraper',
          name: 'instagram-scraper',
          title: 'Instagram Scraper',
          description: 'Scrape Instagram posts, profiles, hashtags, stories, comments, and much more. Get unlimited Instagram data in JSON, CSV, Excel, or HTML format.',
          username: 'apify',
          isPublic: true,
          stats: { totalRuns: 300000, lastRunAt: new Date().toISOString() }
        }
      ];
      
      actors = publicActors;
    }

    res.json({ actors });
  } catch (error) {
    console.error('Get actors error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch actors',
      details: error.response?.data?.error || error.message
    });
  }
};

const getActorSchema = async (req, res) => {
  try {
    const { actorId } = req.params;
    const apify = createApifyRequest(req.apiKey);
    
    const response = await apify.get(`/acts/${actorId}`);
    const actor = response.data.data;

    // Get input schema
    const inputSchema = actor.defaultRunOptions?.build?.inputSchema || 
                       actor.inputSchema || 
                       { type: 'object', properties: {} };

    res.json({
      actor: {
        id: actor.id,
        name: actor.name,
        title: actor.title || actor.name,
        description: actor.description
      },
      inputSchema
    });
  } catch (error) {
    console.error('Get actor schema error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch actor schema',
      details: error.response?.data?.error || error.message
    });
  }
};

const executeActor = async (req, res) => {
  try {
    const { actorId } = req.params;
    const { input } = req.body;
    
    console.log('=== ACTOR EXECUTION DEBUG ===');
    console.log('Actor ID:', actorId);
    console.log('Input received:', JSON.stringify(input, null, 2));
    
    const apify = createApifyRequest(req.apiKey);
    
    // Validate that startUrls exists for crawlers
    if ((actorId.includes('crawler') || actorId.includes('scraper')) && 
        (!input.startUrls || !Array.isArray(input.startUrls) || input.startUrls.length === 0)) {
      console.log('ERROR: Missing or invalid startUrls');
      return res.status(400).json({
        error: 'startUrls is required and must be a non-empty array',
        received: input.startUrls
      });
    }
    
    console.log('Sending to Apify API...');
    
    // Start actor run
    const runResponse = await apify.post(`/acts/${actorId}/runs`, input, {
      params: { 
        waitForFinish: 60, // Wait up to 60 seconds
        memory: 512
      }
    });

    const run = runResponse.data.data;
    console.log('Run started:', run.id, 'Status:', run.status);
    
    // If run finished within wait time, get results immediately
    if (run.status === 'SUCCEEDED') {
      try {
        const datasetResponse = await apify.get(`/datasets/${run.defaultDatasetId}/items`);
        res.json({
          runId: run.id,
          status: run.status,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          stats: run.stats,
          results: datasetResponse.data
        });
      } catch (dataError) {
        res.json({
          runId: run.id,
          status: run.status,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          stats: run.stats,
          results: [],
          warning: 'Run completed but results not yet available'
        });
      }
    } else {
      // Run is still in progress or failed
      res.json({
        runId: run.id,
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        stats: run.stats,
        message: run.status === 'RUNNING' ? 'Actor is still running. Use the run ID to check status.' : 'Run did not complete successfully'
      });
    }
  } catch (error) {
    console.error('Execute actor error:', error.response?.data || error.message);
    console.error('Full error:', error);
    res.status(500).json({
      error: 'Failed to execute actor',
      details: error.response?.data?.error || error.message
    });
  }
};

const getRunStatus = async (req, res) => {
  try {
    const { runId } = req.params;
    const apify = createApifyRequest(req.apiKey);
    
    const runResponse = await apify.get(`/actor-runs/${runId}`);
    const run = runResponse.data.data;
    
    console.log('=== RUN STATUS DEBUG ===');
    console.log('Run ID:', runId);
    console.log('Status:', run.status);
    console.log('Exit code:', run.exitCode);
    
    let results = [];
    let errorDetails = null;
    
    // Get results if succeeded
    if (run.status === 'SUCCEEDED' && run.defaultDatasetId) {
      try {
        const datasetResponse = await apify.get(`/datasets/${run.defaultDatasetId}/items`);
        results = datasetResponse.data;
      } catch (dataError) {
        console.warn('Could not fetch results:', dataError.message);
      }
    }
    
    // Get error details if failed
    if (run.status === 'FAILED') {
      try {
        // Try to get the log to see what went wrong
        const logResponse = await apify.get(`/actor-runs/${runId}/log`);
        const logLines = logResponse.data.split('\n');
        
        // Look for error messages in the last part of the log
        const errorLines = logLines
          .slice(-50) // Last 50 lines
          .filter(line => 
            line.toLowerCase().includes('error') || 
            line.toLowerCase().includes('failed') ||
            line.toLowerCase().includes('exception')
          );
        
        if (errorLines.length > 0) {
          errorDetails = errorLines.join('\n');
        }
        
        console.log('Error details from log:', errorDetails);
      } catch (logError) {
        console.warn('Could not fetch log:', logError.message);
      }
    }
    
    res.json({
      runId: run.id,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      stats: run.stats,
      results,
      errorDetails,
      exitCode: run.exitCode
    });
  } catch (error) {
    console.error('Get run status error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to get run status',
      details: error.response?.data?.error || error.message
    });
  }
};

module.exports = {
  validateApiKey,
  getActors,
  getActorSchema,
  executeActor,
  getRunStatus
};