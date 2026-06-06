import React, { useState } from "react";
import { searchGames, generateGameContentWithGemini } from "../services/gameInfo";

export default function GameSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiContent, setAiContent] = useState({}); // Map of game.id to generated content
  const [aiLoading, setAiLoading] = useState(new Set()); // Set of game.id currently loading

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const games = await searchGames(query.trim());
    setResults(games);
    setLoading(false);
  };

  const handleAiClick = async (game) => {
    // Add to loading set
    setAiLoading(prev => new Set(prev).add(game.id));
    try {
      const content = await generateGameContentWithGemini(game.name, game.released);
      setAiContent(prev => ({ ...prev, [game.id]: content }));
    } catch (error) {
      console.error('Error generating AI content:', error);
      // Optionally show error to user
    } finally {
      // Remove from loading set
      setAiLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(game.id);
        return newSet;
      });
    }
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
            <li key={game.id} style={{ marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #eee" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                <strong>{game.name}</strong> ({new Date(game.released).getFullYear()})
                {game.background_image && (
                  <img src={game.background_image} alt={game.name} style={{ width: "100px", height: "60px", objectFit: "cover", marginLeft: "0.5rem", borderRadius: "4px" }} />
                )}
              </div>
              
              {/* AI Content Section */}
              {aiContent[game.id] && (
                <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
                  <h3 style={{ color: "#2c3e50", marginTop: "0" }}>{aiContent[game.id].seo_title}</h3>
                  <p style={{ color: "#34495e", marginBottom: "1rem" }}>{aiContent[game.id].summary}</p>
                  
                  <div>
                    <h4 style={{ color: "#2c3e50", marginTop: "0" }}>Đánh giá lối chơi</h4>
                    {/* Using dangerouslySetInnerHTML because gameplay contains <p> tags from AI */}
                    <div 
                      dangerouslySetInnerHTML={{ __html: aiContent[game.id].gameplay }} 
                      style={{ color: "#2c3e50", lineHeight: "1.6" }}
                    />
                  </div>
                  
                  <div style={{ marginTop: "1.5rem" }}>
                    <h4 style={{ color: "#2c3e50", marginTop: "0" }}>Cấu hình hệ thống</h4>
                    <p><strong>Tối thiểu:</strong> {aiContent[game.id].system_requirements.minimum}</p>
                    <p><strong>Đề nghị:</strong> {aiContent[game.id].system_requirements.recommended}</p>
                  </div>
                  
                  <div style={{ marginTop: "1.5rem" }}>
                    <h4 style={{ color: "#2c3e50", marginTop: "0" }}>Mẹo chơi</h4>
                    <p style={{ color: "#2c3e50", fontStyle: "italic" }}>{aiContent[game.id].faq}</p>
                  </div>
                </div>
              )}
              
              {/* AI Button */}
              {!aiContent[game.id] && (
                <button 
                  onClick={() => handleAiClick(game)}
                  disabled={aiLoading.has(game.id)}
                  style={{ 
                    backgroundColor: aiLoading.has(game.id) ? "#95a5a6" : "#3498db",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    cursor: aiLoading.has(game.id) ? "not-allowed" : "pointer"
                  }}
                >
                  {aiLoading.has(game.id) ? "Đang tạo..." : "Tự động viết bài bằng AI"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}