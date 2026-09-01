/**
 * Manga Utilities
 * - ImgBB upload API integration
 * - Folder structure parsing for bulk chapter upload
 * - Genre and status constants
 */

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

  const formData = new FormData();
  if (customName) {
    formData.append('name', customName);
  }
  formData.append('image', fileToUpload, customName ? (customName.endsWith('.webp') ? customName : customName + '.webp') : fileToUpload.name);
  formData.append('key', apiKey);

  const response = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`ImgBB upload failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error('ImgBB upload failed: ' + JSON.stringify(result));
  }

  return {
    url: result.data.display_url || result.data.url,
    thumb: result.data.thumb?.url || result.data.url,
    deleteUrl: result.data.delete_url
  };
}

/**
 * Upload multiple image files to ImgBB with automatic WebP compression, custom naming & progress tracking
 * @param {File[]} files - Array of image files
 * @param {string} apiKey - ImgBB API key
 * @param {function} onProgress - Callback(uploaded, total, currentFileName)
 * @param {object} options - Optional naming options: { namePrefix, chapterTitle, nameGenerator }
 * @returns {Promise<string[]>} Array of image URLs
 */
export async function uploadMultipleToImgBB(files, apiKey, onProgress, options = {}) {
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

    try {
      const result = await uploadToImgBB(file, apiKey, customName, true);
      urls.push(result.url);
    } catch (err) {
      console.error(`Failed to upload ${file.name}:`, err);
      throw new Error(`Upload lỗi tại file "${file.name}": ${err.message}`);
    }

    // Small delay to avoid rate limiting
    if (i < files.length - 1) {
      await new Promise(r => setTimeout(r, 150));
    }
  }
  if (onProgress) onProgress(files.length, files.length, 'Done');
  return urls;
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
