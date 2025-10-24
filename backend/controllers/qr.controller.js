import QRCode from 'qrcode';
import { pool } from '../db/db.js';

export const generateQRCode = async (req, res) => {
  try {
    const { ticketId } = req.params;
    

    const ticketResult = await pool.query(
      `SELECT t.*, r.drawn_numbers, r.status as round_status
       FROM tickets t 
       LEFT JOIN rounds r ON t.round_id = r.id 
       WHERE t.id = $1`,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const ticket = ticketResult.rows[0];
    
    
    const ticketUrl = `http://localhost:5173/ticket/${ticketId}`;
    
    
    const qrCodeImage = await QRCode.toDataURL(ticketUrl);
    
    console.log("QR code generated for URL:", ticketUrl); 
    
    res.json({
      qrCode: qrCodeImage,  
      ticketUrl: ticketUrl,  
      ticket: {
        id: ticket.id,
        personal_id: ticket.personal_id,
        numbers: ticket.numbers,
        drawn_numbers: ticket.drawn_numbers,
        round_status: ticket.round_status
      }
    });
  } catch (err) {
    console.error("QR generation error:", err);
    res.status(500).json({ message: "Error generating QR code" });
  }
};