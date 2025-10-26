import QRCode from 'qrcode';
import { pool } from '../db/db.js';

export const generateQRCode = async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // **KORAK 1: Dohvaćanje URL-a frontenda iz varijable okruženja**
    // Ovu varijablu (FRONTEND_APP_URL) morate definirati na Renderu
    // (npr. https://loto-app-frontend-ht8o.onrender.com)   
    const FRONTEND_URL = process.env.FRONTEND_APP_URL;

    if (!FRONTEND_URL) {
      console.error("FRONTEND_APP_URL is not set in environment variables.");
      return res.status(500).json({ message: "Server configuration error: Frontend URL missing." });
    }

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
    
    // **KORAK 2: Ispravan URL za QR kod**
    // Koristite varijablu okruženja i dodajte '#/ticket/' za Hash Router
    const ticketUrl = `${FRONTEND_URL}/#/ticket/${ticketId}`; // 🛑 ISPRAVLJENO
    console.log('QR URL:', ticketUrl); // DODAJ OVO
    
    
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