import express from "express";
import { 
  createUser, 
  getUserByEmail, 
  getCurrentUserProfile, 
  updateUserProfile 
} from "../controllers/usercontroller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/", createUser);
router.get("/", getUserByEmail);

// Protected routes - require authentication
router.get("/profile", authenticate, getCurrentUserProfile);
router.put("/profile", authenticate, updateUserProfile);

export default router;
