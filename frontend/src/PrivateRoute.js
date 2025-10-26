// PrivateRoute.jsx

import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ element: Element }) => {
    // 1. Koristite Auth0 Hook da biste provjerili status
    const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

    if (isLoading) {
        // Prikazuje loading stanje dok Auth0 provjerava sesiju
        return <div className="p-8 text-center">Loading authentication...</div>;
    }

    if (!isAuthenticated) {
        // 2. Ako NIJE prijavljen, aktivirajte Auth0 preusmjeravanje.
        // OVO je mehanizam koji preusmjerava na login.
        loginWithRedirect({
            // Nakon prijave, Auth0 će vratiti korisnika na /home
            appState: { returnTo: '/home' } 
        }); 
        
        // Vraća null dok se ne završi preusmjeravanje na login
        return null;
    }

    // 3. Ako JE prijavljen, prikaži komponentu (HomePage)
    return <Element />;
};

export default PrivateRoute;