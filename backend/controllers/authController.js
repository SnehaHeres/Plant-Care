import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

//===========================================================
// 1. REGISTER A NEW USER
//===========================================================
export const registerUser = async (req, res) => {
  try {
    // Frontend se 'name', 'email', aur 'password' lenge
    const { name, email, password } = req.body;

    // Check karenge ki user email se pehle se exist karta hai ya nahi
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // 'name' ko hi 'username' ki tarah use karenge aur check karenge ki woh unique hai ya nahi
    const usernameExists = await User.findOne({ username: name });
    if (usernameExists) {
      return res.status(400).json({ message: "This name is already taken. Please choose another." });
    }

    // 'name' aur 'username' dono mein 'name' ki value daal kar naya user banayenge
    const user = await User.create({
      name: name,
      username: name, // Sabse zaroori badlaav
      email: email,
      password: password
    });

    // Agar user safaltapoorvak ban gaya to response bhejenge
    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }

  } catch (error) {
    console.error("Register Error:", error.message);
    res.status(500).json({ message: "Server Error during registration" });
  }
};

//===========================================================
// 2. LOGIN (AUTHENTICATE) USER
//===========================================================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        username: user.username, // username bhi response mein add kar diya
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error during login" });
  }
};

//===========================================================
// 3. GET USER PROFILE
//===========================================================
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch(error) {
    res.status(500).json({ message: "Server Error fetching profile" });
  }
};