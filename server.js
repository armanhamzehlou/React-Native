
const express = require('express');
const FaceRecognitionService = require('./src/services/FaceRecognitionService').default;

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Face recognition endpoint
app.post('/match', async (req, res) => {
  try {
    const { imagePath } = req.body;
    
    if (!imagePath) {
      return res.status(400).json({ error: 'imagePath is required' });
    }

    const result = await FaceRecognitionService.matchFace(imagePath);
    res.json(result);
    
  } catch (error) {
    console.error('Face matching error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize service and start server
async function startServer() {
  try {
    await FaceRecognitionService.initialize();
    await FaceRecognitionService.loadFaceDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Face Recognition Service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API endpoint: http://localhost:${PORT}/match`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();
