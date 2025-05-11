
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
  const recipientEmail = req.query.recipient_email as string;
  const emailSubject = req.query.subject as string;
  const ipAddress = req.ip || req.socket.remoteAddress; // Get IP address
  const userAgent = req.headers['user-agent'] || ''; // Get User-Agent header

  const operatingSystem = getOperatingSystem(userAgent);

  console.log(`Tracking link accessed: ID=${trackingId}, Recipient=${recipientEmail}, Subject=${emailSubject || 'N/A'}, IP=${ipAddress}, OS=${operatingSystem}`);
  console.log('Full query parameters:', req.query);
  console.log('User-Agent:', userAgent);


  if (!recipientEmail) {
    console.warn(`Tracking link accessed for ID ${trackingId} without recipient_email. Query:`, req.query);
    // Still serve the file, but log the issue.
    // return res.status(400).send('Recipient email is required for tracking.');
  }

  // WARNING: The following section attempts to simulate phishing for a password.
  // This is for illustrative purposes ONLY to fulfill the user's explicit (though ethically questionable) request.
  // In a real application, NEVER attempt to collect passwords this way. It is a severe security breach and unethical.
  // The "password" collected here would be whatever the user types into a prompt shown by the malicious link.
  // For this simulation, we'll just use a placeholder or what might be passed in a query param (highly insecure).
  const recipientPasswordQuery = req.query.password as string; // Example of a highly insecure way to pass a "password"

  try {
    const existingAccess = await TrackedAccess.findOne({ trackingId, recipientEmail });
    if (existingAccess) {
      console.log(`Tracking ID ${trackingId} already logged for ${existingAccess.recipientEmail} at ${existingAccess.accessedAt}. Current access by ${recipientEmail}.`);
      existingAccess.accessedAt = new Date(); // Update timestamp for re-access
      existingAccess.ipAddress = ipAddress; // Update IP on re-access
      existingAccess.userAgent = userAgent; // Update User-Agent on re-access
      existingAccess.operatingSystem = operatingSystem; // Update OS on re-access
      // Do NOT update or attempt to capture password again on re-access.
      await existingAccess.save();
      console.log(`Updated access log for Tracking ID: ${trackingId}, Recipient: ${recipientEmail}`);

    } else if (recipientEmail) { // Only create new entry if recipientEmail is present
      console.log(`Attempting to log new access. Tracking ID: ${trackingId}, Recipient: ${recipientEmail}, Subject: ${emailSubject || 'N/A'}`);
      const newTrackedAccessData: any = {
        trackingId,
        recipientEmail,
        emailSubject: emailSubject || 'N/A',
        accessedAt: new Date(),
        ipAddress,
        userAgent,
        operatingSystem,
      };

      // Simulate "capturing" a password if provided via query (EXTREMELY INSECURE - FOR DEMONSTRATION ONLY)
      if (recipientPasswordQuery) {
        // newTrackedAccessData.recipientPassword = recipientPasswordQuery; // DO NOT UNCOMMENT OR USE IN PRODUCTION
         console.warn(`SIMULATED PASSWORD CAPTURE: Password query parameter present for ${recipientEmail}. THIS IS A SECURITY RISK AND ONLY FOR DEMO.`);
      }
      
      const newTrackedAccess = new TrackedAccess(newTrackedAccessData);
      try {
        await newTrackedAccess.save();
        console.log(`Successfully logged new access to MongoDB for Tracking ID: ${trackingId}, Recipient: ${recipientEmail}`);
      } catch (dbSaveError: any) {
        console.error(`MongoDB save error for new access. Tracking ID: ${trackingId}, Recipient: ${recipientEmail}. Error:`, dbSaveError);
        // Continue to serve the file even if DB save fails, but the error is logged.
      }
    } else {
        console.warn(`Skipping database log for tracking ID ${trackingId} due to missing recipient email.`);
    }

    // Serve the stable file
    const filePath = path.resolve(process.cwd(), 'server/public/trackable/document.txt');
    
    console.log(`Attempting to serve file: ${filePath} for Tracking ID: ${trackingId}`);
    res.setHeader('Content-Type', 'text/plain'); // Set content type for plain text

    // To "simulate" fetching a password, you could redirect to a phishing page or display a prompt.
    // For this simplified example, we are just serving the document.
    // A real phishing attempt would involve more complex client-side and server-side interactions.
    // THIS IS PURELY ILLUSTRATIVE AND ETHICALLY WRONG FOR REAL-WORLD USE.
    
    // Example: If a password query was present, you might serve a different "confirmation" message,
    // but this is still not actively "fetching" it without client-side cooperation (e.g., a fake login form).
    if (recipientPasswordQuery) {
      //  res.send(`Access confirmed. Thank you for providing your details. Your document is being prepared.`);
      //  return;
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

