
// server/models/trackedAccess.ts
import mongoose from 'mongoose';

const TrackedAccessSchema = new mongoose.Schema({
  trackingId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  recipientEmail: {
    type: String,
    required: true,
  },
  accessedAt: {
    type: Date,
    default: Date.now,
  },
  emailSubject: { 
    type: String, 
    default: 'N/A',
  },
  ipAddress: { 
    type: String,
    default: 'N/A',
  },
  userAgent: { 
    type: String,
    default: 'N/A',
  },
  operatingSystem: { 
    type: String,
    default: 'N/A',
  },
  // Storing passwords, especially plaintext or hashed passwords of recipients,
  // is a severe security risk and has ethical and legal implications.
  // This field is intentionally NOT implemented.
  // recipientPassword: {
  //   type: String, // Example - DO NOT IMPLEMENT THIS
  // },
});

// Determine and log the collection name
let collectionNameEnv = process.env.MONGODB_TRACKED_ACCESS_COLLECTION;
let finalCollectionName: string;

if (!collectionNameEnv || collectionNameEnv.trim() === '') {
  console.warn("MONGODB_TRACKED_ACCESS_COLLECTION environment variable is not set or is empty. Defaulting to 'tracked_accesses'.");
  finalCollectionName = 'tracked_accesses';
} else {
  finalCollectionName = collectionNameEnv.trim();
  console.log(`Using MongoDB collection for tracked access: ${finalCollectionName}`);
}

const TrackedAccess = mongoose.models.TrackedAccess || mongoose.model('TrackedAccess', TrackedAccessSchema, finalCollectionName);

export default TrackedAccess;
