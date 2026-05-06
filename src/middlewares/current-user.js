import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/index.js";

const currentUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) return next()
    const token = authHeader?.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    req.currentUser = payload;
  } catch (error) { }
  next();
}

export { currentUser }