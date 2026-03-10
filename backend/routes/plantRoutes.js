import express from "express";
import {
  addPlant,
  deletePlant,
  getPlantBotResponse,
  getPlantById,
  getPlants,
  toggleFavourite,
  updatePlant,
} from "../controllers/plantController.js";
import { protect } from "../middleware/authMiddleware.js"; // ensure user is logged in

const router = express.Router();

// CRUD Routes
router.post("/", protect, addPlant);
router.get("/", protect, getPlants);
router.get("/:id", protect, getPlantById);
router.put("/:id", protect, updatePlant);
router.delete("/:id", protect, deletePlant);

// Plant Bot Route
router.route("/ask-bot").post(protect, getPlantBotResponse); // <-- Yeh line ab kaam karegi

// Extra Route
router.patch("/:id/favourite", protect, toggleFavourite);

export default router;