import { auth } from 'express-oauth2-jwt-bearer';

export const requireMachineAuth = auth({
  issuerBaseURL: 'https://dev-v4b5fqo8x5y8wkkx.us.auth0.com/',
  audience: 'https://loto-api',
});