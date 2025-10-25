import React, { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL;

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [personalId, setPersonalId] = useState("");
  const [numbers, setNumbers] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [qrCode, setQrCode] = useState(null);
  const [ticketId, setTicketId] = useState(() => {
    return localStorage.getItem('lastTicketId') || null;
  });
  const [roundInfo, setRoundInfo] = useState({
    isActive: false,
    ticketCount: 0,
    drawnNumbers: null
  });
  const [currentRoundId, setCurrentRoundId] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/auth/profile`, { credentials: "include" })  // ← PROMIJENJENO
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => console.error(err));

    fetchRoundInfo();
    
    if (ticketId) {
      loadQrCodeForTicket(ticketId);
    }
  }, []);

  const fetchRoundInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/rounds/current`, {  // ← PROMIJENJENO
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        
        
        if (data.isActive && currentRoundId !== data.id) {
          setRoundInfo({
            ...data,
            drawnNumbers: null  
          });
          setCurrentRoundId(data.id);
        } else {
          setRoundInfo(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch round info");
    }
  };

  const loadQrCodeForTicket = async (ticketId) => {
    try {
      const qrRes = await fetch(`${API_URL}/tickets/${ticketId}/qr`, {  // ← PROMIJENJENO
        credentials: "include"
      });
      if (qrRes.ok) {
        const qrData = await qrRes.json();
        setQrCode(qrData.qrCode);
      }
    } catch (qrErr) {
      console.error("Error loading QR code");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setQrCode(null);

    if (!personalId || personalId.length > 20) {
      setError("Personal ID must be 1-20 characters");
      return;
    }

    const numsArray = numbers
      .split(",")
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n));

    if (numsArray.length < 6 || numsArray.length > 10) {
      setError("Enter 6 to 10 numbers");
      return;
    }

    if (new Set(numsArray).size !== numsArray.length) {
      setError("Numbers must be unique");
      return;
    }

    if (numsArray.some((n) => n < 1 || n > 45)) {
      setError("Numbers must be between 1 and 45");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/tickets`, {  // ← PROMIJENJENO
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          personal_id: personalId,
          numbers: numsArray,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Something went wrong");
      } else {
        const result = await res.json();
        setSuccess("Ticket submitted successfully!");
        setTicketId(result.ticketId);
        localStorage.setItem('lastTicketId', result.ticketId);
        
        if (result.ticketId) {
          try {
            const qrRes = await fetch(`${API_URL}/tickets/${result.ticketId}/qr`, {  // ← PROMIJENJENO
              credentials: "include"
            });
            if (qrRes.ok) {
              const qrData = await qrRes.json();
              setQrCode(qrData.qrCode);
            }
          } catch (qrErr) {
            console.error("Error fetching QR code");
          }
        }
        setPersonalId("");
        setNumbers("");
        fetchRoundInfo();
      }
    } catch (err) {
      setError("Failed to submit ticket");
    }
  };

  return (
    <div className="min-h-screen bg-pink-50 p-4">
      <div className="flex justify-between items-center mb-6 bg-pink-500 text-white p-4 rounded">
        <div>{user?.email}</div>
        <div className="text-xl font-bold">Loto 6/45</div>
        <button
          onClick={() =>
            (window.location.href =
              `${API_URL}/auth/logout?returnTo=${FRONTEND_URL}/login`)  // ← PROMIJENJENO
          }
          className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700"
        >
          Log out
        </button>
      </div>

      <div className="mb-6 bg-white p-4 rounded shadow">
        <h3 className="text-lg font-bold mb-3">Current Round</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-600">Status</div>
            <div className={`text-lg font-semibold ${roundInfo.isActive ? 'text-green-600' : 'text-red-600'}`}>
              {roundInfo.isActive ? "Active" : "Closed"}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-600">Tickets</div>
            <div className="text-lg font-semibold">{roundInfo.ticketCount}</div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-600">Drawn Numbers</div>
            <div className="text-lg font-semibold">
              {roundInfo.drawnNumbers ? (
                <div className="text-green-600">
                  {roundInfo.drawnNumbers.join(", ")}
                </div>
              ) : (
                <div className="text-gray-500">
                  -
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {roundInfo.isActive ? (
        <div className="flex justify-end">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-96">
            <h2 className="text-xl font-bold mb-4">Submit Ticket</h2>
            {error && <p className="text-red-600 mb-2">{error}</p>}
            {success && <p className="text-green-600 mb-2">{success}</p>}

            <div className="mb-4">
              <label className="block font-semibold mb-1">Personal ID</label>
              <input
                type="text"
                value={personalId}
                onChange={(e) => setPersonalId(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter your personal ID"
              />
            </div>

            <div className="mb-4">
              <label className="block font-semibold mb-1">
                Numbers (comma-separated)
              </label>
              <input
                type="text"
                value={numbers}
                onChange={(e) => setNumbers(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g., 1,2,3,4,5,6"
              />
              <div className="text-xs text-gray-500 mt-1">
                Enter 6-10 unique numbers between 1-45
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-pink-500 text-white font-semibold rounded hover:bg-pink-600"
            >
              Submit Ticket
            </button>
          </form>
        </div>
      ) : (
        <div className="flex justify-end">
          <div className="bg-yellow-50 p-6 rounded shadow w-96">
            <h2 className="text-xl font-bold mb-4">Submissions Closed</h2>
            <p className="text-yellow-700 mb-3">
              Ticket submissions are currently closed. Please wait for the next round to start.
            </p>
            <div className="text-sm text-yellow-600">
              <div className="mb-2"><strong>Current status:</strong> {roundInfo.ticketCount} tickets submitted</div>
              {roundInfo.drawnNumbers && (
                <div className="mt-3 p-3 bg-white rounded border border-yellow-200">
                  <strong>Drawn numbers:</strong> 
                  <div className="font-bold text-yellow-700 mt-1">
                    {roundInfo.drawnNumbers.join(", ")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {qrCode && (
        <div className="mt-6 flex justify-end">
          <div className="bg-white p-6 rounded shadow w-96">
            <h2 className="text-xl font-bold mb-4 text-center">Your Ticket QR Code</h2>
            
            <div className="text-center">
              <img 
                src={qrCode} 
                alt="Ticket QR Code" 
                className="mx-auto w-64 h-64 border-2 border-pink-300 rounded shadow mb-4"
              />
              
              {ticketId && (
                <div className="bg-pink-50 p-3 rounded border border-pink-200">
                  <p className="text-sm text-pink-600 font-semibold mb-2">Direct Ticket Link:</p>
                  <a 
                    href={`${FRONTEND_URL}/ticket/${ticketId}`}  // ← PROMIJENJENO
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-700 underline break-all"
                  >
                    {FRONTEND_URL}/ticket/{ticketId}
                  </a>
                  <p className="text-xs text-pink-500 mt-1 text-center">
                    Scan QR code or click the link to view your ticket
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;