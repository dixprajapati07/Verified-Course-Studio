import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { seedDatabase } from './seed.js';
import presentationRoutes from './routes/presentationRoutes.js';
import slideRoutes from './routes/slideRoutes.js';
import codeExampleRoutes from './routes/codeExampleRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Verified Course Studio API',
    version: '1.2.0'
  });
});

// API Routes
app.use('/api/presentations', presentationRoutes);
app.use('/api/slides', slideRoutes);
app.use('/api/code-examples', codeExampleRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// Bootstrap Database & Start Server if not imported by test suite
export async function startServer() {
  await connectDB();
  await seedDatabase();
  const server = app.listen(PORT, () => {
    console.log(`[Server] Verified Course Studio Backend running on port ${PORT}`);
  });
  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('[Server] Startup error:', err);
    process.exit(1);
  });
}

export default app;
