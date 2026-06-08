import React, { useState, useRef } from 'react';
import { Sparkles, Search, Loader2, ChevronDown, ChevronUp, Cpu, Monitor, HelpCircle, FileText, AlertTriangle, Plus } from 'lucide-react';
import { searchGames, generateGameContentWithGemini } from '../../services/gameInfo';

function RawgAiSearch({ geminiApiKey, onApplyToForm }) {
  const [rawgQuery, setRawgQuery] = useState('');
  const [rawgResults, setRawgResults] = useState([]);
  const [rawgLoading, setRawgLoading] = useState(false);
  const [rawgHasSearched, setRawgHasSearched] = useState(false);
  const [rawgAiContent, setRawgAiContent] = useState({});
  const [rawgAiLoading, setRawgAiLoading] = useState(new Set());
  const [rawgAiErrors, setRawgAiErrors] = useState({});
  const [rawgExpandedCards, setRawgExpandedCards] = useState(new Set());
  const [rawgAutoGenerateAi, setRawgAutoGenerateAi] = useState(false);
  const rawgResultsRef = useRef(null);

  const handleRawgSearch = async (e) => {
    e.preventDefault();
    if (!rawgQuery.trim()) return;
    setRawgLoading(true);
    setRawgHasSearched(true);
    setRawgAiContent({});
    setRawgAiErrors({});
    setRawgExpandedCards(new Set());
    const games_result = await searchGames(rawgQuery.trim());
    setRawgResults(games_result);
    setRawgLoading(false);
    if (games_result.length > 0) {
      setTimeout(() => rawgResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      
      if (rawgAutoGenerateAi) {
        handleRawgAiGenerateAll(games_result);
      }
    }
  };

  const handleRawgAiGenerate = async (game, apiKeyToUse = null) => {
    const key = apiKeyToUse || geminiApiKey.trim();
    if (!key) {
      alert('Vui lòng cấu hình Gemini API Key ở mục thêm game để sử dụng tính năng viết bài AI!');
      return;
    }
    setRawgAiLoading(prev => new Set(prev).add(game.id));
    setRawgAiErrors(prev => { const n = { ...prev }; delete n[game.id]; return n; });
    try {
      const content = await generateGameContentWithGemini(
        game.name, game.released,
        { genres: game.genres || [], platforms: game.platforms || [], rating: game.rating, metacritic: game.metacritic },
        key
      );
      setRawgAiContent(prev => ({ ...prev, [game.id]: content }));
      setRawgExpandedCards(prev => new Set(prev).add(game.id));
    } catch (error) {
      console.error('Error generating AI content:', error);
      setRawgAiErrors(prev => ({ ...prev, [game.id]: error.message || 'Không thể tạo nội dung AI.' }));
    } finally {
      setRawgAiLoading(prev => { const s = new Set(prev); s.delete(game.id); return s; });
    }
  };

  const handleRawgAiGenerateAll = async (gamesToProcess = null) => {
    const key = geminiApiKey.trim();
    if (!key) {
      alert('Vui lòng cấu hình Gemini API Key ở mục thêm game để sử dụng tính năng viết bài AI!');
      return;
    }
    const targetGames = gamesToProcess || rawgResults;
    if (targetGames.length === 0) return;
    
    for (const game of targetGames) {
      if (rawgAiContent[game.id]) continue;
      await handleRawgAiGenerate(game, key);
    }
  };

  const toggleRawgExpanded = (gameId) => {
    setRawgExpandedCards(prev => {
      const next = new Set(prev);
      next.has(gameId) ? next.delete(gameId) : next.add(gameId);
      return next;
    });
  };

  return (
    <div className="card" style={{ borderTop: '3px solid var(--color-accent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <Sparkles size={22} style={{ color: 'var(--color-accent)' }} />
        <h2 style={{ color: 'var(--color-text-light)', fontSize: '1.2rem', margin: 0 }}>Tìm thông tin Game bằng AI (RAWG)</h2>
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginBottom: '1rem', lineHeight: 1.6 }}>
        Tìm game từ cơ sở dữ liệu RAWG quốc tế, sau đó AI sẽ tự động viết bài đánh giá chi tiết bằng tiếng Việt. Nhấn "Áp dụng vào form" để tự động điền dữ liệu vào form thêm game.
      </p>

      {/* Search Bar */}
      <form onSubmit={handleRawgSearch} style={{ marginBottom: '1rem' }}>
        <div className="gs-search-wrapper" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
          <Search size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Nhập tên game... (ví dụ: Elden Ring, GTA V, Cyberpunk)"
            value={rawgQuery}
            onChange={(e) => setRawgQuery(e.target.value)}
            className="gs-search-input"
            style={{ fontSize: '0.88rem' }}
          />
          <button
            type="submit"
            className="gs-search-btn"
            disabled={rawgLoading || !rawgQuery.trim()}
            style={{ padding: '0.55rem 1.2rem', fontSize: '0.82rem' }}
          >
            {rawgLoading ? (<><Loader2 size={16} className="gs-spinner" /> Đang tìm...</>) : (<><Search size={16} /> Tìm RAWG</>)}
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingLeft: '0.2rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.82rem', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={rawgAutoGenerateAi}
            onChange={(e) => setRawgAutoGenerateAi(e.target.checked)}
            style={{ width: '15px', height: '15px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
          />
          Tự động viết bài bằng AI cho tất cả game tìm thấy (chạy ngầm)
        </label>
      </div>

      {/* Results */}
      <div ref={rawgResultsRef}>
        {rawgHasSearched && !rawgLoading && rawgResults.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
            <Search size={36} strokeWidth={1} />
            <p style={{ marginTop: '0.5rem' }}>Không tìm thấy game nào trên RAWG</p>
          </div>
        )}

        {rawgResults.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Tìm thấy <strong style={{ color: 'var(--color-accent)' }}>{rawgResults.length}</strong> kết quả</span>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleRawgAiGenerateAll()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    background: 'rgba(124, 77, 255, 0.1)',
                    border: '1px solid var(--color-accent)',
                    color: 'var(--color-accent)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
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
                  <Sparkles size={12} /> Tự động viết bài bằng AI cho tất cả
                </button>
                <span style={{ fontSize: '0.75rem', color: 'rgba(150,150,155,0.6)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><HelpCircle size={12} /> Nhấn nút AI để tạo bài viết</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {rawgResults.map((game) => (
                <div key={game.id} className="gs-game-card">
                  {/* Game Header */}
                  <div className="gs-game-header" style={{ padding: '1rem' }}>
                    {game.background_image && (
                      <div className="gs-game-thumb-wrap" style={{ width: '140px', height: '80px' }}>
                        <img src={game.background_image} alt={game.name} className="gs-game-thumb" loading="lazy" />
                      </div>
                    )}
                    <div className="gs-game-info">
                      <h3 className="gs-game-name" style={{ fontSize: '1rem' }}>{game.name}</h3>
                      <div className="gs-game-meta-row">
                        {game.released && <span className="gs-meta-tag">📅 {new Date(game.released).toLocaleDateString('vi-VN')}</span>}
                        {game.rating > 0 && <span className="gs-meta-tag gs-meta-rating">⭐ {game.rating.toFixed(1)}</span>}
                        {game.metacritic && <span className={`gs-meta-tag gs-meta-metacritic ${game.metacritic >= 75 ? 'good' : game.metacritic >= 50 ? 'mixed' : 'bad'}`}>MC {game.metacritic}</span>}
                      </div>
                      {game.genres?.length > 0 && (
                        <div className="gs-game-genres">
                          {game.genres.slice(0, 4).map(g => <span key={g.id} className="gs-genre-tag">{g.name}</span>)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Error */}
                  {rawgAiErrors[game.id] && (
                    <div className="gs-ai-error" style={{ margin: '0 1rem' }}>
                      <AlertTriangle size={14} />
                      <span style={{ fontSize: '0.8rem' }}>{rawgAiErrors[game.id]}</span>
                      <button onClick={() => handleRawgAiGenerate(game)} className="gs-retry-btn">Thử lại</button>
                    </div>
                  )}

                  {/* AI Content */}
                  {rawgAiContent[game.id] && (
                    <div className="gs-ai-content" style={{ margin: '0 1rem 0.5rem' }}>
                      <button className="gs-ai-toggle" onClick={() => toggleRawgExpanded(game.id)}>
                        <div className="gs-ai-toggle-left">
                          <Sparkles size={14} />
                          <span className="gs-ai-badge">AI</span>
                          <span className="gs-ai-seo-title" style={{ fontSize: '0.8rem' }}>{rawgAiContent[game.id].seo_title}</span>
                        </div>
                        {rawgExpandedCards.has(game.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {rawgExpandedCards.has(game.id) && (
                        <div className="gs-ai-body" style={{ padding: '1rem', gap: '1.2rem' }}>
                          <div className="gs-ai-section">
                            <div className="gs-ai-section-header"><FileText size={14} /><h4 style={{ fontSize: '0.85rem' }}>Tổng quan</h4></div>
                            <p className="gs-ai-summary" style={{ fontSize: '0.85rem' }}>{rawgAiContent[game.id].summary}</p>
                          </div>
                          <div className="gs-ai-section">
                            <div className="gs-ai-section-header"><Monitor size={14} /><h4 style={{ fontSize: '0.85rem' }}>Đánh giá lối chơi</h4></div>
                            <div className="gs-ai-gameplay" style={{ fontSize: '0.85rem' }} dangerouslySetInnerHTML={{ __html: rawgAiContent[game.id].gameplay }} />
                          </div>
                          <div className="gs-ai-section">
                            <div className="gs-ai-section-header"><Cpu size={14} /><h4 style={{ fontSize: '0.85rem' }}>Cấu hình hệ thống</h4></div>
                            <div className="gs-specs-grid">
                              <div className="gs-spec-card">
                                <div className="gs-spec-label"><span className="gs-spec-dot min" /> Tối thiểu</div>
                                <p className="gs-spec-text" style={{ fontSize: '0.8rem' }}>{rawgAiContent[game.id].system_requirements?.minimum || 'N/A'}</p>
                              </div>
                              <div className="gs-spec-card">
                                <div className="gs-spec-label"><span className="gs-spec-dot rec" /> Đề nghị</div>
                                <p className="gs-spec-text" style={{ fontSize: '0.8rem' }}>{rawgAiContent[game.id].system_requirements?.recommended || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="gs-ai-section">
                            <div className="gs-ai-section-header"><HelpCircle size={14} /><h4 style={{ fontSize: '0.85rem' }}>Mẹo chơi & FAQ</h4></div>
                            <div className="gs-ai-faq"><p style={{ fontSize: '0.82rem' }}>{rawgAiContent[game.id].faq}</p></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1rem 1rem', flexWrap: 'wrap' }}>
                    {!rawgAiContent[game.id] && (
                      <button
                        onClick={() => handleRawgAiGenerate(game)}
                        disabled={rawgAiLoading.has(game.id)}
                        className={`gs-ai-btn ${rawgAiLoading.has(game.id) ? 'loading' : ''}`}
                        style={{ flex: 1, padding: '0.65rem 1rem', fontSize: '0.82rem' }}
                      >
                        {rawgAiLoading.has(game.id) ? (
                          <><Loader2 size={14} className="gs-spinner" /> <span>AI đang viết bài...</span></>
                        ) : (
                          <><Sparkles size={14} /> <span>Viết bài bằng AI</span></>
                        )}
                      </button>
                    )}
                    {rawgAiContent[game.id] && (
                      <button
                        onClick={() => onApplyToForm(game, rawgAiContent[game.id])}
                        style={{
                          flex: 1,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                          padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                          background: 'linear-gradient(135deg, var(--color-success), #3cb371)',
                          color: 'white', border: 'none', cursor: 'pointer',
                          transition: 'all 0.2s ease', fontFamily: 'var(--font-main)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(82,196,26,0.3)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                      >
                        <Plus size={14} /> Áp dụng vào form thêm game
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

export default RawgAiSearch;
