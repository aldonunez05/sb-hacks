import express from "express";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/friends", auth, (req, res) => {
  res.json([
    { name: "Alexia", lastActive: "2h ago" },
    { name: "Carter", lastActive: "5h ago" }
  ]);
});

router.get("/leaderboard", auth, (req, res) => {
  res.json([
    { name: "Alexia", completed: 52 },
    { name: "Carter", completed: 49 }
  ]);
});

export default router;

