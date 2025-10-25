export const login = (req, res) => {
  res.oidc.login({ returnTo: "/home" });
};

export const callback = (req, res) => {
  console.log(req.oidc.user); 
  res.redirect("http://localhost:5173/home"); 
};

export const logout = (req, res) => {
  const returnTo = process.env.NODE_ENV === 'production' 
    ? 'https://loto-app-frontend-ht8o.onrender.com'
    : 'http://localhost:5173';
  res.oidc.logout({ returnTo });
};