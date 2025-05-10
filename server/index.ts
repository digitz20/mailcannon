
// server/index.ts
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local from project root. This should be one of the first things.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import express from 'express';
import cors from 'cors';
import connectDB from './config/db';
import emailRoutes from './routes/email';

const app = express();

// Connect to Database
connectDB();

// Middleware
// Configure CORS to allow requests from your Next.js frontend
const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:9002'; // Port of Next.js app
app.use(cors({
  origin: frontendUrl,
}));

app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Define Routes
app.use('/api/email', emailRoutes);

const PORT = process.env.BACKEND_PORT || 5001;

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Accepting requests from: ${frontendUrl}`);
  if (!process.env.NODEMAILER_HOST) {
    console.warn("Nodemailer environment variables (NODEMAILER_HOST, etc.) are not set. Email sending will likely fail.");
  }
  if (!process.env.SENDER_PASSWORD) {
    console.warn("SENDER_PASSWORD environment variable is not set. Saving credentials to DB will be incomplete for the password part.");
  }
});
