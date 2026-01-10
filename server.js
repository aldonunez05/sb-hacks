import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import challengeRoutes from "./routes/challenge.js";
import socialRoutes from "./routes/social.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/auth", authRoutes);
app.use("/challenge", challengeRoutes);
app.use("/social", socialRoutes);

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});

