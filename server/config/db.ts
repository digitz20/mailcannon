
// server/config/db.ts
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI is not defined in .env.local. MongoDB connection failed.');
      process.exit(1); // Exit process with failure
    }
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected successfully.');
  } catch (err: any) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
