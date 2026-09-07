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

