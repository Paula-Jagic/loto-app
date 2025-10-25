import express from 'express';
import session from 'express-session';
import { auth } from 'express-openid-connect';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import ticketsRoutes from "./routes/tickets.routes.js";
import roundsRoutes from "./routes/rounds.routes.js";


dotenv.config();

const app = express();

const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: 'https://loto-app-frontend-ht8o.onrender.com',
  credentials: true
}));

app.use(express.json());



app.use(session({
  secret: process.env.AUTH0_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
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
    redirect_uri: `${process.env.AUTH0_BASE_URL}/auth/callback`
  }
};


app.use(auth(config));


app.get('/', (req, res) => {
  res.send('Loto app backend is running!');
});


app.get('/auth/profile', (req, res) => {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ message: "Not logged in" });
  }
  res.json(req.oidc.user);
});


app.get('/auth/custom-login', (req, res) => {
  res.oidc.login({
    returnTo: 'https://loto-app-frontend-ht8o.onrender.com'
      
  });
});


app.use("/auth", authRoutes);
app.use("/tickets", ticketsRoutes);
app.use("/rounds", roundsRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});