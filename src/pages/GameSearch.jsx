import React, { useState, useRef } from "react";
import { searchGames, generateGameContentWithGemini } from "../services/gameInfo";
import { Sparkles, Search, Loader2, ChevronDown, ChevronUp, Cpu, Monitor, HelpCircle, FileText, AlertTriangle } from "lucide-react";

// Safe paragraph renderer to prevent XSS from AI output or raw API strings
const renderSafeHtmlParagraphs = (htmlText) => {
  if (!htmlText) return null;
  const paragraphs = htmlText
    .replace(/<\/?p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '') // Strip remaining HTML tags (<script>, <img>, etc.)
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean);

  return paragraphs.map((para, idx) => (
    <p key={idx} style={{ marginBottom: '0.8rem', lineHeight: '1.6' }}>{para}</p>
  ));
};

export default function GameSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiContent, setAiContent] = useState({}); // Map of game.id to generated content
  const [aiLoading, setAiLoading] = useState(new Set()); // Set of game.id currently loading
  const [aiErrors, setAiErrors] = useState({}); // Map of game.id to error messages
  const [expandedCards, setExpandedCards] = useState(new Set()); // Track expanded AI content cards
  const [hasSearched, setHasSearched] = useState(false);
  const [autoGenerateAi, setAutoGenerateAi] = useState(false);
  const resultsRef = useRef(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setAiContent({});
    setAiErrors({});
    setExpandedCards(new Set());
    
    const games = await searchGames(query.trim());
    setResults(games);
    setLoading(false);

    // Scroll to results smoothly
    if (games.length > 0) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

      // Tự động chạy ngầm viết bài nếu được chọn
      if (autoGenerateAi) {
        handleAiGenerateAll(games);
      }
    }
  };

  const handleAiClick = async (game) => {
    // Add to loading set
    setAiLoading(prev => new Set(prev).add(game.id));
    // Clear any previous error
    setAiErrors(prev => {
      const next = { ...prev };
      delete next[game.id];
      return next;
    });
    
    try {
      // Pass the standardized game.name from RAWG (not the user's raw query)
      // along with extra context for better AI accuracy
      const content = await generateGameContentWithGemini(
        game.name,        // Standardized name from RAWG
        game.released,    // Official release date
        {
          genres: game.genres || [],
          platforms: game.platforms || [],
          rating: game.rating,
          metacritic: game.metacritic
        }
      );
      setAiContent(prev => ({ ...prev, [game.id]: content }));
      // Auto-expand the card when content is ready
      setExpandedCards(prev => new Set(prev).add(game.id));
    } catch (error) {
      console.error('Error generating AI content:', error);
      setAiErrors(prev => ({ 
        ...prev, 
        [game.id]: error.message || 'Không thể tạo nội dung AI. Vui lòng thử lại.' 
      }));
    } finally {
      // Remove from loading set
      setAiLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(game.id);
        return newSet;
      });
    }
  };

  const handleAiGenerateAll = async (gamesToProcess = null) => {
    const targetGames = gamesToProcess || results;
    if (targetGames.length === 0) return;
    
    // Viết bài lần lượt cho từng game để tránh rate limit
    for (const game of targetGames) {
      if (aiContent[game.id]) continue;
      await handleAiClick(game);
    }
  };

  const toggleExpanded = (gameId) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  return (
    <div className="gs-container">
      {/* Hero Search Area */}
      <div className="gs-hero">
        <div className="gs-hero-glow" />
        <div className="gs-hero-content">
          <div className="gs-hero-icon">
            <Sparkles size={28} />
          </div>
          <h1 className="gs-hero-title">Tìm kiếm Game bằng AI</h1>
          <p className="gs-hero-subtitle">
            Tìm game từ cơ sở dữ liệu RAWG và để AI tự động viết bài đánh giá chi tiết bằng tiếng Việt
          </p>
          
          <form onSubmit={handleSearch} className="gs-search-form">
            <div className="gs-search-wrapper">
              <Search size={20} className="gs-search-icon" />
              <input
                id="ai-game-search-input"
                type="text"
                placeholder="Nhập tên game... (ví dụ: Elden Ring, GTA V, Cyberpunk)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="gs-search-input"
              />
              <button 
                id="ai-game-search-submit"
                type="submit" 
                className="gs-search-btn"
                disabled={loading || !query.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="gs-spinner" />
                    <span>Đang tìm...</span>
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    <span>Tìm kiếm</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.88rem', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={autoGenerateAi}
                onChange={(e) => setAutoGenerateAi(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
              />
              Tự động viết bài bằng AI cho tất cả game tìm thấy (chạy ngầm)
            </label>
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div ref={resultsRef} className="gs-results-area">
        {hasSearched && !loading && results.length === 0 && (
          <div className="gs-empty-state">
            <Search size={48} strokeWidth={1} />
            <h3>Không tìm thấy game nào</h3>
            <p>Thử tìm kiếm với từ khóa khác hoặc kiểm tra lại chính tả</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="gs-results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span className="gs-results-count">
                Tìm thấy <strong>{results.length}</strong> kết quả
              </span>
              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleAiGenerateAll()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '8px',
                    background: 'rgba(124, 77, 255, 0.1)',
                    border: '1px solid var(--color-accent)',
                    color: 'var(--color-accent)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'var(--font-main)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-accent)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(124, 77, 255, 0.1)';
                    e.currentTarget.style.color = 'var(--color-accent)';
                  }}
                >
                  <Sparkles size={14} /> Tự động viết bài bằng AI cho tất cả
                </button>
                <span className="gs-results-hint" style={{ margin: 0 }}>
                  <Sparkles size={14} /> Nhấn "Viết bài bằng AI" để tạo bài đánh giá tự động
                </span>
              </div>
            </div>

            <div className="gs-results-grid">
              {results.map((game) => (
                <div key={game.id} className="gs-game-card">
                  {/* Game Header */}
                  <div className="gs-game-header">
                    {game.background_image && (
                      <div className="gs-game-thumb-wrap">
                        <img 
                          src={game.background_image} 
                          alt={game.name} 
                          className="gs-game-thumb"
                          loading="lazy"
                        />
                        <div className="gs-game-thumb-overlay" />
                      </div>
                    )}
                    <div className="gs-game-info">
                      <h3 className="gs-game-name">{game.name}</h3>
                      <div className="gs-game-meta-row">
                        {game.released && (
                          <span className="gs-meta-tag">
                            📅 {new Date(game.released).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                        {game.rating > 0 && (
                          <span className="gs-meta-tag gs-meta-rating">
                            ⭐ {game.rating.toFixed(1)}
                          </span>
                        )}
                        {game.metacritic && (
                          <span className={`gs-meta-tag gs-meta-metacritic ${game.metacritic >= 75 ? 'good' : game.metacritic >= 50 ? 'mixed' : 'bad'}`}>
                            MC {game.metacritic}
                          </span>
                        )}
                      </div>
                      {game.genres?.length > 0 && (
                        <div className="gs-game-genres">
                          {game.genres.slice(0, 4).map(g => (
                            <span key={g.id} className="gs-genre-tag">{g.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Error */}
                  {aiErrors[game.id] && (
                    <div className="gs-ai-error">
                      <AlertTriangle size={16} />
                      <span>{aiErrors[game.id]}</span>
                      <button 
                        onClick={() => handleAiClick(game)}
                        className="gs-retry-btn"
                      >
                        Thử lại
                      </button>
                    </div>
                  )}

                  {/* AI Content Section */}
                  {aiContent[game.id] && (
                    <div className={`gs-ai-content ${expandedCards.has(game.id) ? 'expanded' : 'collapsed'}`}>
                      <button 
                        className="gs-ai-toggle"
                        onClick={() => toggleExpanded(game.id)}
                      >
                        <div className="gs-ai-toggle-left">
                          <Sparkles size={16} />
                          <span className="gs-ai-badge">AI Generated</span>
                          <span className="gs-ai-seo-title">{aiContent[game.id].seo_title}</span>
                        </div>
                        {expandedCards.has(game.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>

                      {expandedCards.has(game.id) && (
                        <div className="gs-ai-body">
                          {/* Summary */}
                          <div className="gs-ai-section">
                            <div className="gs-ai-section-header">
                              <FileText size={16} />
                              <h4>Tổng quan</h4>
                            </div>
                            <p className="gs-ai-summary">{aiContent[game.id].summary}</p>
                          </div>

                          {/* Gameplay Review */}
                          <div className="gs-ai-section">
                            <div className="gs-ai-section-header">
                              <Monitor size={16} />
                              <h4>Đánh giá lối chơi</h4>
                            </div>
                            <div className="gs-ai-gameplay">
                              {renderSafeHtmlParagraphs(aiContent[game.id].gameplay)}
                            </div>
                          </div>

                          {/* System Requirements */}
                          <div className="gs-ai-section">
                            <div className="gs-ai-section-header">
                              <Cpu size={16} />
                              <h4>Cấu hình hệ thống</h4>
                            </div>
                            <div className="gs-specs-grid">
                              <div className="gs-spec-card gs-spec-min">
                                <div className="gs-spec-label">
                                  <span className="gs-spec-dot min" />
                                  Tối thiểu
                                </div>
                                <p className="gs-spec-text">
                                  {aiContent[game.id].system_requirements?.minimum || 'N/A'}
                                </p>
                              </div>
                              <div className="gs-spec-card gs-spec-rec">
                                <div className="gs-spec-label">
                                  <span className="gs-spec-dot rec" />
                                  Đề nghị
                                </div>
                                <p className="gs-spec-text">
                                  {aiContent[game.id].system_requirements?.recommended || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* FAQ */}
                          <div className="gs-ai-section">
                            <div className="gs-ai-section-header">
                              <HelpCircle size={16} />
                              <h4>Mẹo chơi & FAQ</h4>
                            </div>
                            <div className="gs-ai-faq">
                              <p>{aiContent[game.id].faq}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Action Button */}
                  <div className="gs-game-actions">
                    {!aiContent[game.id] && (
                      <button 
                        id={`ai-write-btn-${game.id}`}
                        onClick={() => handleAiClick(game)}
                        disabled={aiLoading.has(game.id)}
                        className={`gs-ai-btn ${aiLoading.has(game.id) ? 'loading' : ''}`}
                      >
                        {aiLoading.has(game.id) ? (
                          <>
                            <Loader2 size={16} className="gs-spinner" />
                            <span>AI đang viết bài...</span>
                            <span className="gs-ai-btn-hint">Đang phân tích {game.name}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            <span>Tự động viết bài bằng AI</span>
                          </>
                        )}
                      </button>
                    )}
                    {aiContent[game.id] && !expandedCards.has(game.id) && (
                      <button 
                        onClick={() => toggleExpanded(game.id)}
                        className="gs-expand-btn"
                      >
                        <ChevronDown size={16} />
                        <span>Xem bài viết AI</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}