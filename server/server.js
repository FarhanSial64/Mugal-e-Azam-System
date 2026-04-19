import dotenv from 'dotenv';
import connectDB from './config/db.js';
import config from './config/env.js';
import app from './app.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🍽️  MUGHAL-E-AZAM - Workforce & Payroll Management System ║
║                                                              ║
║   Server running in ${config.nodeEnv.padEnd(12)} mode on port ${PORT.toString().padEnd(5)}      ║
║   API URL: http://localhost:${PORT}/api                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

export default app;
