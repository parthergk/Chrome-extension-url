import mongoose from "mongoose";

export async function connectToDB() {
  const uri = process.env.DB_URI;
  if (!uri) {
    throw new Error("Missing DB_URI in environment variables");
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ Database connected");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
}
