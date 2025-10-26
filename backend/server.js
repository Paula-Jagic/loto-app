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
app.set('trust proxy', 1);

const PORT = process.env.PORT || 8080;
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use(cors({
  origin: 'https://loto-app-frontend-ht8o.onrender.com',
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: process.env.AUTH0_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: true,          // cookie se šalje samo preko HTTPS
    httpOnly: true,        // zaštita od JS pristupa
    sameSite: 'None',      // obavezno za cross-domain (frontend-backend različiti)
    maxAge: 24 * 60 * 60 * 1000 ,// 1 dan
    
  }
}));

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: process.env.AUTH0_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASEURL,
  routes: {
    callback: '/auth/callback',
  },
  authorizationParams: {
    redirect_uri: `${process.env.AUTH0_BASE_URL}/auth/callback`,
    response_type: 'code'
  }
};

app.use(auth(config));

// DODANO: Session debug middleware
app.use((req, res, next) => {
  if (req.path === '/auth/callback' || req.path === '/auth/profile') {
    console.log('=== SESSION DEBUG ===');
    console.log('Path:', req.path);
    console.log('Session ID:', req.sessionID);
    console.log('OIDC Authenticated:', req.oidc?.isAuthenticated?.());
    console.log('OIDC User:', req.oidc?.user);
    console.log('Cookies in request:', req.headers.cookie);
    console.log('=====================');
  }
  next();
});

// DODANO: Custom Auth0 callback handler
app.get('/auth/callback', (req, res, next) => {
  console.log('=== CUSTOM AUTH0 CALLBACK HANDLER ===');
  console.log('isAuthenticated:', req.oidc.isAuthenticated());
  console.log('User:', req.oidc.user);
  
  if (req.oidc.isAuthenticated()) {
    console.log('✅ LOGIN SUCCESSFUL - Manual session handling');
    
    // Eksplicitno spremi session
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regenerate error:', err);
        return next(err);
      }
      
      // Spremi user info u session
      req.session.userId = req.oidc.user.sub;
      req.session.userEmail = req.oidc.user.email;
      req.session.isAuthenticated = true;
      
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return next(err);
        }
        
        console.log('✅ SESSION SAVED MANUALLY');
        console.log('Session ID:', req.sessionID);
        console.log('Session data:', req.session);
        
        // Redirect na frontend
        return res.redirect('https://loto-app-frontend-ht8o.onrender.com/#/home');
      });
    });
  } else {
    console.log('❌ AUTHENTICATION FAILED IN CALLBACK');
    next();
  }
});

// Error handling za Auth0
app.use('/auth', (err, req, res, next) => {
  console.error('Auth0 Error:', err);
  res.status(500).json({ 
    error: 'Authentication failed',
    details: err.message 
  });
});

app.get('/', (req, res) => {
  res.send('Loto app backend is running!');
});

app.get('/auth/profile', (req, res) => {
  console.log('=== /auth/profile called ===');
  console.log('req.oidc.isAuthenticated():', req.oidc.isAuthenticated());
  console.log('req.oidc.user:', req.oidc.user);
  console.log('req.headers:', req.headers);
  
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
  const returnTo = process.env.NODE_ENV === 'production' 
    ? 'https://loto-app-frontend-ht8o.onrender.com'
    : 'http://localhost:5173';
  res.oidc.logout({ returnTo });
});

// DODANO: Session check endpoint za debug
app.get('/auth/session-debug', (req, res) => {
  console.log('=== SESSION DEBUG ENDPOINT ===');
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('OIDC Authenticated:', req.oidc?.isAuthenticated?.());
  console.log('OIDC User:', req.oidc?.user);
  console.log('Request cookies:', req.headers.cookie);
  
  res.json({
    sessionId: req.sessionID,
    sessionData: req.session,
    isAuthenticated: req.oidc?.isAuthenticated?.(),
    oidcUser: req.oidc?.user,
    hasCookies: !!req.headers.cookie
  });
});

// ADMIN ENDPOINTS - direktno na root path kako je specificirano
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