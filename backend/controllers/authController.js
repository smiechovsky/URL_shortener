import bcrypt from "bcrypt";
import { pool } from "../utils/db.js";
import { signToken } from "../utils/jwt.js";

export const register = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, hash]
    );
    const token = signToken({ id: user.rows[0].id, email });
    res.json({ token });
  } catch (err) {
    err.status = 400;
    err.message = "User exists or registration error";
    next(err);
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (!user.rows.length) {
      const err = new Error("No user");
      err.status = 400;
      return next(err);
    }
    const valid = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!valid) {
      const err = new Error("Wrong password");
      err.status = 400;
      return next(err);
    }
    const token = signToken({ id: user.rows[0].id, email });
    res.json({ token });
  } catch (err) {
    next(err);
  }
};