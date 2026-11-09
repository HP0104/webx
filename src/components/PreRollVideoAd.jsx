import { useEffect, useRef, useState, useCallback } from 'react';
import { FastForward, Sparkles, Loader2, Volume2, VolumeX } from 'lucide-react';
import { ADS_CONFIG } from '../config/ads';

/**
 * PreRollVideoAd - Bộ đệm quảng cáo In-Stream VAST trước khi phát phim chính
 * - Chạy quảng cáo VAST/VPAID 5 - 10 giây khi người dùng bấm xem phim
 * - Hỗ trợ đếm ngược bỏ qua (Skip button sau 5s)
 * - Tự động dự phòng an toàn (Fail-safe timeout): nếu ad network không có quảng cáo hoặc lỗi,
 *   ngay lập tức mở luồng phim chính trong vòng tối đa 4-5s, không bao giờ chặn trải nghiệm người xem.
 */
export default function PreRollVideoAd({ onComplete, config }) {
  const adConfig = config || ADS_CONFIG.preroll_video;
  const skipOffset = adConfig?.skipOffset || 5;
  const timeoutMs = adConfig?.timeout || 5000;
  const vastUrl = adConfig?.vastUrl || `https://s.magsrv.com/v1/vast.php?idz=${adConfig?.zoneId || '6022002'}`;

  const videoRef = useRef(null);
  const fluidPlayerInstance = useRef(null);
  const hasFinishedRef = useRef(false);

  const [countdown, setCountdown] = useState(skipOffset);
  const [canSkip, setCanSkip] = useState(false);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Đảm bảo onComplete chỉ được gọi 1 lần duy nhất
  const finishAd = useCallback((reason = 'completed') => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    if (fluidPlayerInstance.current) {
      try {
        fluidPlayerInstance.current.destroy();
      } catch {}
      fluidPlayerInstance.current = null;
    }
    if (onComplete) {
      onComplete(reason);
    }
  }, [onComplete]);

  // Đếm ngược nút bỏ qua quảng cáo
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fail-safe Timeout: Nếu mạng ad bị chặn (adblock) hoặc không phản hồi sau timeoutMs -> Tự động vào phim
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!isAdPlaying && !hasFinishedRef.current) {
        finishAd('timeout');
      }
    }, timeoutMs);

    // Hard Max Timeout: Tuyệt đối không cho phép quảng cáo chặn người xem quá (skipOffset + 4)s
    const hardTimer = setTimeout(() => {
      if (!hasFinishedRef.current) {
        finishAd('hard-timeout');
      }
    }, (skipOffset + 4) * 1000);

    return () => {
      clearTimeout(safetyTimer);
      clearTimeout(hardTimer);
    };
  }, [isAdPlaying, timeoutMs, skipOffset, finishAd]);

  // Khởi tạo Fluid Player VAST
  useEffect(() => {
    let isCancelled = false;

    const initFluid = async () => {
      try {
        const [{ default: fluidPlayer }] = await Promise.all([
          import('fluid-player'),
          import('fluid-player/src/css/fluidplayer.css')
        ]);

        if (isCancelled || !videoRef.current || hasFinishedRef.current) return;

        fluidPlayerInstance.current = fluidPlayer(videoRef.current, {
          layoutControls: {
            controlsBarText: 'Quảng cáo tài trợ',
            allowTheatre: false,
            playPauseAnimation: false,
            playButtonShowing: false,
            fillToContainer: true,
            autoPlay: true,
            mute: false, // Bật âm thanh vì người dùng vừa chủ động bấm Play
            keyboardControl: false,
          },
          vastOptions: {
            allowVPAID: true,
            skipButtonCaption: 'Bỏ qua sau [seconds]s',
            adList: [
              {
                roll: 'preRoll',
                vastTag: vastUrl,
              },
            ],
            vastAdvanced: {
              vastVideoEndedCallback: () => {
                if (!isCancelled) finishAd('ended');
              },
              vastVideoSkippedCallback: () => {
                if (!isCancelled) finishAd('skipped');
              },
              noVastVideoCallback: () => {
                if (!isCancelled) finishAd('no-ad');
              },
              vastVideoLoadFailedCallback: () => {
                if (!isCancelled) finishAd('load-failed');
              },
            },
          },
        });

        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.addEventListener('playing', () => {
            if (!isCancelled) setIsAdPlaying(true);
          });
          videoEl.addEventListener('error', () => {
            if (!isCancelled) finishAd('error');
          });
          videoEl.addEventListener('ended', () => {
            if (!isCancelled) finishAd('video-ended');
          });
        }
      } catch (err) {
        console.warn('PreRoll VAST initialization error:', err);
        if (!isCancelled) finishAd('init-failed');
      }
    };

    initFluid();

    return () => {
      isCancelled = true;
      if (fluidPlayerInstance.current) {
        try {
          fluidPlayerInstance.current.destroy();
        } catch {}
        fluidPlayerInstance.current = null;
      }
    };
  }, [vastUrl, finishAd]);

  const toggleSound = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };

  return (
    <div
      className="preroll-ad-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      {/* Thanh Header thông tin tài trợ & Điều khiển Skip */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          padding: '12px 16px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(102, 192, 244, 0.2)',
              border: '1px solid rgba(102, 192, 244, 0.5)',
              color: '#66c0f4',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            <Sparkles size={12} /> Quảng cáo
          </span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
            Phim sẽ bắt đầu sau ít giây...
          </span>
        </div>

        {/* Nút Skip & Âm thanh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={toggleSound}
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.78rem'
            }}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {canSkip ? (
            <button
              type="button"
              onClick={() => finishAd('manual-skip')}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.85rem',
                fontWeight: 700,
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                boxShadow: '0 2px 10px rgba(0, 210, 211, 0.4)',
                cursor: 'pointer',
                animation: 'pulse 1.5s infinite'
              }}
            >
              <span>Bỏ qua quảng cáo</span>
              <FastForward size={16} />
            </button>
          ) : (
            <div
              style={{
                backgroundColor: 'rgba(0,0,0,0.65)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.85)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 500
              }}
            >
              Bỏ qua sau <strong style={{ color: 'var(--color-accent)' }}>{countdown}s</strong>
            </div>
          )}
        </div>
      </div>

      {/* Hiệu ứng loading nếu ad đang nạp */}
      {!isAdPlaying && (
        <div
          style={{
            position: 'absolute',
            zIndex: 15,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.85rem'
          }}
        >
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent)' }} />
          <span>Đang kết nối luồng tài trợ...</span>
        </div>
      )}

      {/* Thẻ Video cho Fluid Player */}
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          playsInline
        >
          <source src="data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhmZGF0AAAAAA==" type="video/mp4" />
        </video>
      </div>
    </div>
  );
}

