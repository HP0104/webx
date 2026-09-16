/**
 * StreamHG API Integration Service
 * Documentation based on StreamHG API specs:
 * 1. Get upload server: GET https://streamhgapi.com/api/upload/server?key={key}
 * 2. Upload file: POST to upload server with FormData(file, api_key)
 * 3. Filecode returned -> embed url: https://streamhg.com/e/{filecode}
 */

const STREAMHG_API_URL = 'https://streamhgapi.com/api';
export const STREAMHG_STORAGE_KEY = 'webx_streamhg_api_key';

export function getStreamHGKey() {
  return localStorage.getItem(STREAMHG_STORAGE_KEY) || import.meta.env.VITE_STREAMHG_API_KEY || '';
}

export function saveStreamHGKey(key) {
  if (key) {
    localStorage.setItem(STREAMHG_STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STREAMHG_STORAGE_KEY);
  }
}

/**
 * Get the upload server URL from StreamHG
 * @param {string} apiKey
 * @returns {Promise<string>} Upload server URL
 */
export async function getUploadServer(apiKey) {
  const key = apiKey || getStreamHGKey();
  if (!key) {
    throw new Error('Chưa cấu hình API Key StreamHG.');
  }

  const response = await fetch(`${STREAMHG_API_URL}/upload/server?key=${encodeURIComponent(key)}`);
  if (!response.ok) {
    throw new Error(`Lỗi kết nối StreamHG: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.status !== 200 || !data.result) {
    throw new Error(data.msg || 'Không lấy được máy chủ upload từ StreamHG.');
  }

  return data.result;
}

/**
 * Upload a video file to StreamHG server
 * @param {File} file Video file to upload
 * @param {string} apiKey StreamHG API key
 * @param {function} onProgress Progress callback (0 - 100)
 * @returns {Promise<{filecode: string, fn: string, embedUrl: string, thumbnailUrl: string}>}
 */
export async function uploadVideoToStreamHG(file, apiKey, onProgress) {
  const key = apiKey || getStreamHGKey();
  if (!key) {
    throw new Error('Vui lòng nhập API Key StreamHG.');
  }

  // 1. Get upload server
  const uploadServerUrl = await getUploadServer(key);

  // 2. Upload video with XMLHttpRequest to support progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('api_key', key);
    formData.append('file', file);

    if (xhr.upload && onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.status === 200 && Array.isArray(data.result) && data.result.length > 0) {
              const res = data.result[0];
              const filecode = res.filecode;
              resolve({
                filecode: filecode,
                fn: res.fn || file.name,
                embedUrl: `https://streamhg.com/e/${filecode}`,
                thumbnailUrl: `https://huntrexus.com/${filecode}.jpg`,
                directUrl: `https://streamhg.com/${filecode}.html`
              });
            } else {
              reject(new Error(data.msg || 'Lỗi xử lý phản hồi từ StreamHG.'));
            }
          } catch (e) {
            reject(new Error('Phản hồi từ StreamHG không hợp lệ: ' + e.message));
          }
        } else {
          reject(new Error(`Tải lên StreamHG thất bại (${xhr.status}). Kiểm tra API key hoặc CORS.`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Lỗi kết nối khi tải file lên StreamHG.'));
    };

    xhr.open('POST', uploadServerUrl, true);
    xhr.send(formData);
  });
}
