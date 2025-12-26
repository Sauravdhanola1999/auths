import mongoose from "mongoose";

export const connectToDatabase = async (): Promise<void> => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connection has been established");
  } catch (error) {
    console.error("Error in Database connection:", error);
    process.exit(1);
  }
};
