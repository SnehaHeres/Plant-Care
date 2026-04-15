import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import asyncHandler from "express-async-handler";
import Plant from "../models/Plant.js";

dotenv.config();

// =================================================================
// 🤖 PLANT BOT FUNCTION — UPDATED WITH LATEST @google/genai SDK
// =================================================================
export const getPlantBotResponse = asyncHandler(async (req, res) => {

  const { prompt } = req.body;

  if (!prompt) {
    res.status(400);
    throw new Error("Please provide a prompt for the Plant Bot.");
  }

  try {
    // ✅ Initialize Gemini with latest SDK (supports both API_KEY and GEMINI_API_KEY)
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY
    });

    // ✅ Use gemini-3-pro model (best price-performance for chat)
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a helpful assistant named Plant Bot.
Provide clear, concise and practical advice about plants.
Question: ${prompt}`
    });
    
    console.log("✅ AI Response received successfully");
    const responseText = response.text;

    res.json({ reply: responseText });

  } catch (error) {
    console.error("🔴 AI Request Failed:", error);
    res.status(500).json({
      error: "AI Request Failed",
      details: error.message,
    });
  }
});


// =================================================================
// 🌿 HELPER FUNCTION: Calculate next watering date
// =================================================================
const calculateNextWatering = (lastWatered, frequency) => {
  if (!lastWatered || !frequency) return null;
  const nextDate = new Date(lastWatered);
  nextDate.setDate(nextDate.getDate() + frequency);
  return nextDate;
};


// =================================================================
// 🌱 ADD NEW PLANT
// @route     POST /api/plants
// @access    Private
// =================================================================
export const addPlant = asyncHandler(async (req, res) => {
  const {
    name,
    species,
    location,
    image,
    lastWatered,
    wateringFrequency,
    health,
    notes,
    reminderEnabled,
    category,
  } = req.body;

  if (!name) {
    res.status(400);
    throw new Error("Please provide both name and species");
  }

  const plant = new Plant({
    user: req.user._id,
    name,
    species,
    location,
    category,
    image,
    lastWatered,
    wateringFrequency,
    health,
    notes,
    reminderEnabled,
  });

  if (plant.lastWatered && plant.wateringFrequency) {
    plant.nextWatering = calculateNextWatering(
      plant.lastWatered,
      plant.wateringFrequency
    );
  }

  const createdPlant = await plant.save();
  res.status(201).json(createdPlant);
});


// =================================================================
// 🌿 GET ALL PLANTS
// @route     GET /api/plants
// @access    Private
// =================================================================
export const getPlants = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.pageNumber) || 1;

  const keyword = req.query.keyword
    ? { name: { $regex: req.query.keyword, $options: "i" } }
    : {};

  const count = await Plant.countDocuments({ user: req.user._id, ...keyword });

  let plants = await Plant.find({ user: req.user._id, ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .sort({ createdAt: -1 });

  plants = plants.map((plant) => {
    let reminder = null;
    if (plant.nextWatering) {
      const daysLeft = Math.ceil(
        (new Date(plant.nextWatering) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft <= 1) {
        reminder =
          daysLeft === 1
            ? "💧 Water tomorrow"
            : daysLeft === 0
            ? "💧 Water today!"
            : "⚠️ Overdue for watering!";
      }
    }
    return { ...plant.toObject(), reminder };
  });

  res.json({
    plants,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
});


// =================================================================
// 🌼 GET SINGLE PLANT
// @route     GET /api/plants/:id
// @access    Private
// =================================================================
export const getPlantById = asyncHandler(async (req, res) => {
  const plant = await Plant.findById(req.params.id);

  if (!plant || plant.user.toString() !== req.user._id.toString()) {
    res.status(404);
    throw new Error("Plant not found");
  }

  res.json(plant);
});


// =================================================================
// 🌻 UPDATE PLANT
// @route     PUT /api/plants/:id
// @access    Private
// =================================================================
export const updatePlant = asyncHandler(async (req, res) => {
  const plant = await Plant.findById(req.params.id);

  if (!plant || plant.user.toString() !== req.user._id.toString()) {
    res.status(404);
    throw new Error("Plant not found");
  }

  const {
    name,
    species,
    location,
    image,
    lastWatered,
    wateringFrequency,
    health,
    notes,
    reminderEnabled,
    category,
    favourite,
  } = req.body;

  if (name) plant.name = name;
  if (species) plant.species = species;
  if (location) plant.location = location;
  if (category) plant.category = category;
  if (image) plant.image = image;
  if (lastWatered) plant.lastWatered = lastWatered;
  if (wateringFrequency) plant.wateringFrequency = wateringFrequency;
  if (health) plant.health = health;
  if (notes) plant.notes = notes;
  if (reminderEnabled !== undefined) plant.reminderEnabled = reminderEnabled;
  if (favourite !== undefined) plant.favourite = favourite;

  if (plant.lastWatered && plant.wateringFrequency) {
    plant.nextWatering = calculateNextWatering(
      plant.lastWatered,
      plant.wateringFrequency
    );
  }

  const updatedPlant = await plant.save();
  res.json(updatedPlant);
});


// =================================================================
// 🍃 DELETE PLANT
// @route     DELETE /api/plants/:id
// @access    Private
// =================================================================
export const deletePlant = asyncHandler(async (req, res) => {
  const plant = await Plant.findById(req.params.id);

  if (!plant || plant.user.toString() !== req.user._id.toString()) {
    res.status(404);
    throw new Error("Plant not found");
  }

  await plant.deleteOne();
  res.json({ message: "Plant removed" });
});


// =================================================================
// 🌸 TOGGLE FAVOURITE
// @route     PATCH /api/plants/:id/favourite
// @access    Private
// =================================================================
export const toggleFavourite = asyncHandler(async (req, res) => {
  const plant = await Plant.findById(req.params.id);

  if (!plant || plant.user.toString() !== req.user._id.toString()) {
    res.status(404);
    throw new Error("Plant not found");
  }

  plant.favourite = !plant.favourite;
  await plant.save();

  res.json({
    message: "Favourite status updated",
    favourite: plant.favourite,
  });
});
