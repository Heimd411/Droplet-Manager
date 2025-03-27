import express from 'express';
import { setRoutes } from './routes/index';
import { json, urlencoded } from 'body-parser';
import { createServer } from 'http';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  console.log(`Creating data directory at ${dataDir}`);
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (error) {
    console.error(`Failed to create data directory: ${error}`);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cookieParser()); // Add cookie parser for session handling

// Set up routes
setRoutes(app);

// Create HTTP server
const server = createServer(app);

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});