/**
 * Manga Utilities
 * - ImgBB upload API integration
 * - Folder structure parsing for bulk chapter upload
 * - EPUB / CBZ / ZIP extraction
 * - Genre and status constants
 */
import JSZip from 'jszip';


// ============ CONSTANTS ============

export const MANGA_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Isekai', 'Romance', 'School Life', 'Sci-Fi', 'Slice of Life',
  'Supernatural', 'Harem', 'Ecchi', 'Mature', 'Manhwa', 'Manhua', 'Việt Hóa'
];

export const MANGA_STATUS = {
  ongoing: 'Đang ra',
  completed: 'Hoàn thành',
  hiatus: 'Tạm ngưng'
};

export const IMGBB_API_KEY_STORAGE = 'web18p_imgbb_api_key';
export const FREEIMAGE_API_KEY_STORAGE = 'web18p_freeimage_api_key';
export const MANGA_STORAGE_PROVIDER_KEY = 'web18p_manga_storage_provider';

export const FREEIMAGE_API_KEY = '6d207e02198a847aa98d0a2a901485a5';

// Built-in ImgBB API keys for automatic rotation (bypasses rate limits)
export const IMGBB_DEFAULT_KEYS = [
  '25212dbe2483e698d28894d12bd4d166',
  'be9cdc33d246da2bd729274a6e23e67b',
  '9e60abf5cfb402639db6f621c1ec006a',
  'b6e2d2c5bea4ac5fc20063de50e5f370',
  '1808feec63ae10b325c569773e9b60b6'
];

export const TELEGRAM_CDN_DOMAIN = 'https://img-cdn.takarvn.workers.dev';
export const TELEGRAM_UPLOAD_KEY_STORAGE = 'web18p_telegram_upload_key';

export const MANGA_STORAGE_PROVIDERS = {
  telegram: {
    id: 'telegram',
    name: 'Telegram CDN (Khuyên dùng)',
    description: 'Lưu trữ vô hạn, không giới hạn lượt tải, phát ảnh qua Cloudflare Edge Caching siêu tốc tại VN.'
  },
  imgbb: {
    id: 'imgbb',
    name: 'ImgBB',
    description: 'Upload trực tiếp từ trình duyệt, có 5 API Key xoay vòng nhưng dễ bị giới hạn 300 ảnh/ngày.'
  },
  catbox: {
    id: 'catbox',
    name: 'Catbox.moe',
    description: '⚠️ Hiện bị Catbox chặn IP Cloudflare Worker (Lỗi Invalid uploader). Tạm thời không khả dụng.'
  },
  freeimage: {
    id: 'freeimage',
    name: 'FreeImage.host',
    description: '⚠️ Hiện bị FreeImage chặn IP Cloudflare Worker (Lỗi You have been forbidden). Chỉ hoạt động trên localhost'
  }
};

// ============ IMAGE OPTIMIZATION & COMPRESSION ============

/**
 * Compress and convert image to WebP format for fast upload and lightweight viewing
 * @param {File} file - Original image file
 * @param {object} options - Compression options (maxWidth, maxHeight, quality, outputType, customName)
 * @returns {Promise<File>} Compressed WebP file
 */
export async function optimizeMangaImage(file, options = {}) {
  const {
    maxWidth = 1600,
    maxHeight = 2500,
    quality = 0.82,
    outputType = 'image/webp',
    customName = ''
  } = options;

  // If not an image or SVG/GIF, return original file without modifying
  if (!file.type?.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  // If already WebP and lightweight (< 900KB), return as-is to save time and memory
  if (file.type === 'image/webp' && file.size < 900 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate scaled dimensions keeping aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file); // Fallback to original
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }

            const baseName = customName || file.name.replace(/\.[^/.]+$/, "");
            const newName = baseName.endsWith('.webp') ? baseName : baseName + '.webp';
            const optimizedFile = new File([blob], newName, { type: outputType, lastModified: Date.now() });
            resolve(optimizedFile);
          },
          outputType,
          quality
        );
      };

      img.onerror = () => resolve(file); // Fallback on error
      img.src = e.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// ============ IMGBB UPLOAD ============

/**
 * Upload a single image file to ImgBB (automatically optimized to WebP)
 * @param {File} file - Image file to upload
 * @param {string} apiKey - ImgBB API key
 * @param {string} customName - Optional custom title/filename for ImgBB (e.g. "Tên truyện 01")
 * @param {boolean} shouldOptimize - Whether to auto-compress to WebP
 * @returns {Promise<{url: string, thumb: string, deleteUrl: string}>}
 */
export async function uploadToImgBB(file, apiKey, customName = '', shouldOptimize = true) {
  let fileToUpload = file;
  if (shouldOptimize) {
    try {
      fileToUpload = await optimizeMangaImage(file, { customName });
    } catch (e) {
      console.warn('Image optimization skipped:', e);
      fileToUpload = file;
    }
  }

  // Use default key if none provided
  const effectiveKey = apiKey?.trim() || IMGBB_DEFAULT_KEYS[Math.floor(Math.random() * IMGBB_DEFAULT_KEYS.length)];

  const formData = new FormData();
  if (customName) {
    formData.append('name', customName);
  }
  formData.append('image', fileToUpload, customName ? (customName.endsWith('.webp') ? customName : customName + '.webp') : fileToUpload.name);
  formData.append('key', effectiveKey);

  const response = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData
  });

  let result = null;
  try {
    result = await response.json();
  } catch (e) {
    // If not JSON response
  }

  if (!response.ok || !result?.success) {
    const errorMsg = result?.error?.message || result?.error || `HTTP ${response.status} ${response.statusText}`;
    if (response.status === 429 || (typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('rate limit'))) {
      throw new Error(`Rate limit reached: API Key ImgBB (${effectiveKey.slice(0, 6)}...) đã hết lượt tải.`);
    }
    throw new Error(`ImgBB upload thất bại: ${errorMsg}`);
  }

  return {
    url: result.data.display_url || result.data.url,
    thumb: result.data.thumb?.url || result.data.url,
    deleteUrl: result.data.delete_url
  };
}

// ============ IMGBB KEY USAGE & COOLDOWN TRACKING ============

export const IMGBB_KEY_STATE_STORAGE = 'web18p_imgbb_keys_state';
export const IMGBB_RATE_LIMIT_PER_KEY = 100; // ~100 uploads per key per 1 hour rolling window
export const IMGBB_COOLDOWN_WINDOW_MS = 60 * 60 * 1000; // 1 hour (3600 seconds)

/**
 * Format remaining seconds into MM:SS or Xh Ym
 * @param {number} seconds
 * @returns {string}
 */
export function formatCountdownTime(seconds) {
  if (!seconds || seconds <= 0) return '00:00';
  const totalSec = Math.floor(seconds);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${String(remMins).padStart(2, '0')}m`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Resolve list of ImgBB API keys (custom keys + default 5 keys)
 * @param {string} customApiKey
 * @returns {string[]}
 */
export function resolveImgBBKeys(customApiKey = '') {
  const customList = (typeof customApiKey === 'string' ? customApiKey.split(',') : [customApiKey])
    .map(k => k?.trim())
    .filter(Boolean);

  if (customList.length === 0) {
    return [...IMGBB_DEFAULT_KEYS];
  }
  // Include custom keys first, then add default keys without duplicates
  const combined = [...customList];
  for (const defKey of IMGBB_DEFAULT_KEYS) {
    if (!combined.includes(defKey)) {
      combined.push(defKey);
    }
  }
  return combined;
}

/**
 * Retrieve persistent key state from localStorage, auto-resetting any expired cooldowns
 * @returns {Record<string, { count: number, windowStart: number|null, resetAt: number|null, isRateLimited: boolean, lastUsedAt: number|null }>}
 */
export function getStoredImgBBKeyState() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(IMGBB_KEY_STATE_STORAGE);
    if (!raw) return {};
    const state = JSON.parse(raw);
    const now = Date.now();
    let changed = false;

    for (const prefix of Object.keys(state)) {
      const item = state[prefix];
      if (!item) continue;
      // If 1-hour cooldown window expired, restore quota!
      if (item.resetAt && now >= item.resetAt) {
        item.count = 0;
        item.windowStart = null;
        item.resetAt = null;
        item.isRateLimited = false;
        changed = true;
      }
    }

    if (changed) {
      localStorage.setItem(IMGBB_KEY_STATE_STORAGE, JSON.stringify(state));
    }
    return state;
  } catch (e) {
    return {};
  }
}

/**
 * Save persistent key state to localStorage
 */
export function saveStoredImgBBKeyState(state) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(IMGBB_KEY_STATE_STORAGE, JSON.stringify(state));
  } catch (e) {}
}

/**
 * Reset stored usage for all keys or a specific key prefix
 */
export function resetImgBBKeyUsage(targetPrefix = null) {
  const state = getStoredImgBBKeyState();
  if (targetPrefix) {
    delete state[targetPrefix];
  } else {
    for (const k of Object.keys(state)) delete state[k];
  }
  saveStoredImgBBKeyState(state);
}

/**
 * Record an upload attempt (success or rate-limit) for a key
 */
export function recordImgBBKeyUsage(key, isSuccess, isRateLimit = false) {
  const prefix = key.slice(0, 8);
  const state = getStoredImgBBKeyState();
  const now = Date.now();

  let item = state[prefix] || {
    count: 0,
    windowStart: null,
    resetAt: null,
    isRateLimited: false,
    lastUsedAt: null
  };

  // If previous cooldown has passed, start fresh
  if (item.resetAt && now >= item.resetAt) {
    item = {
      count: 0,
      windowStart: null,
      resetAt: null,
      isRateLimited: false,
      lastUsedAt: null
    };
  }

  // If first usage in this window, set windowStart and resetAt (1 hour from now)
  if (!item.windowStart) {
    item.windowStart = now;
    item.resetAt = now + IMGBB_COOLDOWN_WINDOW_MS;
  }

  item.count = (item.count || 0) + 1;
  item.lastUsedAt = now;

  if (isRateLimit || item.count >= IMGBB_RATE_LIMIT_PER_KEY) {
    item.isRateLimited = true;
    if (!item.resetAt || item.resetAt <= now) {
      item.resetAt = now + IMGBB_COOLDOWN_WINDOW_MS;
    }
  }

  state[prefix] = item;
  saveStoredImgBBKeyState(state);
  return item;
}

/**
 * Get detailed usage breakdown and countdown timers for all keys
 */
export function getImgBBUsageSummary(apiKey = '') {
  const keyList = resolveImgBBKeys(apiKey);
  const state = getStoredImgBBKeyState();
  const now = Date.now();

  let totalUsed = 0;
  let totalRateLimited = 0;
  let nearestResetMs = null;
  let nearestResetKey = null;

  const keys = keyList.map((key, idx) => {
    const prefix = key.slice(0, 8);
    let item = state[prefix] || {
      count: 0,
      windowStart: null,
      resetAt: null,
      isRateLimited: false,
      lastUsedAt: null
    };

    if (item.resetAt && now >= item.resetAt) {
      item = {
        count: 0,
        windowStart: null,
        resetAt: null,
        isRateLimited: false,
        lastUsedAt: null
      };
    }

    const count = Math.min(IMGBB_RATE_LIMIT_PER_KEY, item.count || 0);
    const remaining = Math.max(0, IMGBB_RATE_LIMIT_PER_KEY - count);
    const isRateLimited = Boolean(item.isRateLimited || remaining === 0);

    let resetSeconds = 0;
    if (item.resetAt && item.resetAt > now) {
      resetSeconds = Math.ceil((item.resetAt - now) / 1000);
      if (nearestResetMs === null || (item.resetAt - now) < nearestResetMs) {
        nearestResetMs = item.resetAt - now;
        nearestResetKey = idx + 1;
      }
    }

    totalUsed += count;
    if (isRateLimited) totalRateLimited++;

    return {
      index: idx + 1,
      prefix,
      keyMasked: `${key.slice(0, 4)}...${key.slice(-4)}`,
      fullKey: key,
      used: count,
      limit: IMGBB_RATE_LIMIT_PER_KEY,
      remaining,
      isRateLimited,
      resetAt: item.resetAt,
      resetSeconds,
      status: isRateLimited ? 'exhausted' : (count > 0 ? 'cooling' : 'ready')
    };
  });

  const totalLimit = keyList.length * IMGBB_RATE_LIMIT_PER_KEY;
  const totalRemaining = Math.max(0, totalLimit - totalUsed);
  const nearestResetSeconds = nearestResetMs !== null ? Math.ceil(nearestResetMs / 1000) : 0;

  return {
    keys,
    totalKeys: keyList.length,
    totalUsed,
    totalLimit,
    totalRemaining,
    totalRateLimited,
    allRateLimited: totalRateLimited >= keyList.length && keyList.length > 0,
    nearestResetSeconds,
    nearestResetKey
  };
}

/**
 * Upload multiple image files to ImgBB with automatic WebP compression, custom naming & progress tracking
 * Supports multiple comma-separated keys for automatic rotation and countdown cooldown recovery.
 *
 * @param {File[]} files - Array of image files
 * @param {string} apiKey - ImgBB API key (single or comma-separated)
 * @param {function} onProgress - Callback(uploaded, total, currentFileName, keyStats)
 * @param {object} options - Optional naming options: { namePrefix, chapterTitle, nameGenerator, autoWaitOnRateLimit }
 * @returns {Promise<string[]>} Array of image URLs
 */
export async function uploadMultipleToImgBB(files, apiKey, onProgress, options = {}) {
  const urls = [];
  const { namePrefix = '', chapterTitle = '', nameGenerator = null, autoWaitOnRateLimit = true } = options;

  const keyList = resolveImgBBKeys(apiKey);
  let activeKeyIndex = 0;

  const getKeyStats = (customExtra = {}) => {
    const summary = getImgBBUsageSummary(apiKey);
    const currentKey = keyList[activeKeyIndex % keyList.length];
    const prefix = currentKey.slice(0, 8);
    const activeKeyData = summary.keys.find(k => k.prefix === prefix) || summary.keys[0];

    return {
      activeKeyIndex: (activeKeyIndex % keyList.length) + 1,
      totalKeys: keyList.length,
      activeKeyPrefix: prefix,
      activeKeyMasked: activeKeyData?.keyMasked || '',
      keyUploaded: activeKeyData?.used || 0,
      keyLimit: IMGBB_RATE_LIMIT_PER_KEY,
      keyRemaining: activeKeyData?.remaining || 0,
      keyResetSeconds: activeKeyData?.resetSeconds || 0,
      totalUsed: summary.totalUsed,
      totalRemaining: summary.totalRemaining,
      totalLimit: summary.totalLimit,
      nearestResetSeconds: summary.nearestResetSeconds,
      nearestResetKey: summary.nearestResetKey,
      allRateLimited: summary.allRateLimited,
      keys: summary.keys,
      isWaitingCooldown: false,
      ...customExtra
    };
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let customName = '';

    if (typeof nameGenerator === 'function') {
      customName = nameGenerator(file, i, files.length);
    } else if (namePrefix) {
      const padLen = files.length >= 100 ? 3 : 2;
      const numStr = String(i + 1).padStart(padLen, '0');
      const prefix = [namePrefix, chapterTitle].filter(Boolean).join(' ');
      customName = `${prefix} ${numStr}`;
    }

    // Check if all keys are currently rate limited / out of quota
    let summary = getImgBBUsageSummary(apiKey);
    let availableKey = summary.keys.find(k => !k.isRateLimited && k.remaining > 0);

    // If all keys are exhausted, wait in cooldown countdown loop
    if (!availableKey && autoWaitOnRateLimit) {
      console.warn('Tất cả API Key ImgBB đang trong thời gian chờ hồi phục lượt tải...');
      while (!availableKey) {
        summary = getImgBBUsageSummary(apiKey);
        availableKey = summary.keys.find(k => !k.isRateLimited && k.remaining > 0);
        if (availableKey) break;

        const waitSec = summary.nearestResetSeconds || 60;
        if (onProgress) {
          onProgress(i, files.length, `Chờ hồi lượt tải (${formatCountdownTime(waitSec)})...`, getKeyStats({
            isWaitingCooldown: true,
            waitSeconds: waitSec
          }));
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (onProgress) onProgress(i, files.length, customName || file.name, getKeyStats());

    let uploaded = false;
    let lastError = null;
    let attempts = 0;

    while (!uploaded && attempts < Math.max(3, keyList.length)) {
      attempts++;

      // Pick available key or advance round-robin
      summary = getImgBBUsageSummary(apiKey);
      const readyKeys = summary.keys.filter(k => !k.isRateLimited && k.remaining > 0);
      let currentKey = keyList[activeKeyIndex % keyList.length];

      if (readyKeys.length > 0) {
        const found = readyKeys.find(k => k.prefix === currentKey.slice(0, 8));
        if (!found) {
          const readyKeyIndex = keyList.findIndex(k => k.slice(0, 8) === readyKeys[0].prefix);
          if (readyKeyIndex !== -1) {
            activeKeyIndex = readyKeyIndex;
            currentKey = keyList[activeKeyIndex];
          }
        }
      }

      const keyPrefix = currentKey.slice(0, 8);

      try {
        const result = await uploadToImgBB(file, currentKey, customName, true);
        urls.push(result.url);
        uploaded = true;

        // Record successful usage
        recordImgBBKeyUsage(currentKey, true, false);

        // Proactive rotation: switch key every ~20 uploads to spread load
        const rotateEvery = Math.max(10, Math.floor(IMGBB_RATE_LIMIT_PER_KEY / keyList.length));
        const currentUsage = getStoredImgBBKeyState()[keyPrefix]?.count || 0;
        if (keyList.length > 1 && currentUsage % rotateEvery === 0) {
          activeKeyIndex = (activeKeyIndex + 1) % keyList.length;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Lần thử ${attempts} tải ${file.name} với key ${keyPrefix}... thất bại:`, err.message);

        // Check if rate limited
        const isRateLimit = err.message.includes('Rate limit') || err.message.includes('429');
        recordImgBBKeyUsage(currentKey, false, isRateLimit);

        // If rate limited, rotate immediately to next key
        if (isRateLimit && keyList.length > 1) {
          activeKeyIndex = (activeKeyIndex + 1) % keyList.length;
          console.log(`Key ${keyPrefix} đạt giới hạn! Đổi sang Key #${(activeKeyIndex % keyList.length) + 1}`);
          await new Promise(r => setTimeout(r, 200));
          continue;
        }

        if (attempts < 3) {
          await new Promise(r => setTimeout(r, 1000 * attempts));
        }
      }
    }

    if (!uploaded) {
      throw new Error(`Upload lỗi tại file "${file.name}": ${lastError?.message || 'Không rõ nguyên nhân'}`);
    }

    // Small delay between uploads
    if (i < files.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (onProgress) onProgress(files.length, files.length, 'Hoàn thành!', getKeyStats());
  return urls;
}

// ============ FREEIMAGE.HOST UPLOAD ============

/**
 * Upload a single image file to FreeImage.host via proxy endpoint
 * Supports personal registered API key and NSFW flagging for adult manga.
 * 
 * @param {File} file - Image file to upload
 * @param {string} customName - Optional custom title/filename
 * @param {boolean} shouldOptimize - Whether to auto-compress to WebP
 * @param {string} apiKey - Optional custom FreeImage API key (from free registration at freeimage.host/settings/api)
 * @param {boolean} isNsfw - Flag image as adult content (requires registered account to avoid 403)
 * @returns {Promise<{url: string, thumb: string, deleteUrl: string}>}
 */
export async function uploadToFreeImage(file, customName = '', shouldOptimize = true, apiKey = '', isNsfw = true) {
  let fileToUpload = file;
  if (shouldOptimize) {
    try {
      fileToUpload = await optimizeMangaImage(file, { customName });
    } catch (e) {
      console.warn('Image optimization skipped:', e);
      fileToUpload = file;
    }
  }

  const effectiveKey = apiKey?.trim() || (typeof window !== 'undefined' && localStorage.getItem(FREEIMAGE_API_KEY_STORAGE)?.trim()) || FREEIMAGE_API_KEY;

  const formData = new FormData();
  formData.append('key', effectiveKey);
  formData.append('action', 'upload');
  const fileName = customName
    ? (customName.endsWith('.webp') ? customName : `${customName}.webp`)
    : fileToUpload.name;
  formData.append('source', fileToUpload, fileName);
  formData.append('format', 'json');
  if (isNsfw) {
    formData.append('nsfw', '1');
  }

  // On localhost: use Vite proxy /api/upload-freeimage
  // On production (web18p.xyz / GitHub Pages): directly call Cloudflare Worker proxy
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const endpoints = isLocalhost
    ? ['/api/upload-freeimage', 'https://web18p-deloy.takarvn.workers.dev/api/upload-freeimage']
    : ['https://web18p-deloy.takarvn.workers.dev/api/upload-freeimage', '/api/upload-freeimage'];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok && (response.status === 404 || response.status === 405)) {
        // Not found / Method Not Allowed on this domain, attempt next endpoint
        continue;
      }

      let result = null;
      try {
        result = await response.json();
      } catch (e) {
        // Response wasn't JSON
      }

      if (response.ok && result?.status_code === 200 && result?.image) {
        return {
          url: result.image.url || result.image.display_url,
          thumb: result.image.thumb?.url || result.image.display_url || result.image.url,
          deleteUrl: result.image.delete_url || ''
        };
      }

      const errorMsg = result?.error?.message || result?.error || `HTTP ${response.status} ${response.statusText}`;
      if (typeof errorMsg === 'string' && (errorMsg.toLowerCase().includes('forbidden') || result?.error?.code === 103)) {
        throw new Error(
          'FreeImage.host hiện đã chặn dải IP của Cloudflare Worker ("You have been forbidden to use this website"). ' +
          'Vui lòng chuyển sang dùng server "ImgBB" và dán API Key cá nhân (lấy miễn phí tại api.imgbb.com) để upload trực tiếp từ trình duyệt mà không bị chặn IP!'
        );
      }
      throw new Error(errorMsg);
    } catch (err) {
      lastError = err;
    }
  }

  const isNetworkOrCors = lastError?.message?.includes('Failed to fetch') || lastError?.message?.includes('NetworkError');
  if (isNetworkOrCors && !isLocalhost) {
    throw new Error(
      'Worker proxy chưa được cập nhật trên Cloudflare. Vui lòng mở Cloudflare Worker "web18p-deloy", dán nội dung file cloudflare_worker.js và bấm "Save and Deploy"!'
    );
  }

  throw new Error(`FreeImage.host upload thất bại: ${lastError?.message || 'Không thể kết nối máy chủ upload'}`);
}

/**
 * Upload multiple images to FreeImage.host with progress tracking and retry logic
 *
 * @param {File[]} files - Array of image files
 * @param {function} onProgress - Callback(uploaded, total, currentFileName)
 * @param {object} options - Optional naming options: { namePrefix, chapterTitle, nameGenerator, apiKey, isNsfw }
 * @returns {Promise<string[]>} Array of image URLs
 */
export async function uploadMultipleToFreeImage(files, onProgress, options = {}) {
  const urls = [];
  const { namePrefix = '', chapterTitle = '', nameGenerator = null, apiKey = '', isNsfw = true } = options;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let customName = '';

    if (typeof nameGenerator === 'function') {
      customName = nameGenerator(file, i, files.length);
    } else if (namePrefix) {
      const padLen = files.length >= 100 ? 3 : 2;
      const numStr = String(i + 1).padStart(padLen, '0');
      const prefix = [namePrefix, chapterTitle].filter(Boolean).join(' ');
      customName = `${prefix} ${numStr}`;
    }

    if (onProgress) onProgress(i, files.length, customName || file.name);

    let uploaded = false;
    let lastError = null;
    let attempts = 0;

    while (!uploaded && attempts < 3) {
      attempts++;
      try {
        const result = await uploadToFreeImage(file, customName, true, apiKey, isNsfw);
        urls.push(result.url);
        uploaded = true;
      } catch (err) {
        lastError = err;
        console.warn(`Lần thử ${attempts} tải ${file.name} lên FreeImage thất bại:`, err.message);
        if (attempts < 3) {
          await new Promise(r => setTimeout(r, 1000 * attempts));
        }
      }
    }

    if (!uploaded) {
      throw new Error(`FreeImage upload lỗi tại file "${file.name}": ${lastError?.message || 'Không rõ nguyên nhân'}`);
    }

    // Polite delay between requests
    if (i < files.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (onProgress) onProgress(files.length, files.length, 'Done');
  return urls;
}

// ============ CATBOX.MOE UPLOAD ============

/**
 * Upload a single image file to Catbox.moe via Cloudflare Worker proxy
 * @param {File} file - Image file to upload
 * @param {string} customName - Optional custom title/filename
 * @param {boolean} shouldOptimize - Whether to auto-compress to WebP
 * @returns {Promise<{url: string, thumb: string}>}
 */
export async function uploadToCatbox(file, customName = '', shouldOptimize = true) {
  let fileToUpload = file;
  if (shouldOptimize) {
    try {
      fileToUpload = await optimizeMangaImage(file, { customName });
    } catch (e) {
      console.warn('Image optimization skipped:', e);
      fileToUpload = file;
    }
  }

  const fileName = customName
    ? (customName.endsWith('.webp') ? customName : `${customName}.webp`)
    : fileToUpload.name;

  // Use Cloudflare Worker proxy to bypass CORS
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const endpoints = isLocalhost
    ? ['/api/upload-catbox', 'https://web18p-deloy.takarvn.workers.dev/api/upload-catbox']
    : ['https://web18p-deloy.takarvn.workers.dev/api/upload-catbox', '/api/upload-catbox'];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      // For localhost Vite proxy: send Catbox-native format (reqtype + fileToUpload)
      // For Worker proxy: send our format (source) - Worker converts it
      const isDirectCatbox = endpoint.startsWith('/api/upload-catbox');
      const uploadForm = new FormData();
      if (isDirectCatbox) {
        uploadForm.append('reqtype', 'fileupload');
        uploadForm.append('fileToUpload', fileToUpload, fileName);
      } else {
        uploadForm.append('source', fileToUpload, fileName);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: uploadForm
      });

      if (!response.ok && (response.status === 404 || response.status === 405)) {
        continue;
      }

      const responseText = await response.text();

      // Try parsing as JSON first (Worker proxy response)
      try {
        const result = JSON.parse(responseText);
        if (result?.success && result?.url) {
          return {
            url: result.url,
            thumb: result.thumb || result.url
          };
        }
        if (result?.error) {
          throw new Error(result.error);
        }
      } catch (jsonErr) {
        // Not JSON - check if it's a direct Catbox URL (Vite proxy response)
        if (responseText.trim().startsWith('https://files.catbox.moe/')) {
          const url = responseText.trim();
          return { url, thumb: url };
        }
      }

      throw new Error(responseText || `HTTP ${response.status} ${response.statusText}`);
    } catch (err) {
      lastError = err;
    }
  }

  const isNetworkOrCors = lastError?.message?.includes('Failed to fetch') || lastError?.message?.includes('NetworkError');
  if (isNetworkOrCors && !isLocalhost) {
    throw new Error(
      'Worker proxy chưa được cập nhật trên Cloudflare. Vui lòng mở Cloudflare Worker "web18p-deloy", dán nội dung file cloudflare_worker.js mới nhất và bấm "Save and Deploy"!'
    );
  }

  throw new Error(`Catbox.moe upload thất bại: ${lastError?.message || 'Không thể kết nối máy chủ upload'}`);
}

/**
 * Upload multiple images to Catbox.moe with progress tracking and retry logic
 *
 * @param {File[]} files - Array of image files
 * @param {function} onProgress - Callback(uploaded, total, currentFileName)
 * @param {object} options - Optional naming options: { namePrefix, chapterTitle, nameGenerator }
 * @returns {Promise<string[]>} Array of image URLs
 */
export async function uploadMultipleToCatbox(files, onProgress, options = {}) {
  const urls = [];
  const { namePrefix = '', chapterTitle = '', nameGenerator = null } = options;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let customName = '';

    if (typeof nameGenerator === 'function') {
      customName = nameGenerator(file, i, files.length);
    } else if (namePrefix) {
      const padLen = files.length >= 100 ? 3 : 2;
      const numStr = String(i + 1).padStart(padLen, '0');
      const prefix = [namePrefix, chapterTitle].filter(Boolean).join(' ');
      customName = `${prefix} ${numStr}`;
    }

    if (onProgress) onProgress(i, files.length, customName || file.name);

    let uploaded = false;
    let lastError = null;
    let attempts = 0;

    while (!uploaded && attempts < 3) {
      attempts++;
      try {
        const result = await uploadToCatbox(file, customName, true);
        urls.push(result.url);
        uploaded = true;
      } catch (err) {
        lastError = err;
        console.warn(`Lần thử ${attempts} tải ${file.name} lên Catbox thất bại:`, err.message);
        if (attempts < 3) {
          await new Promise(r => setTimeout(r, 1000 * attempts));
        }
      }
    }

    if (!uploaded) {
      throw new Error(`Catbox upload lỗi tại file "${file.name}": ${lastError?.message || 'Không rõ nguyên nhân'}`);
    }

    // Small delay between requests to be polite
    if (i < files.length - 1) {
      await new Promise(r => setTimeout(r, 150));
    }
  }

  if (onProgress) onProgress(files.length, files.length, 'Done');
  return urls;
}

// ============ TELEGRAM CLOUD STORAGE UPLOAD ============

/**
 * Upload a single image file to Telegram Channel via Bot API + Cloudflare Edge Cache
 * @param {File} file - Image file to upload
 * @param {string} customName - Optional custom title/filename
 * @param {boolean} shouldOptimize - Whether to auto-compress to WebP
 * @param {string} botToken - Telegram Bot Token
 * @param {string} chatId - Telegram Channel Chat ID
 * @returns {Promise<{url: string, thumb: string, fileId: string}>}
 */
export async function uploadToTelegram(file, customNameOrOptions = '', shouldOptimize = true, uploadKey = '') {
  let customName = '';
  let effectiveOptimize = shouldOptimize;
  let effectiveKey = uploadKey;
  let mangaTitle = '';
  let chapterTitle = '';
  let pageIndex = '';
  let totalPages = '';
  let threadId = '';

  if (typeof customNameOrOptions === 'object' && customNameOrOptions !== null) {
    customName = customNameOrOptions.customName || '';
    effectiveOptimize = customNameOrOptions.shouldOptimize !== undefined ? customNameOrOptions.shouldOptimize : true;
    effectiveKey = customNameOrOptions.uploadKey || uploadKey;
    mangaTitle = customNameOrOptions.mangaTitle || '';
    chapterTitle = customNameOrOptions.chapterTitle || '';
    pageIndex = customNameOrOptions.pageIndex || '';
    totalPages = customNameOrOptions.totalPages || '';
    threadId = customNameOrOptions.threadId || '';
  } else {
    customName = customNameOrOptions;
  }

  let fileToUpload = file;
  if (effectiveOptimize) {
    try {
      fileToUpload = await optimizeMangaImage(file, { customName });
    } catch (e) {
      console.warn('Image optimization skipped:', e);
      fileToUpload = file;
    }
  }

  const fileName = customName
    ? (customName.endsWith('.webp') ? customName : `${customName}.webp`)
    : fileToUpload.name;

  const formData = new FormData();
  formData.append('file', fileToUpload, fileName);
  if (mangaTitle) formData.append('manga_title', mangaTitle);
  if (chapterTitle) formData.append('chapter', chapterTitle);
  if (pageIndex) formData.append('page_index', String(pageIndex));
  if (totalPages) formData.append('total_pages', String(totalPages));
  if (threadId) formData.append('thread_id', String(threadId));

  const authKey = effectiveKey?.trim()
    || (typeof window !== 'undefined' && localStorage.getItem(TELEGRAM_UPLOAD_KEY_STORAGE)?.trim())
    || '';

  const headers = {};
  if (authKey) {
    headers['X-Upload-Key'] = authKey;
  }

  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(`${TELEGRAM_CDN_DOMAIN}/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success && result.url) {
        return {
          url: result.url,
          thumb: result.url,
          fileId: result.file_id || ''
        };
      }

      if (response.status === 429) {
        const waitSec = 3 * attempt;
        console.warn(`[Telegram Upload RateLimit] Cho ${waitSec}s...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }

      throw new Error(result.error || `Loi tai anh HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
      if (attempt < 4) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw new Error(`Telegram upload that bai: ${lastError?.message || 'Khong ro nguyen nhan'}`);
}

/**
 * Upload multiple images to Telegram via Cloudflare Worker Proxy with Structured Metadata
 *
 * @param {File[]} files - Array of image files
 * @param {function} onProgress - Callback(uploaded, total, currentFileName)
 * @param {object} options - { namePrefix, chapterTitle, mangaTitle, nameGenerator, uploadKey, threadId }
 * @returns {Promise<string[]>} Array of image URLs
 */
export async function uploadMultipleToTelegram(files, onProgress, options = {}) {
  const urls = [];
  const {
    namePrefix = '',
    chapterTitle = '',
    mangaTitle = '',
    uploadKey = '',
    threadId = '',
    batchSize = 10 // Gom tối đa 10 ảnh / 1 cục album media group
  } = options;

  const totalFiles = files.length;
  let uploadedCount = 0;

  for (let i = 0; i < totalFiles; i += batchSize) {
    const chunk = files.slice(i, i + batchSize);
    const chunkStartPage = i + 1;

    // Tối ưu ảnh WebP cho các ảnh trong chunk
    const optimizedFiles = [];
    for (let j = 0; j < chunk.length; j++) {
      const file = chunk[j];
      const pageNum = chunkStartPage + j;
      const padLen = totalFiles >= 100 ? 3 : 2;
      const numStr = String(pageNum).padStart(padLen, '0');
      const customName = [namePrefix, chapterTitle, numStr].filter(Boolean).join(' ') || file.name;

      if (onProgress) {
        onProgress(uploadedCount, totalFiles, `Đang nén WebP trang ${pageNum}/${totalFiles}...`);
      }

      try {
        const opt = await optimizeMangaImage(file, { customName });
        optimizedFiles.push({ file: opt, fileName: opt.name });
      } catch (e) {
        optimizedFiles.push({ file, fileName: file.name });
      }
    }

    if (onProgress) {
      onProgress(uploadedCount, totalFiles, `Đang tải album cục ${Math.floor(i / batchSize) + 1} (${chunkStartPage}-${chunkStartPage + chunk.length - 1}/${totalFiles})...`);
    }

    // Gửi chunk lên Worker qua endpoint /upload-album (Media Group)
    let chunkSuccess = false;
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const formData = new FormData();
        optimizedFiles.forEach(item => {
          formData.append('files', item.file, item.fileName);
        });
        if (mangaTitle) formData.append('manga_title', mangaTitle);
        if (chapterTitle) formData.append('chapter', chapterTitle);
        formData.append('start_page', String(chunkStartPage));
        formData.append('total_pages', String(totalFiles));
        if (threadId) formData.append('thread_id', String(threadId));

        const effectiveKey = uploadKey?.trim()
          || (typeof window !== 'undefined' && localStorage.getItem(TELEGRAM_UPLOAD_KEY_STORAGE)?.trim())
          || '';
        const headers = {};
        if (effectiveKey) headers['X-Upload-Key'] = effectiveKey;

        const res = await fetch(`${TELEGRAM_CDN_DOMAIN}/upload-album`, {
          method: 'POST',
          headers,
          body: formData
        });

        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.results)) {
          data.results.forEach(r => {
            urls.push(r.url);
          });
          uploadedCount += chunk.length;
          chunkSuccess = true;
          if (onProgress) {
            onProgress(uploadedCount, totalFiles, `Đã đăng cục album ${Math.floor(i / batchSize) + 1} (${uploadedCount}/${totalFiles})`);
          }
          break;
        }

        if (res.status === 429) {
          console.warn(`[Telegram FloodWait] Chờ 5s...`);
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        throw new Error(data.error || `HTTP ${res.status}`);
      } catch (err) {
        lastError = err;
        console.warn(`Thử lại album (${chunkStartPage}-${chunkStartPage + chunk.length - 1}) lần ${attempt}:`, err.message);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1500 * attempt));
        }
      }
    }

    if (!chunkSuccess) {
      throw new Error(`Tải Album (${chunkStartPage}-${chunkStartPage + chunk.length - 1}) thất bại: ${lastError?.message || 'Không rõ nguyên nhân'}`);
    }

    // Nghỉ nhẹ giữa các album để Telegram xử lý collage
    if (i + batchSize < totalFiles) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  if (onProgress) onProgress(totalFiles, totalFiles, 'Done');
  return urls;
}

// ============ UNIFIED UPLOAD HELPERS ============

/**
 * Upload a single image file using the selected provider
 */
export async function uploadSingleMangaImage(file, options = {}) {
  const { provider = 'telegram', apiKey = '', customName = '', shouldOptimize = true, isNsfw = true, botToken = '', chatId = '' } = options;
  if (provider === 'telegram') {
    return uploadToTelegram(file, customName, shouldOptimize, options.uploadKey || '');
  }
  if (provider === 'catbox') {
    return uploadToCatbox(file, customName, shouldOptimize);
  }
  if (provider === 'imgbb') {
    return uploadToImgBB(file, apiKey, customName, shouldOptimize);
  }
  return uploadToFreeImage(file, customName, shouldOptimize, apiKey, isNsfw);
}

/**
 * Upload multiple images using the selected provider
 */
export async function uploadMultipleMangaImages(files, onProgress, options = {}) {
  const { provider = 'telegram', apiKey = '', isNsfw = true, botToken = '', chatId = '', ...restOptions } = options;
  if (provider === 'telegram') {
    return uploadMultipleToTelegram(files, onProgress, restOptions);
  }
  if (provider === 'catbox') {
    return uploadMultipleToCatbox(files, onProgress, restOptions);
  }
  if (provider === 'imgbb') {
    return uploadMultipleToImgBB(files, apiKey, onProgress, restOptions);
  }
  return uploadMultipleToFreeImage(files, onProgress, { apiKey, isNsfw, ...restOptions });
}

// ============ FOLDER PARSING ============

/**
 * Check if a file is an image based on extension/type
 */
function isImageFile(file) {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return file.type?.startsWith('image/') || imageExts.includes(ext);
}

/**
 * Natural sort comparator for filenames (001.jpg < 002.jpg < 10.jpg)
 */
function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Parse a FileList from a folder input into chapter structure.
 * Expects structure:
 *   FolderName/
 *     Chapter 1/
 *       001.jpg, 002.jpg, ...
 *     Chapter 2/
 *       001.jpg, 002.jpg, ...
 *
 * If no subfolders, treats all images as a single chapter.
 *
 * @param {FileList} fileList - Files from <input webkitdirectory>
 * @returns {{ mangaTitle: string, chapters: Array<{name: string, files: File[]}> }}
 */
export function parseFolderStructure(fileList) {
  const allFiles = Array.from(fileList || []);
  const files = allFiles.filter(isImageFile);

  if (files.length === 0) {
    return { mangaTitle: '', chapters: [] };
  }

  // Normalize path separators (both / and \)
  const pathParts = files.map(f => {
    const rawPath = f.webkitRelativePath || f.name || '';
    const normalized = rawPath.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    return { file: f, parts };
  });

  // Detect manga title from root folder name (if available)
  let mangaTitle = '';
  if (pathParts[0]?.parts.length >= 2) {
    mangaTitle = pathParts[0].parts[0];
  }

  // Group files by chapter
  const chapterMap = new Map();

  for (const { file, parts } of pathParts) {
    let chapterName = 'Chapter 1';

    if (parts.length >= 3) {
      // MangaName/ChapterFolder/image.jpg
      chapterName = parts[1];
    } else if (parts.length === 2) {
      // MangaName/image.jpg or ChapterFolder/image.jpg
      chapterName = 'Chapter 1';
    } else {
      // Direct image file
      chapterName = 'Chapter 1';
    }

    if (!chapterMap.has(chapterName)) {
      chapterMap.set(chapterName, []);
    }
    chapterMap.get(chapterName).push(file);
  }

  // Sort chapter names naturally, and sort files within each chapter
  const chapterNames = [...chapterMap.keys()].sort(naturalSort);
  const chapters = chapterNames.map(name => ({
    name,
    files: (chapterMap.get(name) || []).sort((a, b) => naturalSort(a.name, b.name))
  }));

  return { mangaTitle, chapters };
}

/**
 * Count total images across all chapters
 */
export function countTotalImages(chapters) {
  return chapters.reduce((sum, ch) => sum + ch.files.length, 0);
}

/**
 * Generate a slug from a title
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============ ARCHIVE (EPUB / CBZ / ZIP) EXTRACTION ============

/**
 * Check if a file is an archive (.epub, .cbz, .zip)
 */
export function isArchiveFile(file) {
  if (!file) return false;
  const fileName = (file.name || '').toLowerCase();
  return fileName.endsWith('.epub') || fileName.endsWith('.cbz') || fileName.endsWith('.zip');
}

/**
 * Smart extraction of manga title and chapter name from archive filename
 * E.g. "VỢ-TÔI-NHIỄM-NHIỄM-CHƯƠNG-1.epub" -> { title: "VỢ TÔI NHIỄM NHIỄM", chapterName: "Chương 1" }
 * "One Piece Chap 1000.cbz" -> { title: "One Piece", chapterName: "Chap 1000" }
 */
export function parseMangaTitleAndChapter(filename) {
  if (!filename) return { title: '', chapterName: 'Chapter 1' };
  const nameWithoutExt = filename.replace(/\.(epub|cbz|zip)$/i, '').trim();

  // Look for chapter keyword and number
  const chRegex = /(?:[-_\s]+)?(?:\b|_|-)(chương|chuong|chapter|chap|ch|tập|tap|vol)[\s._-]*(\d+(?:\.\d+)?)/i;
  const match = nameWithoutExt.match(chRegex);

  if (match) {
    const rawWord = match[1];
    // Capitalize first letter: "chương" -> "Chương", "chap" -> "Chap"
    const prefixWord = rawWord.charAt(0).toUpperCase() + rawWord.slice(1);
    const chapterNum = match[2];
    const chapterName = `${prefixWord} ${chapterNum}`;
    const rawTitle = nameWithoutExt.slice(0, match.index).trim();
    const title = rawTitle.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    return { title, chapterName };
  }

  const title = nameWithoutExt.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return { title, chapterName: 'Chapter 1' };
}

/**
 * Extract images from a single .epub, .cbz or .zip archive file.
 * Returns chapter list and detected title.
 *
 * @param {File} file - The .epub, .cbz or .zip file
 * @param {function} onProgress - Callback (current, total, filename)
 * @returns {Promise<{ mangaTitle: string, chapters: Array<{ name: string, files: File[] }> }>}
 */
export async function extractArchiveToChapters(file, onProgress) {
  const zip = await JSZip.loadAsync(file);
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'];

  const imageEntries = [];
  let opfEntry = null;

  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    const lower = relativePath.toLowerCase();
    if (imageExts.some(ext => lower.endsWith(ext))) {
      imageEntries.push({ path: relativePath, entry });
    } else if (lower.endsWith('.opf')) {
      opfEntry = entry;
    }
  });

  if (imageEntries.length === 0) {
    throw new Error(`Không tìm thấy hình ảnh nào trong file "${file.name}"`);
  }

  // Check if EPUB has OPF metadata
  let metaTitle = '';
  const orderedManifestPaths = [];

  if (opfEntry) {
    try {
      const opfXml = await opfEntry.async('string');
      const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
      if (titleMatch && titleMatch[1].trim() && titleMatch[1].trim().toLowerCase() !== 'unknown') {
        metaTitle = titleMatch[1].trim();
      }

      // Read manifest order
      const itemRegex = /<item\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
      let m;
      while ((m = itemRegex.exec(opfXml)) !== null) {
        const href = decodeURIComponent(m[1]);
        if (imageExts.some(ext => href.toLowerCase().endsWith(ext))) {
          orderedManifestPaths.push(href);
        }
      }
    } catch (e) {
      console.warn('Cannot parse OPF metadata:', e);
    }
  }

  // Sort images
  let sortedEntries;
  if (orderedManifestPaths.length === imageEntries.length && orderedManifestPaths.length > 0) {
    const pathToEntryMap = new Map();
    imageEntries.forEach(ie => {
      pathToEntryMap.set(ie.path, ie);
      pathToEntryMap.set(ie.path.split('/').pop(), ie);
    });
    const mapped = [];
    for (const p of orderedManifestPaths) {
      const found = pathToEntryMap.get(p) || pathToEntryMap.get(p.split('/').pop());
      if (found && !mapped.includes(found)) {
        mapped.push(found);
      }
    }
    if (mapped.length === imageEntries.length) {
      sortedEntries = mapped;
    }
  }

  if (!sortedEntries) {
    sortedEntries = [...imageEntries].sort((a, b) =>
      a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' })
    );
  }

  // Mime types
  const mimeMap = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    avif: 'image/avif'
  };

  // Convert entries to File objects
  const { title: parsedTitle, chapterName } = parseMangaTitleAndChapter(file.name);
  const detectedTitle = metaTitle || parsedTitle;

  // Check if archive has subdirectories that represent distinct chapters (e.g. Chapter 1/..., Chapter 2/...)
  // If it's a standard EPUB or flat zip, all images belong to one chapter.
  const pathPartsList = sortedEntries.map(e => ({
    entry: e,
    parts: e.path.replace(/\\/g, '/').split('/').filter(Boolean)
  }));

  // Detect if there are multiple chapter subdirectories
  const subfolders = new Set();
  pathPartsList.forEach(({ parts }) => {
    if (parts.length >= 2) {
      const parentDir = parts[0].toLowerCase();
      // Exclude common epub directories like 'oebps', 'images', 'ops', 'meta-inf'
      if (!['images', 'img', 'oebps', 'ops', 'meta-inf'].includes(parentDir)) {
        subfolders.add(parts[0]);
      }
    }
  });

  const chapters = [];

  if (subfolders.size > 1) {
    // Multi-chapter archive
    const chapterMap = new Map();
    for (let i = 0; i < pathPartsList.length; i++) {
      const { entry, parts } = pathPartsList[i];
      const chKey = parts.length >= 2 ? parts[0] : (chapterName || 'Chapter 1');
      if (!chapterMap.has(chKey)) chapterMap.set(chKey, []);
      
      const blob = await entry.entry.async('blob');
      const ext = entry.path.split('.').pop().toLowerCase();
      const type = mimeMap[ext] || 'image/jpeg';
      const fileName = entry.path.split('/').pop() || `page_${i + 1}.${ext}`;
      const imgFile = new File([blob], fileName, { type, lastModified: Date.now() });

      chapterMap.get(chKey).push(imgFile);
      if (onProgress) onProgress(i + 1, pathPartsList.length, fileName);
    }

    const sortedChNames = [...chapterMap.keys()].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    sortedChNames.forEach(name => {
      chapters.push({
        name,
        files: chapterMap.get(name)
      });
    });
  } else {
    // Single chapter archive (e.g., VỢ-TÔI-NHIỄM-NHIỄM-CHƯƠNG-1.epub)
    const fileObjects = [];
    for (let i = 0; i < sortedEntries.length; i++) {
      const { path, entry } = sortedEntries[i];
      const blob = await entry.async('blob');
      const ext = path.split('.').pop().toLowerCase();
      const type = mimeMap[ext] || 'image/jpeg';
      const fileName = path.split('/').pop() || `page_${i + 1}.${ext}`;
      const imgFile = new File([blob], fileName, { type, lastModified: Date.now() });
      fileObjects.push(imgFile);

      if (onProgress) onProgress(i + 1, sortedEntries.length, fileName);
    }

    chapters.push({
      name: chapterName || 'Chapter 1',
      files: fileObjects
    });
  }

  return {
    mangaTitle: detectedTitle,
    chapters
  };
}

/**
 * Parse one or multiple .epub, .cbz or .zip files into chapters.
 *
 * @param {FileList|File[]} files - Selected archive files
 * @param {function} onProgress - Callback ({ currentFile, totalFiles, currentImage, totalImages, filename, archiveName })
 * @returns {Promise<{ mangaTitle: string, chapters: Array<{ name: string, files: File[] }> }>}
 */
export async function parseArchiveFiles(files, onProgress) {
  const archiveList = Array.from(files || []).filter(isArchiveFile);
  if (archiveList.length === 0) {
    return { mangaTitle: '', chapters: [] };
  }

  let finalMangaTitle = '';
  const allChapters = [];

  for (let fi = 0; fi < archiveList.length; fi++) {
    const archFile = archiveList[fi];
    const { mangaTitle, chapters } = await extractArchiveToChapters(
      archFile,
      (currentImg, totalImgs, imgName) => {
        if (onProgress) {
          onProgress({
            currentFile: fi + 1,
            totalFiles: archiveList.length,
            currentImage: currentImg,
            totalImages: totalImgs,
            filename: imgName,
            archiveName: archFile.name
          });
        }
      }
    );

    if (mangaTitle && !finalMangaTitle) {
      finalMangaTitle = mangaTitle;
    }

    allChapters.push(...chapters);
  }

  // Sort chapters naturally by name
  allChapters.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );

  return {
    mangaTitle: finalMangaTitle,
    chapters: allChapters
  };
}

