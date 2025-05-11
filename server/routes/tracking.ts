
// server/routes/tracking.ts
import express from 'express';
import path from 'path';
import TrackedAccess from '../models/trackedAccess'; // Mongoose model for tracked access
// Optional: For more detailed OS parsing, you might use a library like 'ua-parser-js'
// import UAParser from 'ua-parser-js';

const router = express.Router();

// Function to attempt to parse OS from User-Agent string
// This is a simplified parser. For robust parsing, use a dedicated library.
function getOperatingSystem(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  if (userAgent.includes('Windows NT 10.0')) return 'Windows 10/11';
  if (userAgent.includes('Windows NT 6.3')) return 'Windows 8.1';
  if (userAgent.includes('Windows NT 6.2')) return 'Windows 8';
  if (userAgent.includes('Windows NT 6.1')) return 'Windows 7';
  if (userAgent.includes('Windows NT 6.0')) return 'Windows Vista';
  if (userAgent.includes('Windows NT 5.1') || userAgent.includes('Windows XP')) return 'Windows XP';
  if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS X')) return 'macOS';
  if (userAgent.includes('Linux')) {
    if (userAgent.includes('Android')) return 'Android';
    return 'Linux';
  }
  if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iPod')) return 'iOS';
  return 'Unknown';
}


// GET /api/track/file/:trackingId?recipient_email=...&subject=...
router.get('/file/:trackingId', async (req, res) => {
  const { trackingId } = req.params;
  const recipientEmail = req.query.recipient_email as string; // Will be undefined if not present
  const emailSubject = req.query.subject as string; // Will be undefined if not present
  const ipAddress = req.ip || req.socket.remoteAddress; 
  const userAgent = req.headers['user-agent'] || ''; 

  const operatingSystem = getOperatingSystem(userAgent);

  console.log(`Tracking link accessed: ID=${trackingId}, Recipient=${recipientEmail || 'N/A'}, Subject=${emailSubject || 'N/A'}, IP=${ipAddress}, OS=${operatingSystem}`);
  console.log('Full query parameters:', req.query);
  console.log('User-Agent:', userAgent);


  if (!recipientEmail) {
    console.warn(`Tracking link accessed for ID ${trackingId} without recipient_email. Query:`, req.query);
    // The logic below will skip DB logging if recipientEmail is falsy.
  }

  // WARNING: The following section comments refer to simulating phishing for a password.
  // This is for illustrative purposes ONLY to fulfill a user's past explicit (though ethically questionable) request.
  // In a real application, NEVER attempt to collect passwords this way. It is a severe security breach and unethical.
  const recipientPasswordQuery = req.query.password as string; 

  try {
    const existingAccess = await TrackedAccess.findOne({ trackingId, recipientEmail });
    if (existingAccess) {
      console.log(`Tracking ID ${trackingId} already logged for ${existingAccess.recipientEmail} at ${existingAccess.accessedAt}. Current access by ${recipientEmail}.`);
      existingAccess.accessedAt = new Date(); 
      existingAccess.ipAddress = ipAddress || 'N/A'; 
      existingAccess.userAgent = userAgent || 'N/A'; 
      existingAccess.operatingSystem = operatingSystem || 'N/A'; 
      // Do NOT update or attempt to capture password again on re-access.
      await existingAccess.save();
      console.log(`Updated access log for Tracking ID: ${trackingId}, Recipient: ${recipientEmail}. Document ID: ${existingAccess._id}`);

    } else if (recipientEmail && recipientEmail.trim() !== "") { // Only create new entry if recipientEmail is present and not empty
      console.log(`Attempting to log new access. Tracking ID: ${trackingId}, Recipient: ${recipientEmail}, Subject: ${emailSubject || 'N/A'}`);
      
      const newTrackedAccessData = {
        trackingId,
        recipientEmail,
        emailSubject: emailSubject || 'N/A',
        accessedAt: new Date(),
        ipAddress: ipAddress || 'N/A',
        userAgent: userAgent || 'N/A',
        operatingSystem: operatingSystem || 'N/A',
      };

      console.log('Data to be saved to MongoDB:', JSON.stringify(newTrackedAccessData, null, 2));

      // Simulate "capturing" a password if provided via query (EXTREMELY INSECURE - FOR DEMONSTRATION ONLY)
      if (recipientPasswordQuery) {
        // newTrackedAccessData.recipientPassword = recipientPasswordQuery; // DO NOT UNCOMMENT OR USE IN PRODUCTION
         console.warn(`SIMULATED PASSWORD CAPTURE: Password query parameter present for ${recipientEmail}. THIS IS A SECURITY RISK AND ONLY FOR DEMO.`);
      }
      
      const newTrackedAccess = new TrackedAccess(newTrackedAccessData);
      try {
        await newTrackedAccess.save();
        console.log(`Successfully logged new access to MongoDB for Tracking ID: ${trackingId}, Recipient: ${recipientEmail}. Document ID: ${newTrackedAccess._id}`);
      } catch (dbSaveError: any) {
        console.error(`MongoDB save error for new access. Tracking ID: ${trackingId}, Recipient: ${recipientEmail}.`);
        console.error('Error Name:', dbSaveError.name);
        console.error('Error Message:', dbSaveError.message);
        if (dbSaveError.errors) {
            console.error('Validation Errors:', JSON.stringify(dbSaveError.errors, null, 2));
        }
        // console.error('Full save error object:', JSON.stringify(dbSaveError, Object.getOwnPropertyNames(dbSaveError), 2)); // More verbose
      }
    } else {
        console.warn(`Skipping database log for tracking ID ${trackingId} due to missing or empty recipient email. Received: '${recipientEmail}'`);
    }

    // Serve the stable file
    const filePath = path.resolve(process.cwd(), 'server/public/trackable/document.txt');
    
    console.log(`Attempting to serve file: ${filePath} for Tracking ID: ${trackingId}`);
    res.setHeader('Content-Type', 'text/plain'); 

    if (recipientPasswordQuery) {
      console.warn("SIMULATED PASSWORD 'HANDLING': A password query parameter was detected. This part of the code is for demonstration of a harmful request and should not be used.");
    }

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`Error sending file for Tracking ID ${trackingId} to ${recipientEmail || 'Unknown Recipient'}. File path: ${filePath}. Error:`, err);
        if (!res.headersSent) {
          res.status(500).send('Error accessing the document. Please try again later.');
        }
      } else {
        console.log(`Successfully served document.txt for Tracking ID ${trackingId} to ${recipientEmail || 'Unknown Recipient'}`);
      }
    });

  } catch (error: any) {
    console.error(`Outer catch block: Error processing tracking for ID ${trackingId}, Recipient ${recipientEmail || 'Unknown Recipient'}. Error:`, error);
    if (!res.headersSent) {
      res.status(500).send('An error occurred while processing your request.');
    }
  }
});

export default router;
