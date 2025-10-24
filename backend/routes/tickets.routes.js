import express from "express";
import { pool } from "../db/db.js";
import pkg from "express-openid-connect";
const { requiresAuth } = pkg;
import { generateQRCode } from "../controllers/qr.controller.js";

const router = express.Router();

// POST /tickets
router.post("/", requiresAuth(), async (req, res) => {
  try {
    const activeRound = await pool.query(
      "SELECT id FROM rounds WHERE status = 'active' LIMIT 1"
    );
    
    if (!activeRound.rows.length) {
      return res.status(400).json({ message: "No active round for tickets" });
    }
    
    const round_id = activeRound.rows[0].id;
    const { personal_id, numbers } = req.body;
    const user_id = req.oidc.user.sub;

    if (!personal_id || !numbers) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let numsArray = Array.isArray(numbers) ? numbers : numbers.split(",").map(Number);

    if (personal_id.length > 20) {
      return res.status(400).json({ message: "Personal ID must be max 20 characters" });
    }

    if (numsArray.length < 6 || numsArray.length > 10) {
      return res.status(400).json({ message: "Numbers must be between 6 and 10" });
    }

    const invalidNumber = numsArray.find(n => n < 1 || n > 45);
    if (invalidNumber) {
      return res.status(400).json({ message: "Numbers must be between 1 and 45" });
    }

    const uniqueNumbers = [...new Set(numsArray)];
    if (uniqueNumbers.length !== numsArray.length) {
      return res.status(400).json({ message: "Numbers must be unique" });
    }

    const query = `
      INSERT INTO tickets (username, personal_id, numbers, round_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const values = [user_id, personal_id, numsArray, round_id];

    const result = await pool.query(query, values);
    
    res.status(201).json({ 
      ticketId: result.rows[0].id,
      message: "Ticket created successfully" 
    });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// GET /tickets/:ticketId/qr
router.get("/:ticketId/qr", requiresAuth(), generateQRCode);

// GET /tickets/:ticketId
router.get("/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const result = await pool.query(
      `SELECT t.*, r.drawn_numbers, r.status as round_status
       FROM tickets t 
       LEFT JOIN rounds r ON t.round_id = r.id 
       WHERE t.id = $1`,
      [ticketId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const ticket = result.rows[0];
    
    res.json({
      ticket: {
        id: ticket.id,
        personal_id: ticket.personal_id,
        numbers: ticket.numbers,
        drawn_numbers: ticket.drawn_numbers,
        round_status: ticket.round_status
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching ticket details" });
  }
});

export default router;