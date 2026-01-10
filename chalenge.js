import express from "express";
import multer from "multer";
import auth from "../middleware/auth.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.get("/today", auth, (req, res) => {
  res.json({
    id: "today",
    title: "Take a photo with your best friend",
    expiresAt: "23:59:59"
  });
});

router.post("/submit", auth, upload.single("photo"), (req, res) => {
  // save submission
  res.json({ success: true });
});

export default router;

