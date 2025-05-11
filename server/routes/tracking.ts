
// server/routes/tracking.ts
import express from 'express';
import path from 'path';
import TrackedAccess from '../models/trackedAccess'; // Mongoose model for tracked access

const router = express.Router();

// GET /api/track/file/:trackingId?recipient_email=...&subject=...
router.get('/file/:trackingId', async (req, res) => {
  const { trackingId } = req.params;
  const recipientEmail = req.query.recipient_email as string;
  const emailSubject = req.query.subject as string; // Optional subject for context

  console.log(`Tracking link accessed: ID=${trackingId}, Recipient=${recipientEmail}, Subject=${emailSubject || 'N/A'}`);
  console.log('Full query parameters:', req.query);


  if (!recipientEmail) {
    console.warn(`Tracking link accessed for ID ${trackingId} without recipient_email. Query:`, req.query);
    return res.status(400).send('Recipient email is required for tracking.');
  }


  try {
    const existingAccess = await TrackedAccess.findOne({ trackingId });
    if (existingAccess) {
      console.log(`Tracking ID ${trackingId} already logged for ${existingAccess.recipientEmail} at ${existingAccess.accessedAt}. Current access by ${recipientEmail}.`);
      // Optionally update timestamp or log re-access, but for simplicity, we'll just serve the file.
    } else {
      console.log(`Attempting to log new access. Tracking ID: ${trackingId}, Recipient: ${recipientEmail}, Subject: ${emailSubject || 'N/A'}`);
      const newTrackedAccess = new TrackedAccess({
        trackingId,
        recipientEmail,
        emailSubject: emailSubject || 'N/A', // Store subject if provided
        accessedAt: new Date(),
      });
      try {
        await newTrackedAccess.save();
        console.log(`Successfully logged new access to MongoDB for Tracking ID: ${trackingId}, Recipient: ${recipientEmail}`);
      } catch (dbSaveError: any) {
        console.error(`MongoDB save error for new access. Tracking ID: ${trackingId}, Recipient: ${recipientEmail}. Error:`, dbSaveError);
        // Continue to serve the file even if DB save fails, but the error is logged.
      }
    }

    // Serve the stable file
    const filePath = path.resolve(process.cwd(), 'server/public/trackable/document.txt');
    
    console.log(`Attempting to serve file: ${filePath} for Tracking ID: ${trackingId}`);
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`Error sending file for Tracking ID ${trackingId} to ${recipientEmail}. File path: ${filePath}. Error:`, err);
        // It's important to check if headers were already sent before sending another response
        if (!res.headersSent) {
          res.status(500).send('Error accessing the document. Please try again later.');
        }
      } else {
        console.log(`Successfully served document.txt for Tracking ID ${trackingId} to ${recipientEmail}`);
      }
    });

  } catch (error: any) {
    console.error(`Outer catch block: Error processing tracking for ID ${trackingId}, Recipient ${recipientEmail}. Error:`, error);
    if (!res.headersSent) {
      res.status(500).send('An error occurred while processing your request.');
    }
  }
});

export default router;

