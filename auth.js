import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();
const users = []; // replace with DB

router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  const user = { id: crypto.randomUUID(), email, password: hash, streak: 0 };
  users.push(user);

  res.json({ success: true });
});

router.post("/login", async (req, res) => {
  const user = users.find(u => u.email === req.body.email);
  if (!user) return res.sendStatus(401);

  const valid = await bcrypt.compare(req.body.password, user.password);
  if (!valid) return res.sendStatus(401);

  const token = jwt.sign({ id: user.id }, "SECRET_KEY");
  res.json({ token });
});

export default router;

