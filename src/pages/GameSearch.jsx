import React, { useState } from "react";
import { searchGames } from "../services/gameInfo";

export default function GameSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const games = await searchGames(query.trim());
    setResults(games);
    setLoading(false);
  };

  return (
    <div className="game-search" style={{ padding: "1rem" }}>
      <h2>Tìm thông tin game</h2>
      <form onSubmit={handleSearch} style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Nhập tên game..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ padding: "0.5rem", width: "60%" }}
        />
        <button type="submit" style={{ marginLeft: "0.5rem", padding: "0.5rem 1rem" }}>
          {loading ? "Đang tìm..." : "Tìm"}
        </button>
      </form>
      {results.length > 0 && (
        <ul>
          {results.map((game) => (
            <li key={game.id} style={{ marginBottom: "0.5rem" }}>
              <strong>{game.name}</strong> ({new Date(game.released).getFullYear()})
              {game.background_image && (
                <img src={game.background_image} alt={game.name} style={{ width: "100px", marginLeft: "0.5rem" }} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
