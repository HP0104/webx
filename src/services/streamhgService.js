/**
 * StreamHG API Integration Service
 * Documentation based on StreamHG API specs:
 * 1. Get upload server: GET https://streamhgapi.com/api/upload/server?key={key}
 * 2. Upload file: POST to upload server with FormData(file, api_key, fld_id)
 * 3. Filecode returned -> embed url: https://streamhg.com/e/{filecode}
 */

const STREAMHG_API_URL = 'https://streamhgapi.com/api';

// Hệ thống sử dụng API Key tập trung từ cấu hình máy chủ/hệ thống, có thể ghi đè qua localStorage nếu đổi key mới.
export const SYSTEM_STREAMHG_API_KEY = import.meta.env.VITE_STREAMHG_API_KEY || '32607ejmodn55xwhvcvro';
export const TARGET_FOLDER_NAME = import.meta.env.VITE_STREAMHG_FOLDER || 'web18p.xyz';
export const STREAMHG_STORAGE_KEY = 'web18p_streamhg_api_key';

export function getStreamHGKey() {
  const customKey = localStorage.getItem(STREAMHG_STORAGE_KEY);
  if (customKey && customKey.trim()) {
    return customKey.trim();
  }
  return SYSTEM_STREAMHG_API_KEY;
}

export function saveStreamHGKey(key) {
  if (key && key.trim()) {
    localStorage.setItem(STREAMHG_STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STREAMHG_STORAGE_KEY);
  }
}

/**
 * Kiểm tra xác thực API Key với StreamHG
 * @param {string} apiKey 
 * @returns {Promise<{ok: boolean, msg?: string, data?: any, status?: number}>}
 */
export async function checkStreamHGAuth(apiKey) {
  const key = apiKey || getStreamHGKey();
  if (!key) {
    return { ok: false, msg: 'Chưa cấu hình API Key StreamHG.' };
  }

  try {
    const response = await fetch(`${STREAMHG_API_URL}/account/info?key=${encodeURIComponent(key)}`);
    const data = await response.json();

    if (data.status === 200) {
      return { ok: true, data: data.result };
    }

    if (data.msg === 'Wrong auth') {
      return {
        ok: false,
        status: data.status,
        msg: 'StreamHG trả về "Wrong auth". Nguyên nhân: Tài khoản Webmaster trên StreamHG đang ở trạng thái Pending duyệt, hoặc API Key đã bị thay đổi/tạo mới trên streamhg.com.'
      };
    }

    return {
      ok: false,
      status: data.status,
      msg: data.msg || 'Không thể xác thực API Key StreamHG.'
    };
  } catch (err) {
    return { ok: false, msg: 'Lỗi kết nối tới StreamHG: ' + err.message };
  }
}

let cachedFolderId = null;

/**
 * Lấy folder ID của thư mục chỉ định (mặc định là web18p.xyz)
 * @param {string} apiKey 
 * @param {string} folderName 
 * @returns {Promise<string|null>}
 */
export async function getFolderId(apiKey, folderName = TARGET_FOLDER_NAME) {
  if (cachedFolderId) return cachedFolderId;

  const envFolderId = import.meta.env.VITE_STREAMHG_FOLDER_ID;
  if (envFolderId) {
    cachedFolderId = envFolderId.toString();
    return cachedFolderId;
  }

  const key = apiKey || getStreamHGKey();
  if (!key) return null;

  try {
    const response = await fetch(`${STREAMHG_API_URL}/folder/list?key=${encodeURIComponent(key)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 200 && data.result) {
        const folders = Array.isArray(data.result) ? data.result : (data.result.folders || []);
        const found = folders.find(f => (f.name || '').toLowerCase() === folderName.toLowerCase());
        if (found) {
          cachedFolderId = (found.fld_id || found.id).toString();
          return cachedFolderId;
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi lấy danh sách thư mục StreamHG:', err.message);
  }

  return null;
}

/**
 * Lấy URL máy chủ upload từ StreamHG
 * @param {string} apiKey
 * @returns {Promise<string>} Upload server URL
 */
export async function getUploadServer(apiKey) {
  const key = apiKey || getStreamHGKey();
  if (!key) {
    throw new Error('Hệ thống chưa cấu hình API Key StreamHG trong .env (VITE_STREAMHG_API_KEY).');
  }

  const response = await fetch(`${STREAMHG_API_URL}/upload/server?key=${encodeURIComponent(key)}`);
  if (!response.ok) {
    throw new Error(`Lỗi kết nối StreamHG: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.status !== 200 || !data.result) {
    if (data.msg === 'Wrong auth') {
      throw new Error('Wrong auth (API Key không khớp hoặc tài khoản Webmaster trên StreamHG vẫn đang Pending chưa được kích hoạt API upload). Bạn có thể tải file trực tiếp trên trang streamhg.com rồi dán link vào bên dưới');
    }
    throw new Error(data.msg || 'Không lấy được máy chủ upload từ StreamHG. Kiểm tra lại API Key.');
  }

  return data.result;
}

/**
 * Tải video lên StreamHG vào thư mục chỉ định (web18p.xyz)
 * @param {File} file Video file to upload
 * @param {function} onProgress Progress callback (0 - 100)
 * @param {string} targetFolderName Tên thư mục đích (mặc định web18p.xyz)
 * @returns {Promise<{filecode: string, fn: string, embedUrl: string, thumbnailUrl: string}>}
 */
export async function uploadVideoToStreamHG(file, onProgress, targetFolderName = TARGET_FOLDER_NAME) {
  const key = getStreamHGKey();
  if (!key) {
    throw new Error('Chưa cấu hình API Key StreamHG trong hệ thống.');
  }

  // 1. Lấy ID thư mục (ví dụ thư mục web18p.xyz)
  const folderId = await getFolderId(key, targetFolderName);

  // 2. Lấy máy chủ upload
  const uploadServerUrl = await getUploadServer(key);

  // 3. Tiến hành upload video
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('key', key);
    formData.append('file', file);
    if (folderId) {
      formData.append('fld_id', folderId);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            // StreamHG API trả về files: [...] hoặc result: [...]
            const fileList = data.files || data.result;
            if (data.status === 200 && Array.isArray(fileList) && fileList.length > 0) {
              const res = fileList[0];
              const filecode = res.filecode;
              if (!filecode) {
                reject(new Error(res.status || 'Máy chủ StreamHG từ chối file này.'));
                return;
              }
              resolve({
                filecode: filecode,
                fn: res.filename || res.fn || file.name,
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
        } else if (xhr.status === 0) {
          reject(new Error('Trình duyệt bị chặn CORS bởi máy chủ lưu trữ CDN StreamHG (không cho phép tải file lớn từ web bên ngoài). Bạn hãy tải file trực tiếp trên streamhg.com vào thư mục web18p.xyz rồi dán link vào form bên dưới'));
        } else {
          reject(new Error(`Tải lên StreamHG thất bại (${xhr.status}). Kiểm tra API key hoặc đường truyền.`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Trình duyệt bị chặn CORS bởi máy chủ lưu trữ CDN StreamHG (không cho phép tải file lớn từ web bên ngoài). Bạn hãy tải file trực tiếp trên streamhg.com vào thư mục web18p.xyz rồi dán link vào form bên dưới'));
    };

    xhr.open('POST', uploadServerUrl, true);
    xhr.send(formData);
  });
}

/**
 * Tải video lên StreamHG từ đường link URL trực tiếp (Remote Upload)
 * Hoạt động 100% không bị CORS vì gọi qua API StreamHG!
 * @param {string} videoUrl 
 * @param {string} targetFolderName 
 * @returns {Promise<{filecode: string, embedUrl: string, thumbnailUrl: string}>}
 */
export async function remoteUploadUrlToStreamHG(videoUrl, targetFolderName = TARGET_FOLDER_NAME) {
  const key = getStreamHGKey();
  if (!key) {
    throw new Error('Chưa cấu hình API Key StreamHG.');
  }

  const folderId = await getFolderId(key, targetFolderName);
  let apiUrl = `${STREAMHG_API_URL}/upload/url?key=${encodeURIComponent(key)}&url=${encodeURIComponent(videoUrl.trim())}`;
  if (folderId) {
    apiUrl += `&fld_id=${encodeURIComponent(folderId)}`;
  }

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Lỗi kết nối StreamHG: ${response.status}`);
  }

  const data = await response.json();
  if (data.status === 200 && data.result && data.result.filecode) {
    const filecode = data.result.filecode;
    return {
      filecode,
      embedUrl: `https://streamhg.com/e/${filecode}`,
      thumbnailUrl: `https://huntrexus.com/${filecode}.jpg`,
      directUrl: `https://streamhg.com/${filecode}.html`
    };
  }

  throw new Error(data.msg || 'Không thể Remote Upload URL lên StreamHG.');
}
