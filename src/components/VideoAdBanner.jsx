import React, { useState, useEffect, useRef } from 'react';
import fluidPlayer from 'fluid-player';
import 'fluid-player/src/css/fluidplayer.css';
import { useNetworkQuality } from '../utils/networkUtils';
import { Wifi, SignalLow } from 'lucide-react';

/**
 * Component Quảng cáo Video Outstream (In-Page Video) dưới Khung Chat
 * Tích hợp ExoClick VAST 3.0, Fluid Player, phát liên tục khi mạng mạnh và tự động tắt khi mạng yếu.
 */
export default function VideoAdBanner({ config }) {
  const networkStatus = useNetworkQuality();
  const videoPlayerRef = useRef(null);
  const fluidPlayerInstance = useRef(null);
  const [adCycle, setAdCycle] = useState(0);
  const [hasError, setHasError] = useState(false);

  // 1. Kiểm tra điều kiện mạng:
  // Nếu mạng yếu / 3G / bật tiết kiệm dữ liệu -> KHÔNG tải và KHÔNG phát video
  const shouldPlayVideo = networkStatus.canStreamVideo;

  useEffect(() => {
    // Nếu mạng không đủ mạnh hoặc không có config VAST thì dọn dẹp player
    if (!shouldPlayVideo) {
      if (fluidPlayerInstance.current) {
        try {
          fluidPlayerInstance.current.destroy();
        } catch (e) {
          // ignore
        }
        fluidPlayerInstance.current = null;
      }
      return;
    }

    if (!videoPlayerRef.current) return;

    let timer = null;
    let isCancelled = false;

    // Hủy instance cũ trước khi tạo mới
    if (fluidPlayerInstance.current) {
      try {
        fluidPlayerInstance.current.destroy();
      } catch (e) {
        // ignore
      }
      fluidPlayerInstance.current = null;
    }

    try {
      const vastUrl = config?.vastUrl || `https://s.magsrv.com/v1/vast.php?idz=${config?.zoneId || '6022002'}`;
      
      fluidPlayerInstance.current = fluidPlayer(videoPlayerRef.current, {
        layoutControls: {
          controlsBarText: 'Video tài trợ',
          allowTheatre: false,
          playPauseAnimation: false,
          playButtonShowing: true,
          fillToContainer: true,
          autoPlay: true,
          mute: true, // BẮT BUỘC: Mặc định tắt tiếng để không phiền người xem
          keyboardControl: false,
        },
        vastOptions: {
          allowVPAID: true,
          adList: [
            {
              roll: 'preRoll',
              vastTag: vastUrl,
            },
          ],
          vastAdvanced: {
            // Khi video quảng cáo chạy xong -> phát liên tục video mới sau 2 giây
            vastVideoEndedCallback: () => {
              if (isCancelled) return;
              timer = setTimeout(() => {
                setAdCycle((prev) => prev + 1);
              }, 2000);
            },
            // Khi tạm thời hết quảng cáo từ mạng ad -> thử lại sau 15 giây
            noVastVideoCallback: () => {
              if (isCancelled) return;
              timer = setTimeout(() => {
                setAdCycle((prev) => prev + 1);
              }, 15000);
            },
          },
        },
      });

      setHasError(false);
    } catch (err) {
      console.warn('Không thể khởi tạo Fluid Player cho Video Ad:', err);
      setHasError(true);
    }

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
      if (fluidPlayerInstance.current) {
        try {
          fluidPlayerInstance.current.destroy();
        } catch (e) {
          // ignore
        }
        fluidPlayerInstance.current = null;
      }
    };
  }, [shouldPlayVideo, adCycle, config?.vastUrl, config?.zoneId]);

  // Nếu mạng yếu hoặc đang bật tiết kiệm dữ liệu -> Ẩn khung video ad
  // để nhường toàn bộ băng thông cho phim/truyện và để banner ảnh phía dưới hoạt động
  if (!shouldPlayVideo) {
    return (
      <div
        style={{
          width: '100%',
          padding: '0.6rem 0.8rem',
          borderRadius: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
        }}
      >
        <SignalLow size={14} style={{ color: '#ebac26', flexShrink: 0 }} />
        <span>Tạm ẩn video quảng cáo do kết nối mạng di động/yếu</span>
      </div>
    );
  }

  if (hasError) {
    return null;
  }

  return (
    <div
      style={{
        width: '100%',
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#0a0a0c',
        border: '1px solid var(--color-border)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* Header bar nhỏ gọn trên video */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 8px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
          pointerEvents: 'none',
        }}
      >
        {/* Huy hiệu tình trạng mạng */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.65rem',
            color: '#4ade80',
            fontWeight: 500,
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          <Wifi size={11} />
          <span>Phát liên tục</span>
        </div>

        {/* Nhãn Tài trợ */}
        <span
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.6rem',
            padding: '2px 5px',
            borderRadius: '4px',
            lineHeight: 1,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          Tài trợ
        </span>
      </div>

      {/* Container video player */}
      <div
        key={adCycle}
        style={{
          width: '100%',
          aspectRatio: config?.aspectRatio || '16/9',
          minHeight: config?.minHeight || '230px',
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <video
          ref={videoPlayerRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          playsInline
          muted
        />
      </div>
    </div>
  );
}
