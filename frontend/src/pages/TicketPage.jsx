import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const TicketPage = () => {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await fetch(`${API_URL}/tickets/${ticketId}`, {
  credentials: "include"  // ← DODAJ OVO!
});
          // ← PROMIJENJENO
        if (res.ok) {
          const data = await res.json();
          setTicket(data.ticket);
        } else {
          setError("Ticket not found");
        }
      } catch (err) {
        setError("Error fetching ticket");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-pink-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded shadow p-6">
        <h1 className="text-xl font-bold text-pink-800 mb-4 text-center">
          Ticket #{ticket.id.substring(0, 8)}
        </h1>
        
        <div className="mb-4">
          <div className="text-sm text-gray-600">Personal ID</div>
          <div className="text-lg font-semibold">{ticket.personal_id}</div>
        </div>

        <div className="mb-6">
          <div className="text-sm text-gray-600 mb-2">Your Numbers</div>
          <div className="flex flex-wrap gap-2">
            {ticket.numbers.map((num, index) => (
              <div key={index} className="w-10 h-10 bg-pink-500 text-white rounded flex items-center justify-center font-bold">
                {num}
              </div>
            ))}
          </div>
        </div>

        {ticket.drawn_numbers ? (
          <div className="bg-green-50 p-4 rounded">
            <div className="text-sm text-gray-600 mb-2">Drawn Numbers</div>
            <div className="flex flex-wrap gap-2">
              {ticket.drawn_numbers.map((num, index) => (
                <div key={index} className="w-10 h-10 bg-green-500 text-white rounded flex items-center justify-center font-bold">
                  {num}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 p-4 rounded text-center">
            <p className="text-gray-600">
              Numbers not drawn yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketPage;