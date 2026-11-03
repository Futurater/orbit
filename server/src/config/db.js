import mongoose from 'mongoose';

export async function connectDB() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/orbit';
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[MongoDB] Connected successfully to ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error) {
    console.warn(`[MongoDB Warning] Could not connect to MongoDB at ${mongoURI}: ${error.message}`);
    console.warn(`[MongoDB Note] Ensure MongoDB is running locally or provide a valid Atlas URI in server/.env (MONGO_URI).`);
    return false;
  }
}
