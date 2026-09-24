import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2 } from 'lucide-react';

/**
 * Ultra-fast Native HTML5 / HLS Video Player
 * - HLS.js custom buffer pool (60s forward, 90s backward for instant scrubbing)
 * - Native fast seeking with hardware acceleration
 */
export default function NativeVideoPlayer({ src, poster, title, autoPlay = true, onEnded }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  const [hasError, setHasError] = useState(false);

  // Setup Player (HLS or Native MP4)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setIsLoading(true);
    setHasError(false);
    const isHls = /\.m3u8(?:\?.*)?$/i.test(src);

    if (isHls && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        maxBufferLength: 60, // Buffer 60s ahead
        maxMaxBufferLength: 120, // Buffer up to 120s if network is fast
        maxBufferSize: 60 * 1000 * 1000, // 60MB in-memory buffer pool
        backBufferLength: 90, // Keep 90s back-buffer for INSTANT replay/rewind
        enableWorker: true, // Demux in background thread
        lowLatencyMode: false,
        nudgeMaxRetry: 5,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(() => {});
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
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !isHls) {
      // Native MP4 / Safari native HLS
      video.src = src;
      video.load();
      if (autoPlay) {
        video.play().catch(() => {});
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay]);

  return (
    <div
      ref={containerRef}
      className="native-video-player-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      <video
        ref={videoRef}
        poster={poster}
        controls
        playsInline
        webkit-playsinline="true"
        x5-video-player-type="h5"
        x5-video-player-fullscreen="true"
        preload="auto"
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setHasError(false);
        }}
        onCanPlay={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        onEnded={onEnded}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000'
        }}
      />

      {/* Error state */}
      {hasError && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.88)',
            zIndex: 4,
            padding: '1.5rem',
            textAlign: 'center'
          }}
        >
          <div style={{ color: '#ff4d4f', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            ⚠️ Không thể kết nối luồng phát video này
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1rem', maxWidth: '380px' }}>
            Luồng video có thể bị chặn bởi nhà mạng hoặc máy chủ chưa sẵn sàng. Hãy thử tải lại hoặc dùng 1.1.1.1 (WARP).
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
              if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(() => {});
              }
            }}
          >
            Thử Lại
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && !hasError && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 3
          }}
        >
          <div
            style={{
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              backgroundColor: 'rgba(13,17,23,0.85)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              color: '#fff',
              fontSize: '0.9rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent)' }} />
            <span>Đang đệm video siêu tốc...</span>
          </div>
        </div>
      )}
    </div>
  );
}
