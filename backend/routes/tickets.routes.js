import express from "express";
import { pool } from "../db/db.js";
import pkg from "express-openid-connect";
const { requiresAuth } = pkg;
import { generateQRCode } from "../controllers/qr.controller.js";

const router = express.Router();

// POST /tickets
router.post("/", requiresAuth(), async (req, res) => {
  try {
    console.log('=== TICKET SUBMISSION STARTED ===');
    console.log('User:', req.oidc.user);
    console.log('Request body:', req.body);

    // 1. Provjeri database connection
    console.log('Checking database connection...');
    const dbCheck = await pool.query('SELECT NOW()');
    console.log('Database connection OK');

    // 2. Provjeri active round
    console.log('Checking for active round...');
    const activeRound = await pool.query(
      "SELECT id FROM rounds WHERE status = 'active' LIMIT 1"
    );
    
    console.log('Active round result:', activeRound.rows);
    
    if (!activeRound.rows.length) {
      console.log('No active round found');
      return res.status(400).json({ message: "No active round for tickets" });
    }
    
    const round_id = activeRound.rows[0].id;
    const { personal_id, numbers } = req.body;
    const user_id = req.oidc.user.sub;

    console.log('Processing ticket for round:', round_id);
    console.log('Personal ID:', personal_id);
    console.log('Numbers:', numbers);

    // 3. Validacija
    if (!personal_id || !numbers) {
      console.log('Missing required fields');
      return res.status(400).json({ message: "Missing required fields" });
    }

    let numsArray = Array.isArray(numbers) ? numbers : numbers.split(",").map(Number);
    console.log('Parsed numbers array:', numsArray);

    if (personal_id.length > 20) {
      console.log('Personal ID too long');
      return res.status(400).json({ message: "Personal ID must be max 20 characters" });
    }

    if (numsArray.length < 6 || numsArray.length > 10) {
      console.log('Invalid numbers count:', numsArray.length);
      return res.status(400).json({ message: "Numbers must be between 6 and 10" });
    }

    const invalidNumber = numsArray.find(n => n < 1 || n > 45);
    if (invalidNumber) {
      console.log('Invalid number found:', invalidNumber);
      return res.status(400).json({ message: "Numbers must be between 1 and 45" });
    }

    const uniqueNumbers = [...new Set(numsArray)];
    if (uniqueNumbers.length !== numsArray.length) {
      console.log('Duplicate numbers found');
      return res.status(400).json({ message: "Numbers must be unique" });
    }

    // 4. Spremi u bazu
    console.log('Inserting ticket into database...');
    const query = `
      INSERT INTO tickets (username, personal_id, numbers, round_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const values = [user_id, personal_id, numsArray, round_id];

    console.log('Executing query with values:', values);
    const result = await pool.query(query, values);
    console.log('Ticket inserted successfully, ID:', result.rows[0].id);
    
    res.status(201).json({ 
      ticketId: result.rows[0].id,
      message: "Ticket created successfully" 
    });
    
  } catch (err) {
    console.error('ERROR IN TICKET SUBMISSION:');
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error detail:', err.detail);
    console.error('Error stack:', err.stack);
    
    // Detaljniji error handling za različite tipove grešaka
    if (err.code === '23505') { 
      return res.status(400).json({ message: "Ticket already exists" });
    } else if (err.code === '23503') { 
      return res.status(400).json({ message: "Invalid round reference" });
    } else if (err.code === '22P02') { 
      return res.status(400).json({ message: "Invalid data format" });
    }
    
    res.status(500).json({ message: "Database error: " + err.message });
  }
});

// GET /tickets/:ticketId/qr
router.get("/:ticketId/qr",  generateQRCode);
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
    console.error('Error:', err);
    res.status(500).json({ message: "Error fetching ticket" });
  }
});

export default router;