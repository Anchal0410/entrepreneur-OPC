const express = require('express');
const { validateApiKey } = require('../middleware/auth');
const {
  validateApiKey: validateKey,
  getActors,
  getActorSchema,
  executeActor,
  getRunStatus
} = require('../controllers/apifyController');

const router = express.Router();

// Validate API key
router.post('/validate', validateApiKey, validateKey);

// Get user's actors
router.get('/actors', validateApiKey, getActors);

// Get actor schema
router.get('/actors/:actorId/schema', validateApiKey, getActorSchema);

// Execute actor
router.post('/actors/:actorId/execute', validateApiKey, executeActor);

// Get run status
router.get('/runs/:runId', validateApiKey, getRunStatus);

module.exports = router;