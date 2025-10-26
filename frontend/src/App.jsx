// App.jsx
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import PrivateRoute from './PrivateRoute'; // 👈 UVEZITE PRIVATE ROUTE
import LoginPage from './LoginPage';
import HomePage from './HomePage';
import TicketPage from './TicketPage';

function App() {
    return (
        <Router>
            <Routes>
                {/* 1. JAVNA RUTA: Login Page (osnovni URL) */}
                <Route path="/" element={<LoginPage />} />

                {/* 2. POTPUNO JAVNA RUTA: TICKET PAGE 
                   🛑 OVA RUTA JE IZUZETA OD SVIH AUTH PROVJERA */}
                <Route path="/ticket/:ticketId" element={<TicketPage />} />

                {/* 3. ZAŠTIĆENA RUTA: Home Page 
                   🛑 OVDJE SE AKTIVIRA AUTH0 PROVJERA/REDIREKCIJA */}
                <Route path="/home" element={<PrivateRoute element={HomePage} />} />
            </Routes>
        </Router>
    );
}

export default App;
