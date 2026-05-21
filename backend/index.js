import dotenv from "dotenv";
import app from "./src/app.js";
import { connectDb } from "./src/config/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`BNI API running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
