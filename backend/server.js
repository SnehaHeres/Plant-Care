import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import plantRoutes from "./routes/plantRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:5173", "https://plant-care-kappa-flame.vercel.app"],
    credentials: true,
  })
);

app.use("/api/auth", authRoutes); //this is a middleware for auth routes

app.use("/api/plants", plantRoutes); //this is a middleware for plant routes

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server Error" });
});

const PORT = process.env.PORT || 5000;

// =================================================================
// CHECK KARNE KE LIYE YEH LINE ADD KI GAYI HAI
console.log("✅ Server starting... API Key Loaded:", process.env.GEMINI_API_KEY);
// =================================================================

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
