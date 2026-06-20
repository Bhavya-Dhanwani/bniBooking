import mongoose from "mongoose";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

let connectionPromise = null;

export async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!connectionPromise) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI is not configured.");
    }

    mongoose.set("strictQuery", true);
    connectionPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10000,
        family: 4,
      })
      .then((conn) => {
        console.log(`[DB] MongoDB connected to ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      })
      .catch((error) => {
        connectionPromise = null;
        console.error("[DB] MongoDB connection failed:", error.message);
        throw error;
      });
  }

  await connectionPromise;
  return mongoose.connection;
}

export function isDatabaseConnectionError(error) {
  const message = String(error?.message || "");
  return [
    "ECONNREFUSED",
    "ETIMEOUT",
    "ENOTFOUND",
    "querySrv",
    "Server selection timed out",
    "MONGO_URI is not configured",
  ].some((text) => message.includes(text));
}
