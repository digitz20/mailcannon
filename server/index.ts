
// server/index.ts
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local from project root. This should be one of the first things.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import express from 'express';
import cors from 'cors';
import connectDB from './config/db';
import emailRoutes from './routes/email';
import trackingRoutes from './routes/tracking'; // Import tracking routes

const app = express();

// Connect to Database
connectDB();

// Middleware
const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:9002';
app.use(cors({
  origin: frontendUrl,
}));

app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// Define Routes
app.use('/api/email', emailRoutes);
app.use('/api/track', trackingRoutes); // Add tracking routes

// Optional: Serve static files from server/public if needed directly (e.g., for images in emails not via tracking)
// app.use('/public', express.static(path.join(__dirname, 'public')));


// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Express error:", err); 
  
  const errorDetails = process.env.NODE_ENV === 'development' ? { stack: err.stack, details: err.message } : { details: err.message || 'An internal server error occurred.' };
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.',
  });
});


const PORT = process.env.BACKEND_PORT || 7000;

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Accepting requests from: ${frontendUrl}`);
  if (!process.env.NODEMAILER_HOST) {
    console.warn("Nodemailer environment variables (NODEMAILER_HOST, etc.) are not set. Email sending will likely fail.");
  }
  if (!process.env.SENDER_PASSWORD) {
    console.warn("SENDER_PASSWORD environment variable is not set. Saving credentials to DB will be incomplete for the password part.");
  }
   if (!process.env.MONGODB_URI) {
    console.error('FATAL ERROR: MONGODB_URI is not defined. MongoDB connection failed at startup check in index.ts.');
  }
  if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
    console.warn('WARNING: NEXT_PUBLIC_BACKEND_URL is not set in .env.local. Tracking links in emails will not work.');
  }
});
