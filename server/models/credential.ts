
// server/models/credential.ts
import mongoose from 'mongoose';

const CredentialSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
  },
  password: { // Storing passwords, especially in this manner, is highly insecure.
    type: String,
    // Password is not strictly required here, as it might come from env or be omitted.
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Use the collection name from environment variable or default to 'sender_credentials'
const collectionName = process.env.MONGODB_CREDENTIALS_COLLECTION || 'sender_credentials';

// Check if the model already exists to prevent OverwriteModelError in HMR environments
const Credential = mongoose.models.Credential || mongoose.model('Credential', CredentialSchema, collectionName);

export default Credential;
