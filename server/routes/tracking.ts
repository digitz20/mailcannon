
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

  if (!recipientEmail) {
    // Though the link should always include it, handle missing case.
    console.warn(`Tracking link accessed for ID ${trackingId} without recipient_email.`);
    return res.status(400).send('Recipient email is required for tracking.');
  }

  console.log(`Tracking link accessed: ID=${trackingId}, Recipient=${recipientEmail}`);

  try {
    const existingAccess = await TrackedAccess.findOne({ trackingId });
    if (existingAccess) {
      console.log(`Tracking ID ${trackingId} already logged for ${existingAccess.recipientEmail} at ${existingAccess.accessedAt}. Re-access by ${recipientEmail}.`);
      // Optionally update timestamp or log re-access, but for simplicity, we'll just serve the file.
    } else {
      const newTrackedAccess = new TrackedAccess({
        trackingId,
        recipientEmail,
        emailSubject: emailSubject || 'N/A', // Store subject if provided
        accessedAt: new Date(),
      });
      await newTrackedAccess.save();
      console.log(`Logged new access for Tracking ID: ${trackingId}, Recipient: ${recipientEmail}`);
    }

    // Serve the stable file
    // IMPORTANT: Ensure this path is correct and the file exists.
    // The path should be relative to the project root if using process.cwd(),
    // or __dirname if relative to the current file's directory.
    const filePath = path.resolve(process.cwd(), 'server/public/trackable/document.txt');
    
    // Set appropriate headers for file download if desired, or inline display for text.
    // For a .txt file, 'Content-Type': 'text/plain' is usually fine for inline.
    // To force download, use 'Content-Disposition': 'attachment; filename="document.txt"'
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        // Don't expose internal error details to the client if sensitive
        res.status(500).send('Error accessing the document. Please try again later.');
      } else {
        console.log(`Served document.txt for tracking ID ${trackingId} to ${recipientEmail}`);
      }
    });

  } catch (error: any) {
    console.error('Error logging tracked access or serving file:', error);
    res.status(500).send('An error occurred while processing your request.');
  }
});

export default router;
