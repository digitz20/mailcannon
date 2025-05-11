
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
  emailSubject: { // Optional: to give context to the tracked link
    type: String, 
  },
});

// Use the collection name from environment variable or default to 'tracked_accesses'
const collectionName = process.env.MONGODB_TRACKED_ACCESS_COLLECTION || 'tracked_accesses';

const TrackedAccess = mongoose.models.TrackedAccess || mongoose.model('TrackedAccess', TrackedAccessSchema, collectionName);

export default TrackedAccess;
