import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import { 
  RotateCcw, 
  Maximize, 
  Minimize, 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  Sparkles, 
  Layers,
  Radio
} from 'lucide-react';
import { 
  isDirectVideo, 
  getAlternateEmbedUrl 
} from '../utils/videoUtils';

/**
 * Trusted domains list for secure iframe parsing
 */
const TRUSTED_DOMAINS = [
  'streamtape.com', 'streamtape.to',
  'filemoon.sx', 'filemoon.to', 'filemoon.in', 'fmoonembed.com',
  'streamhg.com', 'hgcloud.to', 'vibuxer.com', 'huntrexus.com',
  'doodstream.com', 'dood.pm', 'dood.to', 'dood.so', 'dood.watch', 'dood.wf', 'ds2play.com', 'd0000d.com',
  'upstream.to', 'mixdrop.co', 'mixdrop.to', 'mixdrop.sx',
  'vidoza.net', 'voe.sx', 'mp4upload.com', 'wishonly.site',
  'player.vimeo.com', 'youtube.com', 'youtube-nocookie.com',
  'iframe.mediadelivery.net'
];

/**
 * Extract clean iframe src from raw embed code or link
 */
function resolveIframeSrc(rawUrl, currentServer) {
  if (!rawUrl) return '';
  let effectiveSrc = '';
  if (rawUrl.trim().toLowerCase().startsWith('<iframe')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawUrl, 'text/html');
      const iframe = doc.querySelector('iframe');
      if (iframe && iframe.src) {
        let src = iframe.src;
        if (currentServer === 'server2') {
          src = src.replace('hgcloud.to', 'vibuxer.com').replace('streamhg.com', 'vibuxer.com').replace('huntrexus.com', 'vibuxer.com');
        } else if (currentServer === 'server1') {
          src = src.replace('vibuxer.com', 'hgcloud.to').replace('streamhg.com', 'hgcloud.to').replace('huntrexus.com', 'hgcloud.to');
        }
        effectiveSrc = src;
      }
    } catch {
      effectiveSrc = '';
    }
  } else {
    effectiveSrc = getAlternateEmbedUrl(rawUrl, currentServer);
  }

  if (effectiveSrc) {
    try {
      const hostname = new URL(effectiveSrc).hostname.toLowerCase();
      const isTrusted = TRUSTED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
      if (!isTrusted) return '';
    } catch {
      return '';
    }
  }
  return effectiveSrc;
}

/**
 * SeamlessSeriesPlayer (Cách 2: Frontend Double-Buffering)
 * Chạy 2 Player song song (Slot A và Slot B).
 * Khi Slot A đang phát còn 35s cuối, Slot B tự động nạp trước (preload buffer) tập tiếp theo.
 * Hết tập -> Bàn giao ngay trong 0.05s, không ngắt quãng, không giật lag!
 */
export default function SeamlessSeriesPlayer({
  episodes = [],
  currentEpisodeIndex = 0,
  onEpisodeChange,
  _title = '',
  poster = '',
  currentServer = 'server1',
  onServerChange
}) {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoContinuousPlay, setAutoContinuousPlay] = useState(true);
  const [transitionNotification, setTransitionNotification] = useState(null);

  // Active Slot: 'A' | 'B'
  const [activeSlot, setActiveSlot] = useState('A');
  const [slotAEpisodeIndex, setSlotAEpisodeIndex] = useState(currentEpisodeIndex);
  const [slotBEpisodeIndex, setSlotBEpisodeIndex] = useState(currentEpisodeIndex + 1);
  const [prevPropIndex, setPrevPropIndex] = useState(currentEpisodeIndex);

  if (currentEpisodeIndex !== prevPropIndex) {
    setPrevPropIndex(currentEpisodeIndex);
    if (activeSlot === 'A') {
      setSlotAEpisodeIndex(currentEpisodeIndex);
    } else {
      setSlotBEpisodeIndex(currentEpisodeIndex);
    }
  }

  // Refs for Video Elements and HLS instances
  const videoRefA = useRef(null);
  const videoRefB = useRef(null);
  const hlsRefA = useRef(null);
  const hlsRefB = useRef(null);

  // Loading & Error States
  const [isLoadingA, setIsLoadingA] = useState(false);
  const [isLoadingB, setIsLoadingB] = useState(false);
  const [hasErrorA, setHasErrorA] = useState(false);
  const [hasErrorB, setHasErrorB] = useState(false);

  // Reload key for iframes
  const [reloadKey, setReloadKey] = useState(0);

  // Current active episode info
  const currentEpisode = episodes[currentEpisodeIndex] || episodes[0];
  const nextEpisode = episodes[currentEpisodeIndex + 1];
  const prevEpisode = episodes[currentEpisodeIndex - 1];

  // Helper to check if an episode is a direct video
  const isDirect = (ep) => ep?.videoUrl ? isDirectVideo(ep.videoUrl) : false;

  // -------------------------------------------------------------
  // Fullscreen Handler
  // -------------------------------------------------------------
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isFs) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
      if (window.screen?.orientation?.lock) {
        window.screen.orientation.lock('landscape').catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      if (window.screen?.orientation?.unlock) {
        window.screen.orientation.unlock();
      }
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // -------------------------------------------------------------
  // HLS / Video Stream Initializer for a Slot
  // -------------------------------------------------------------
  const initStream = useCallback((videoEl, hlsRefObj, src, autoPlay = false, setIsLoading, setHasError) => {
    if (!videoEl || !src) return;

    const isHls = /\.m3u8(?:\?.*)?$/i.test(src);
    setIsLoading(true);
    setHasError(false);

    if (hlsRefObj.current) {
      hlsRefObj.current.destroy();
      hlsRefObj.current = null;
    }

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1000 * 1000,
        backBufferLength: 60,
        enableWorker: true,
        lowLatencyMode: false,
        nudgeMaxRetry: 5,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4
      });

      hlsRefObj.current = hls;
      hls.loadSource(src);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoPlay) {
          videoEl.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setIsLoading(false);
              setHasError(true);
              break;
          }
        }
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl') || !isHls) {
      videoEl.src = src;
      videoEl.load();
      setIsLoading(false);
      if (autoPlay) {
        videoEl.play().catch(() => {});
      }
    }
  }, []);

  // -------------------------------------------------------------
  // Switch to an Episode index manually or programmatically
  // -------------------------------------------------------------
  const goToEpisode = useCallback((targetIndex, isAutoTransition = false) => {
    if (targetIndex < 0 || targetIndex >= episodes.length) return;

    if (isAutoTransition) {
      setTransitionNotification(`Chuyển liền mạch sang: ${episodes[targetIndex]?.title || `Tập ${targetIndex + 1}`}`);
      setTimeout(() => setTransitionNotification(null), 3500);
    }

    if (onEpisodeChange) {
      onEpisodeChange(targetIndex);
    }
  }, [episodes, onEpisodeChange]);

  // Keep track of when stream needs initialization on episode change
  useEffect(() => {
    if (activeSlot === 'A') {
      const epA = episodes[currentEpisodeIndex];
      if (epA && isDirect(epA)) {
        initStream(videoRefA.current, hlsRefA, epA.videoUrl, true, setIsLoadingA, setHasErrorA);
      }
    } else {
      const epB = episodes[currentEpisodeIndex];
      if (epB && isDirect(epB)) {
        initStream(videoRefB.current, hlsRefB, epB.videoUrl, true, setIsLoadingB, setHasErrorB);
      }
    }
  }, [currentEpisodeIndex, activeSlot, episodes, initStream]);

  // -------------------------------------------------------------
  // Double-Buffering Preloading Logic (Cách 2)
  // When active slot is near end (e.g. 35s left), preload next slot in background
  // -------------------------------------------------------------
  const preloadedEpRef = useRef(null);

  const handleTimeUpdate = (activeSlotName) => {
    const activeVideo = activeSlotName === 'A' ? videoRefA.current : videoRefB.current;
    if (!activeVideo || !autoContinuousPlay) return;

    const { duration, currentTime } = activeVideo;
    if (!duration || isNaN(duration) || duration <= 0) return;

    const timeRemaining = duration - currentTime;
    const nextIdx = currentEpisodeIndex + 1;

    // When 35s remaining and next episode exists: PRELOAD in Standby Slot!
    if (timeRemaining <= 35 && nextIdx < episodes.length && preloadedEpRef.current !== nextIdx) {
      preloadedEpRef.current = nextIdx;
      const nextEp = episodes[nextIdx];

      if (activeSlotName === 'A') {
        // Standby slot is B
        setSlotBEpisodeIndex(nextIdx);
        if (nextEp && isDirect(nextEp)) {
          initStream(videoRefB.current, hlsRefB, nextEp.videoUrl, false, setIsLoadingB, setHasErrorB);
        }
      } else {
        // Standby slot is A
        setSlotAEpisodeIndex(nextIdx);
        if (nextEp && isDirect(nextEp)) {
          initStream(videoRefA.current, hlsRefA, nextEp.videoUrl, false, setIsLoadingA, setHasErrorA);
        }
      }
    }
  };

  // -------------------------------------------------------------
  // Handover on Video Ended (Gapless Zero-Latency Transition)
  // -------------------------------------------------------------
  const handleEnded = (endedSlot) => {
    const nextIdx = currentEpisodeIndex + 1;
    if (!autoContinuousPlay || nextIdx >= episodes.length) return;

    if (endedSlot === 'A') {
      // Handover A -> B
      const standbyVideo = videoRefB.current;
      setActiveSlot('B');
      goToEpisode(nextIdx, true);
      if (standbyVideo && isDirect(episodes[nextIdx])) {
        standbyVideo.play().catch(() => {});
      }
    } else {
      // Handover B -> A
      const standbyVideo = videoRefA.current;
      setActiveSlot('A');
      goToEpisode(nextIdx, true);
      if (standbyVideo && isDirect(episodes[nextIdx])) {
        standbyVideo.play().catch(() => {});
      }
    }
    preloadedEpRef.current = null;
  };

  // Cleanup on unmount
  useEffect(() => {
    const currentHlsA = hlsRefA.current;
    const currentHlsB = hlsRefB.current;
    return () => {
      if (currentHlsA) currentHlsA.destroy();
      if (currentHlsB) currentHlsB.destroy();
    };
  }, []);

  // Iframe sources for current and standby
  const epA = episodes[slotAEpisodeIndex];
  const epB = episodes[slotBEpisodeIndex];
  const iframeSrcA = useMemo(() => {
    if (!epA) return '';
    const base = resolveIframeSrc(epA.videoUrl, currentServer);
    return reloadKey > 0 ? `${base}${base.includes('?') ? '&' : '?'}r=${reloadKey}` : base;
  }, [epA, currentServer, reloadKey]);
  const iframeSrcB = useMemo(() => {
    if (!epB) return '';
    const base = resolveIframeSrc(epB.videoUrl, currentServer);
    return reloadKey > 0 ? `${base}${base.includes('?') ? '&' : '?'}r=${reloadKey}` : base;
  }, [epB, currentServer, reloadKey]);

  return (
    <div ref={containerRef} className="seamless-series-player-container" style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
      {/* Seamless Transition Toast Notification */}
      {transitionNotification && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 210, 211, 0.92)',
          color: '#000',
          padding: '0.45rem 1.1rem',
          borderRadius: '30px',
          fontWeight: 700,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 10,
          boxShadow: '0 4px 20px rgba(0, 210, 211, 0.4)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <Sparkles size={16} />
          {transitionNotification}
        </div>
      )}

      {/* Floating Exit Fullscreen Button */}
      {isFullscreen && (
        <button
          type="button"
          className="video-floating-fs-btn"
          onClick={toggleFullscreen}
          style={{ zIndex: 11 }}
        >
          <Minimize size={16} /> Thoát toàn màn hình
        </button>
      )}

      {/* Main Dual Player Screen (Double-Buffering Canvas) */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, overflow: 'hidden', backgroundColor: '#000' }}>
        
        {/* ================= SLOT A ================= */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: activeSlot === 'A' ? 1 : 0,
          pointerEvents: activeSlot === 'A' ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
          zIndex: activeSlot === 'A' ? 2 : 1
        }}>
          {isDirect(epA) ? (
            <video
              ref={videoRefA}
              poster={epA?.thumbnail || poster}
              controls={activeSlot === 'A'}
              playsInline
              webkit-playsinline="true"
              x5-video-player-type="h5"
              x5-video-player-fullscreen="true"
              preload="auto"
              onTimeUpdate={() => activeSlot === 'A' && handleTimeUpdate('A')}
              onEnded={() => activeSlot === 'A' && handleEnded('A')}
              onError={() => setHasErrorA(true)}
              onWaiting={() => setIsLoadingA(true)}
              onPlaying={() => { setIsLoadingA(false); setHasErrorA(false); }}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            iframeSrcA && (
              <iframe
                key={`iframe-a-${reloadKey}`}
                src={iframeSrcA.includes('?') ? `${iframeSrcA}&autoplay=1` : `${iframeSrcA}?autoplay=1`}
                width="100%"
                height="100%"
                allowFullScreen
                scrolling="no"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen *"
                style={{ width: '100%', height: '100%', border: 'none' }}
                title={`Player A - ${epA?.title || 'Tập'}`}
              />
            )
          )}
          {isLoadingA && activeSlot === 'A' && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3 }}>
              <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#00d2d3' }} />
            </div>
          )}
          {hasErrorA && activeSlot === 'A' && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 4, gap: '0.8rem', padding: '1rem' }}>
              <p style={{ color: '#ff6b6b', margin: 0, fontSize: '0.9rem' }}>Nguồn phát gặp sự cố tải dữ liệu.</p>
              <button onClick={() => setReloadKey(k => k + 1)} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <RotateCcw size={14} /> Thử lại
              </button>
            </div>
          )}
        </div>

        {/* ================= SLOT B (Standby Preload) ================= */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: activeSlot === 'B' ? 1 : 0,
          pointerEvents: activeSlot === 'B' ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
          zIndex: activeSlot === 'B' ? 2 : 1
        }}>
          {isDirect(epB) ? (
            <video
              ref={videoRefB}
              poster={epB?.thumbnail || poster}
              controls={activeSlot === 'B'}
              playsInline
              webkit-playsinline="true"
              x5-video-player-type="h5"
              x5-video-player-fullscreen="true"
              preload="auto"
              onTimeUpdate={() => activeSlot === 'B' && handleTimeUpdate('B')}
              onEnded={() => activeSlot === 'B' && handleEnded('B')}
              onError={() => setHasErrorB(true)}
              onWaiting={() => setIsLoadingB(true)}
              onPlaying={() => { setIsLoadingB(false); setHasErrorB(false); }}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            iframeSrcB && (
              <iframe
                key={`iframe-b-${reloadKey}`}
                src={iframeSrcB.includes('?') ? `${iframeSrcB}&autoplay=1` : `${iframeSrcB}?autoplay=1`}
                width="100%"
                height="100%"
                allowFullScreen
                scrolling="no"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen *"
                style={{ width: '100%', height: '100%', border: 'none' }}
                title={`Player B - ${epB?.title || 'Tập'}`}
              />
            )
          )}
          {isLoadingB && activeSlot === 'B' && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3 }}>
              <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#00d2d3' }} />
            </div>
          )}
          {hasErrorB && activeSlot === 'B' && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 4, gap: '0.8rem', padding: '1rem' }}>
              <p style={{ color: '#ff6b6b', margin: 0, fontSize: '0.9rem' }}>Nguồn phát gặp sự cố tải dữ liệu.</p>
              <button onClick={() => setReloadKey(k => k + 1)} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <RotateCcw size={14} /> Thử lại
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Unified Player Control Toolbar */}
      <div className="video-player-toolbar" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Left: Episode Quick Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="video-action-btn"
            onClick={() => goToEpisode(currentEpisodeIndex - 1)}
            disabled={!prevEpisode}
            style={{ opacity: prevEpisode ? 1 : 0.4, cursor: prevEpisode ? 'pointer' : 'not-allowed' }}
            title={prevEpisode ? `Tập trước: ${prevEpisode.title}` : 'Đã ở tập đầu'}
          >
            <ChevronLeft size={16} />
            <span>Tập trước</span>
          </button>

          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00d2d3', padding: '0 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Layers size={14} />
            {currentEpisode?.title || `Tập ${currentEpisodeIndex + 1}`} / {episodes.length}
          </span>

          <button
            type="button"
            className="video-action-btn"
            onClick={() => goToEpisode(currentEpisodeIndex + 1)}
            disabled={!nextEpisode}
            style={{ opacity: nextEpisode ? 1 : 0.4, cursor: nextEpisode ? 'pointer' : 'not-allowed' }}
            title={nextEpisode ? `Tập tiếp: ${nextEpisode.title}` : 'Đã là tập cuối'}
          >
            <span>Tập tiếp</span>
            <ChevronRight size={16} />
          </button>

          {/* Toggle Continuous Gapless Autoplay */}
          <button
            type="button"
            onClick={() => setAutoContinuousPlay(!autoContinuousPlay)}
            className="video-action-btn"
            style={{
              borderColor: autoContinuousPlay ? '#00d2d3' : 'rgba(255,255,255,0.15)',
              backgroundColor: autoContinuousPlay ? 'rgba(0, 210, 211, 0.12)' : 'transparent',
              color: autoContinuousPlay ? '#00d2d3' : 'var(--color-text-muted)'
            }}
            title="Tự động nối tiếp tập tiếp theo không ngắt quãng (Double-Buffering)"
          >
            <Radio size={14} style={{ animation: autoContinuousPlay ? 'pulse 2s infinite' : 'none' }} />
            <span>Chạy liên tục: {autoContinuousPlay ? 'BẬT' : 'TẮT'}</span>
          </button>
        </div>

        {/* Right: Server, Reload & Fullscreen */}
        <div className="video-player-actions">
          {onServerChange && (
            <div className="video-server-group" style={{ margin: 0 }}>
              <button
                type="button"
                className={`video-server-btn ${currentServer === 'server1' ? 'active' : ''}`}
                onClick={() => onServerChange('server1')}
                style={{ fontSize: '0.78rem', padding: '0.25rem 0.55rem' }}
              >
                Server 1
              </button>
              <button
                type="button"
                className={`video-server-btn ${currentServer === 'server2' ? 'active' : ''}`}
                onClick={() => onServerChange('server2')}
                style={{ fontSize: '0.78rem', padding: '0.25rem 0.55rem' }}
              >
                Server 2
              </button>
            </div>
          )}

          <button
            type="button"
            className="video-action-btn"
            onClick={() => setReloadKey(k => k + 1)}
            title="Làm mới luồng phát"
          >
            <RotateCcw size={14} />
            <span>Làm Mới</span>
          </button>

          <button
            type="button"
            className="video-action-btn btn-fullscreen"
            onClick={toggleFullscreen}
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            <span>{isFullscreen ? 'Thu Nhỏ' : 'Toàn Màn Hình'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

