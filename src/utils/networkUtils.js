import { useState, useEffect } from 'react';

/**
 * Tiện ích kiểm tra thông số mạng (Network Information API)
 * Xác định loại mạng (WiFi, Cellular 4G/3G), tốc độ truyền tải và chế độ tiết kiệm dữ liệu.
 */
export function getNetworkStatus() {
  if (typeof window === 'undefined') {
    return { canStreamVideo: true, isStrong: true, type: 'unknown', reason: 'ssr' };
  }

  // 1. Kiểm tra trạng thái offline cơ bản
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      canStreamVideo: false,
      isStrong: false,
      type: 'offline',
      effectiveType: 'offline',
      downlink: 0,
      rtt: 9999,
      saveData: false,
      reason: 'Thiết bị đang ngắt kết nối mạng',
    };
  }

  const conn =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  // 2. Nếu trình duyệt không hỗ trợ Network Information API (ví dụ Safari iOS)
  // Mặc định cho phép nếu thiết bị đang online
  if (!conn) {
    return {
      canStreamVideo: true,
      isStrong: true,
      type: 'unknown',
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
      reason: 'Trình duyệt không hỗ trợ Network API, mặc định cho phép',
    };
  }

  const effectiveType = conn.effectiveType || '4g'; // 'slow-2g', '2g', '3g', '4g'
  const downlink = typeof conn.downlink === 'number' ? conn.downlink : 10; // Mbps
  const rtt = typeof conn.rtt === 'number' ? conn.rtt : 50; // ms
  const saveData = Boolean(conn.saveData);
  const type = conn.type || 'unknown'; // 'wifi', 'cellular', 'ethernet', etc.

  // 3. Tiêu chí chặn phát video:
  // - Bật chế độ tiết kiệm dữ liệu (Data Saver)
  // - Loại mạng là 2G, slow-2g hoặc 3G
  // - Băng thông dưới 1.5 Mbps
  // - Độ trễ Ping (RTT) vượt quá 400ms
  if (saveData) {
    return {
      canStreamVideo: false,
      isStrong: false,
      type,
      effectiveType,
      downlink,
      rtt,
      saveData,
      reason: 'Người dùng bật chế độ Tiết kiệm dữ liệu (Data Saver)',
    };
  }

  if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
    return {
      canStreamVideo: false,
      isStrong: false,
      type,
      effectiveType,
      downlink,
      rtt,
      saveData,
      reason: `Đường truyền ${effectiveType.toUpperCase()} quá chậm`,
    };
  }

  if (downlink < 1.5) {
    return {
      canStreamVideo: false,
      isStrong: false,
      type,
      effectiveType,
      downlink,
      rtt,
      saveData,
      reason: `Băng thông ước tính quá thấp (${downlink} Mbps < 1.5 Mbps)`,
    };
  }

  if (rtt > 400) {
    return {
      canStreamVideo: false,
      isStrong: false,
      type,
      effectiveType,
      downlink,
      rtt,
      saveData,
      reason: `Độ trễ mạng quá cao (Ping ${rtt}ms > 400ms)`,
    };
  }

  // 4. Mạng đủ mạnh (WiFi hoặc 4G tốc độ cao)
  return {
    canStreamVideo: true,
    isStrong: true,
    type,
    effectiveType,
    downlink,
    rtt,
    saveData,
    reason: 'Mạng ổn định, đủ điều kiện phát video liên tục',
  };
}

/**
 * Custom Hook theo dõi chất lượng mạng theo thời gian thực
 */
export function useNetworkQuality() {
  const [networkStatus, setNetworkStatus] = useState(getNetworkStatus);

  useEffect(() => {
    const handleNetworkChange = () => {
      setNetworkStatus(getNetworkStatus());
    };

    const conn =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (conn) {
      conn.addEventListener('change', handleNetworkChange);
    }
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      if (conn) {
        conn.removeEventListener('change', handleNetworkChange);
      }
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);

  return networkStatus;
}
