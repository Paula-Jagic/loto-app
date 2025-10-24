export const login = (req, res) => {
  res.oidc.login({ returnTo: "/home" });
};

export const callback = (req, res) => {
  console.log(req.oidc.user); 
  res.redirect("http://localhost:5173/home"); 
};

export const logout = (req, res) => {
  res.oidc.logout({ returnTo: "http://localhost:5173" });
};
