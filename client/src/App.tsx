import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
  message: string;
};

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/health");

        if (!response.ok) {
          throw new Error("Backend request failed");
        }

        const data: HealthResponse = await response.json();
        setHealth(data);
      } catch {
        setError("Could not connect to the SiteTrack API");
      }
    };

    checkBackend();
  }, []);

  return (
    <main>
      <h1>SiteTrack</h1>
      <h2>Construction Project & Field Operations Platform</h2>

      {health && (
        <div>
          <p>Backend Status: {health.status}</p>
          <p>{health.message}</p>
        </div>
      )}

      {error && <p>{error}</p>}
    </main>
  );
}

export default App;