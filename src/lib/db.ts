// src/lib/db.ts
import { MongoClient, ServerApiVersion, type Db, type Collection } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'mailcannon_db';
const MONGODB_CREDENTIALS_COLLECTION = process.env.MONGODB_CREDENTIALS_COLLECTION || 'sender_credentials';

if (!MONGODB_URI) {
  console.warn(
    'MONGODB_URI environment variable is not set. Database operations will be skipped. ' +
    'Please set it in your .env.local file (e.g., MONGODB_URI="mongodb://localhost:27017").'
  );
}
if (!process.env.SENDER_EMAIL || !process.env.SENDER_PASSWORD) {
    console.warn(
        'SENDER_EMAIL or SENDER_PASSWORD environment variables are not set. ' +
        'Saving credentials will be skipped or incomplete. ' + 
        'Please set them in your .env.local file. Storing passwords in env vars is insecure.'
    );
}


interface MongoGlobal extends NodeJS.Global {
    _mongoClientPromise?: Promise<MongoClient>;
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

async function getMongoClient(): Promise<MongoClient> {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set. Cannot connect to the database.");
  }
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as MongoGlobal;
    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(MONGODB_URI, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        }
      });
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function saveCredentials(email: string, password?: string): Promise<void> {
  if (!MONGODB_URI) {
    console.warn("MONGODB_URI not set, skipping saveCredentials.");
    return;
  }
  if (!email) { // Password can be undefined if not set in env
    console.warn("Email not provided to saveCredentials, skipping.");
    return;
  }

  try {
    const mongoClient = await getMongoClient();
    const db: Db = mongoClient.db(MONGODB_DB_NAME);
    const collection: Collection = db.collection(MONGODB_CREDENTIALS_COLLECTION);

    // IMPORTANT: Storing passwords, especially in plain text or lightly secured environment variables, 
    // is a major security risk. This implementation is based on the user's specific request.
    // In a real-world production application, this practice is highly discouraged.
    // Consider using secure credential management services or OAuth for email sending.
    await collection.insertOne({
      email,
      password, // Storing password - HIGHLY INSECURE
      createdAt: new Date(),
    });
    console.log(`Credentials for ${email} (and potentially password) saved to MongoDB collection '${MONGODB_CREDENTIALS_COLLECTION}' in database '${MONGODB_DB_NAME}'.`);
  } catch (error) {
    console.error('Failed to save credentials to MongoDB:', error);
    // Optionally, rethrow or handle more gracefully if this is critical path
    // For now, we log the error and continue, as per typical background task behavior.
  }
}
