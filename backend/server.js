import express from 'express';
import session from 'express-session';
import { auth } from 'express-openid-connect';
import dotenv from 'dotenv';
import cors from 'cors';
import ticketsRoutes from "./routes/tickets.routes.js";
import roundsRoutes from "./routes/rounds.routes.js";
import pool from './db/db.js';  
import { requireMachineAuth } from './middlewares/auth.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 8080;

// DODAJ OVO NA POČETAK ZA DEBUG
app.use((req, res, next) => {
  console.log('=== INCOMING REQUEST ===');
  console.log(`${req.method} ${req.path}`);
  console.log('Origin:', req.headers.origin);
  console.log('Cookies:', req.headers.cookie);
  console.log('========================');
  next();
});

// POBOLJŠAJ CORS CONFIG
app.use(cors({
  origin: 'https://loto-app-frontend-ht8o.onrender.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Accept'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());

// KLJUČNO: PROMIJENI SESSION CONFIG ZA PRODUKCIJU
app.use(session({
  secret: process.env.AUTH0_SECRET,
  resave: false,
  saveUninitialized: false, // PROMIJENI U false zbog sigurnosti
  cookie: { 
    secure: true, // PROMIJENI U true ZA PRODUKCIJU
    httpOnly: true,
    sameSite: 'none', // KLJUČNO ZA CROSS-DOMAIN
    maxAge: 24 * 60 * 60 * 1000 // 24 sata
  },
  name: 'loto.sid' // Eksplicitno ime cookiea
}));

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: process.env.AUTH0_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASEURL,
  routes: {
    callback: '/auth/callback',
  },
  authorizationParams: {
    redirect_uri: `${process.env.AUTH0_BASE_URL}/auth/callback`,
    response_type: 'code' // PROMIJENI U 'code'
  },
  // DODAJ SESSION CONFIG
  session: {
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: 'none'
    }
  }
};

app.use(auth(config));

// DODAJ TEST ENDPOINT ZA SESSION
app.get('/auth/debug-session', (req, res) => {
  console.log('=== DEBUG SESSION ===');
  console.log('Session ID:', req.sessionID);
  console.log('Session:', req.session);
  console.log('OIDC isAuthenticated:', req.oidc?.isAuthenticated?.());
  console.log('OIDC user:', req.oidc?.user);
  
  res.json({
    sessionId: req.sessionID,
    isAuthenticated: req.oidc?.isAuthenticated?.(),
    user: req.oidc?.user,
    cookies: req.headers.cookie
  });
});

app.get('/', (req, res) => {
  res.send('Loto app backend is running!');
});

app.get('/auth/profile', (req, res) => {
  console.log('=== /auth/profile called ===');
  console.log('req.oidc.isAuthenticated():', req.oidc.isAuthenticated());
  console.log('req.oidc.user:', req.oidc.user);
  console.log('req.headers.cookie:', req.headers.cookie);
  
  if (!req.oidc.isAuthenticated()) {
    console.log('User NOT authenticated');
    return res.status(401).json({ message: "Not logged in" });
  }
  
  console.log('User authenticated:', req.oidc.user.email);
  res.json(req.oidc.user);
});

app.get('/auth/custom-login', (req, res) => {
  res.oidc.login({
    returnTo: 'https://loto-app-frontend-ht8o.onrender.com/#/home'
  });
});

app.get('/auth/custom-logout', (req, res) => {
  const returnTo = 'https://loto-app-frontend-ht8o.onrender.com';
  res.oidc.logout({ returnTo });
});

// ADMIN ENDPOINTS
app.post('/new-round', requireMachineAuth, async (req, res) => {
  try {
    console.log('Activating new round...');
    
    await pool.query(
      "UPDATE rounds SET status = 'closed', closed_at = NOW() WHERE status = 'active'"
    );

    await pool.query(
      "INSERT INTO rounds (status) VALUES ('active')"
    );

    console.log('New round activated successfully');
    res.status(204).send();
  } catch (err) {
    console.error('Error in /new-round:', err);
    res.status(500).json({ message: "Error activating new round" });
  }
});

app.post('/close', requireMachineAuth, async (req, res) => {
  try {
    console.log('Closing current round...');
    
    await pool.query(
      "UPDATE rounds SET status = 'closed', closed_at = NOW() WHERE status = 'active'"
    );
    
    console.log('Round closed successfully');
    res.status(204).send();
  } catch (err) {
    console.error('Error in /close:', err);
    res.status(500).json({ message: "Error closing round" });
  }
});

app.post('/store-results', requireMachineAuth, async (req, res) => {
  try {
    const { numbers } = req.body;
    
    console.log('Storing results:', numbers);
    
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

    console.log('Results stored successfully for round:', roundId);
    res.status(204).send();
  } catch (err) {
    console.error('Error in /store-results:', err);
    res.status(500).json({ message: "Error storing results" });
  }
});

// Ostale rute
app.use("/tickets", ticketsRoutes);
app.use("/rounds", roundsRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});