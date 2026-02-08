/**
 * AI Guard Dog Intern - Node.js Orchestrator
 * 
 * Main application entry point.
 * This server:
 * 1. Listens for blockchain events (ProposalCreated)
 * 2. Triggers AI analysis via the Python Intelligence Layer
 * 3. Stores results and manages proposal routing
 * 4. Provides REST API for the frontend
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { pool, closePool } from './config/database';
import { blockchainListener } from './services/blockchainListener';
import proposalRoutes from './routes/proposalRoutes';
import statsRoutes from './routes/statsRoutes';

// Import to initialize event listeners
import './events/analysisTrigger';

const app: Express = express();

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📨 ${new Date().toISOString()} | ${req.method} ${req.path}`);
  next();
});

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        blockchain: blockchainListener ? 'initialized' : 'not initialized',
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: String(error),
    });
  }
});

// API routes
app.use('/api/proposals', proposalRoutes);
app.use('/api/stats', statsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'development' ? err.message : 'Internal server error',
  });
});

// ═══════════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════════

async function startServer(): Promise<void> {
  console.log(`\n`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`🐕 AI GUARD DOG INTERN - Node.js Orchestrator`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  try {
    // Test database connection
    console.log('📦 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully\n');

    // Initialize blockchain listener (optional - gracefully handles unavailable blockchain)
    console.log('⛓️ Checking blockchain connection...');
    await blockchainListener.initialize();
    
    if (blockchainListener.available) {
      // Start listening for events (non-blocking)
      blockchainListener.listenForProposals().catch(console.error);
      console.log('✅ Blockchain listener started\n');
    }

    // Start Express server
    app.listen(config.port, () => {
      console.log(`\n═══════════════════════════════════════════════════════════════`);
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Health: http://localhost:${config.port}/health`);
      console.log(`   API: http://localhost:${config.port}/api`);
      console.log(`═══════════════════════════════════════════════════════════════\n`);
      
      console.log(`📋 Available Endpoints:`);
      console.log(`   GET  /health                    - Health check`);
      console.log(`   GET  /api/proposals             - List all proposals`);
      console.log(`   GET  /api/proposals/:id         - Get proposal details`);
      console.log(`   GET  /api/proposals/review-queue - Get review queue`);
      console.log(`   POST /api/proposals/simulate    - Simulate draft`);
      console.log(`   POST /api/proposals/mock        - Trigger mock event\n`);
      
      console.log(`🧪 To test the pipeline, run:`);
      console.log(`   curl -X POST http://localhost:${config.port}/api/proposals/mock`);
      console.log(`\n`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════

async function shutdown(signal: string): Promise<void> {
  console.log(`\n⚠️ Received ${signal}. Shutting down gracefully...`);
  
  try {
    await blockchainListener.stopListening();
    await closePool();
    console.log('✅ Cleanup complete. Goodbye!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start the server
startServer();

export default app;
