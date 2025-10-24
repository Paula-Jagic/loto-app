import React from "react";

const LoginPage = () => {
  const handleLogin = () => {
    window.location.href = "http://localhost:8080/auth/custom-login";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-8">Loto 6/45</h1>
      <button
        onClick={handleLogin}
        className="px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Log in
      </button>
    </div>
  );
};

export default LoginPage;