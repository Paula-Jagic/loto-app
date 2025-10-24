import express from "express";
import { pool } from "../db/db.js";
import { requireMachineAuth } from '../middlewares/auth.js';
const router = express.Router();

// GET /rounds/current
router.get("/current", async (req, res) => {
  try {
    const activeRoundResult = await pool.query(
      `SELECT id, status, drawn_numbers 
       FROM rounds 
       WHERE status = 'active' 
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    let round;
    
    if (activeRoundResult.rows.length > 0) {
      round = activeRoundResult.rows[0];
    } else {
      const lastRoundResult = await pool.query(
        `SELECT id, status, drawn_numbers 
         FROM rounds 
         ORDER BY created_at DESC 
         LIMIT 1`
      );
      
      if (lastRoundResult.rows.length === 0) {
        return res.json({ 
          isActive: false, 
          ticketCount: 0, 
          drawnNumbers: null 
        });
      }
      
      round = lastRoundResult.rows[0];
    }
    
    const ticketCount = await pool.query(
      "SELECT COUNT(*) FROM tickets WHERE round_id = $1",
      [round.id]
    );

    res.json({
      isActive: round.status === 'active',
      ticketCount: parseInt(ticketCount.rows[0].count),
      drawnNumbers: round.drawn_numbers
    });
    
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /close
router.post("/close", requireMachineAuth, async (req, res) => {
  try {
    await pool.query(
      "UPDATE rounds SET status = 'closed', closed_at = NOW() WHERE status = 'active'"
    );
    
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: "Error closing round" });
  }
});

// POST /store-results
router.post("/store-results", requireMachineAuth, async (req, res) => {
  try {
    const { numbers } = req.body;
    
    if (!numbers || !Array.isArray(numbers)) {
      return res.status(400).json({ message: "Numbers array is required" });
    }

    const roundResult = await pool.query(
      "SELECT id FROM rounds WHERE status = 'closed' AND drawn_numbers IS NULL ORDER BY created_at DESC LIMIT 1"
    );

    if (roundResult.rows.length === 0) {
      return res.status(400).json({ 
        message: "No closed round without results found" 
      });
    }

    const roundId = roundResult.rows[0].id;
    
    await pool.query(
      "UPDATE rounds SET drawn_numbers = $1 WHERE id = $2",
      [numbers, roundId]
    );

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: "Error storing results" });
  }
});

// POST /new-round
router.post("/new-round", requireMachineAuth, async (req, res) => {
  try {
    await pool.query(
      "UPDATE rounds SET status = 'closed', closed_at = NOW() WHERE status = 'active'"
    );

    await pool.query(
      "INSERT INTO rounds (status) VALUES ('active')"
    );

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: "Error activating new round" });
  }
});

// GET /rounds/latest-drawn
router.get("/latest-drawn", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT drawn_numbers FROM rounds 
       WHERE drawn_numbers IS NOT NULL 
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      return res.json({ drawnNumbers: null });
    }

    res.json({
      drawnNumbers: result.rows[0].drawn_numbers
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching drawn numbers" });
  }
});

export default router;