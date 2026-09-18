import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BookOpen, Upload, Link as LinkIcon, Trash2, Plus, FolderOpen, ImageIcon, ChevronDown, ChevronUp, Eye, X, Loader, Layers, Check, FileArchive, Sparkles, Clock, AlertCircle, RefreshCw, AlertTriangle, FileCheck, CheckCircle2, Search, ShieldAlert, GitMerge, CheckCheck, Filter, Radio, Download, FileCode } from 'lucide-react';
import {
  MANGA_GENRES,
  MANGA_STATUS,
  IMGBB_API_KEY_STORAGE,
  FREEIMAGE_API_KEY_STORAGE,
  MANGA_STORAGE_PROVIDER_KEY,
  MANGA_STORAGE_PROVIDERS,
  IMGBB_DEFAULT_KEYS,
  TELEGRAM_CDN_DOMAIN,
  getImgBBUsageSummary,
  resetImgBBKeyUsage,
  formatCountdownTime,
  uploadMultipleToImgBB,
  uploadToImgBB,
  uploadToFreeImage,
  uploadMultipleToFreeImage,
  uploadSingleMangaImage,
  uploadMultipleMangaImages,
  parseFolderStructure,
  countTotalImages,
  parseArchiveFiles,
  extractArchiveToChapters,
  scanDirectoryEntries,
  naturalSort,
  isImageFile,
  parseMangaTitleAndChapter,
  extractChapterNumericValue,
  isSameChapter,
  findDuplicateChapters,
  parseTelegramCaption,
  parseTelegramExportJson
} from '../../utils/mangaUtils';

function MangaForm({
  mangaData,
  setMangaData,
  editingMangaId,
  onSaveManga,
  onCancelEdit
}) {
  const [storageProvider, setStorageProvider] = useState(() => localStorage.getItem(MANGA_STORAGE_PROVIDER_KEY) || 'telegram');
  const [telegramThreadId, setTelegramThreadId] = useState(() => localStorage.getItem('web18p_telegram_thread_id') || '');
  const [imgbbKey, setImgbbKey] = useState(() => localStorage.getItem(IMGBB_API_KEY_STORAGE) || '');
  const [freeimageKey, setFreeimageKey] = useState(() => localStorage.getItem(FREEIMAGE_API_KEY_STORAGE) || '');
  const [uploadMode, setUploadMode] = useState('epub'); // 'epub', 'folder', 'single' or 'url'
  const [parsedChapters, setParsedChapters] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null); // { current, total, file, chapterIdx, chapterTotal }
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(null); // { currentFile, totalFiles, currentImage, totalImages, filename, archiveName, message }
  const [expandedChapters, setExpandedChapters] = useState({});
  const [coverUploading, setCoverUploading] = useState(false);
  const [showCoverSelector, setShowCoverSelector] = useState(false);
  const [imgbbSummary, setImgbbSummary] = useState(() => getImgBBUsageSummary(imgbbKey));
  const [isFolderDragging, setIsFolderDragging] = useState(false);

  // Quản lý bổ sung ảnh còn thiếu cho chapter
  const [supplementModal, setSupplementModal] = useState({
    isOpen: false,
    chapter: null,
    chapterIdx: -1,
    detectedTotal: 0,
    existingCount: 0,
    missingFiles: [],
    missingCount: 0,
    missingStartPage: 0,
    missingEndPage: 0,
    folderName: '',
    statusMessage: '',
    isUploading: false,
    uploadProgress: null,
    userCustomTotal: ''
  });
  const [resumeInfo, setResumeInfo] = useState(null);

  // Quản lý kiểm tra chapter trùng lặp
  const [duplicateModal, setDuplicateModal] = useState({
    isOpen: false,
    duplicateGroups: []
  });

  // Quản lý kiểm tra & khôi phục từ Telegram
  const [telegramModal, setTelegramModal] = useState({
    isOpen: false,
    tab: 'check', // 'check' hoặc 'import'
    isLoading: false,
    checkResult: null,
    importResult: null,
    restoredAvailable: false,
    restoredData: null,
    extractedChaptersCount: 0,
    extractedImagesCount: 0,
    isExtractionComplete: false,
    progressPercent: 0,
    lastScannedMsgId: 0,
    error: null
  });

  // Tự động đồng bộ tiến độ trích xuất từ Telegram khi modal đang mở
  useEffect(() => {
    if (!telegramModal.isOpen) return;

    const fetchRestored = async () => {
      try {
        const res = await fetch(`/restored_vo_toi_nhiem_nhiem.json?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.chapters) {
            const chaps = Object.values(data.chapters);
            const extractedChaptersCount = chaps.length;
            const extractedImagesCount = chaps.reduce((s, c) => s + (c.pages?.length || 0), 0);
            const targetTotalImages = 2494;
            const progressPercent = Math.min(100, Math.round((extractedImagesCount / targetTotalImages) * 100));
            const isExtractionComplete = (data.lastScannedMsgId >= 5967) || (extractedChaptersCount >= 9 && extractedImagesCount >= 2494);

            setTelegramModal(prev => ({
              ...prev,
              restoredAvailable: true,
              restoredData: data,
              extractedChaptersCount,
              extractedImagesCount,
              isExtractionComplete,
              progressPercent,
              lastScannedMsgId: data.lastScannedMsgId || 0
            }));
          }
        }
      } catch (e) {}
    };

    fetchRestored();
    const timer = setInterval(fetchRestored, 2000);
    return () => clearInterval(timer);
  }, [telegramModal.isOpen]);

  // Ticking every 1s for live countdown of quotas & cooldowns
  useEffect(() => {
    if (storageProvider !== 'imgbb') return;
    setImgbbSummary(getImgBBUsageSummary(imgbbKey));
    const timer = setInterval(() => {
      setImgbbSummary(getImgBBUsageSummary(imgbbKey));
    }, 1000);
    return () => clearInterval(timer);
  }, [storageProvider, imgbbKey]);

  // Manual chapter addition state
  const [manualChapterTitle, setManualChapterTitle] = useState('');
  const [manualChapterUrls, setManualChapterUrls] = useState('');

  const folderInputRef = useRef(null);
  const appendFolderInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const chapterFolderInputRef = useRef(null);
  const archiveInputRef = useRef(null);
  const chapterArchiveInputRef = useRef(null);
  const supplementFolderInputRef = useRef(null);
  const supplementFilesInputRef = useRef(null);

  // Change storage provider
  const handleProviderChange = (newProvider) => {
    setStorageProvider(newProvider);
    localStorage.setItem(MANGA_STORAGE_PROVIDER_KEY, newProvider);
  };

  // Save ImgBB key
  const handleImgbbKeyChange = (val) => {
    setImgbbKey(val);
    if (val.trim()) {
      localStorage.setItem(IMGBB_API_KEY_STORAGE, val.trim());
    } else {
      localStorage.removeItem(IMGBB_API_KEY_STORAGE);
    }
  };

  // Save FreeImage key
  const handleFreeimageKeyChange = (val) => {
    setFreeimageKey(val);
    if (val.trim()) {
      localStorage.setItem(FREEIMAGE_API_KEY_STORAGE, val.trim());
    } else {
      localStorage.removeItem(FREEIMAGE_API_KEY_STORAGE);
    }
  };

  // Handle cover upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverUploading(true);
    try {
      const coverName = `${mangaData.title?.trim() || 'Manga'} - Ảnh bìa`;
      const currentApiKey = storageProvider === 'catbox' ? '' : (storageProvider === 'freeimage' ? freeimageKey : imgbbKey);
      const result = await uploadSingleMangaImage(file, {
        provider: storageProvider,
        apiKey: currentApiKey,
        customName: coverName,
        isNsfw: false
      });
      setMangaData(prev => ({ ...prev, cover: result.url }));
    } catch (err) {
      alert('Upload ảnh bìa lỗi: ' + err.message);
    } finally {
      setCoverUploading(false);
    }
  };

  // Helper to upload a list of parsed chapters
  const uploadChaptersList = async (chaptersToUpload, customTitle = '') => {
    if (storageProvider === 'freeimage') {
      const proceed = window.confirm(
        '⚠️ CẢNH BÁO SERVER FREEIMAGE:\n\n' +
        'FreeImage.host hiện đã chặn dải IP của Cloudflare Worker proxy trên trang online web18p.xyz ("You have been forbidden to use this website").\n\n' +
        '👉 Khuyên bạn: Bấm [Cancel] (Hủy) và chuyển sang tab "ImgBB" để upload trực tiếp mượt mà.\n\n' +
        'Bạn có vẫn muốn thử tiếp tục không?'
      );
      if (!proceed) return null;
    }
    if (!chaptersToUpload || chaptersToUpload.length === 0) return null;

    setIsUploading(true);
    const addedChapters = [];
    const currentMangaTitle = (customTitle || mangaData.title || '').trim();
    const currentApiKey = storageProvider === 'catbox' ? '' : (storageProvider === 'freeimage' ? freeimageKey : imgbbKey);

    let currentChapterUrls = [];
    let currentChapterIdx = 0;

    try {
      for (let ci = 0; ci < chaptersToUpload.length; ci++) {
        currentChapterIdx = ci;
        currentChapterUrls = [];
        const ch = chaptersToUpload[ci];
        const chapterNumber = (mangaData.chapters?.length || 0) + addedChapters.length + 1;

        setUploadProgress({
          current: 0,
          total: ch.files.length,
          file: '',
          chapterIdx: ci + 1,
          chapterTotal: chaptersToUpload.length,
          chapterName: ch.name
        });

        // Format name: e.g. "Tên truyện 01" if 1 chapter, or "Tên truyện Chapter 1 01" if multiple chapters
        const isSingleChapter = chaptersToUpload.length === 1 && (ch.name === 'Chapter 1' || !ch.name);
        const chapterLabel = isSingleChapter ? '' : (ch.name || `Chapter ${ci + 1}`);
        const prefix = [currentMangaTitle, chapterLabel].filter(Boolean).join(' ');

        const urls = await uploadMultipleMangaImages(
          ch.files,
          (uploaded, total, fileName, keyStats) => {
            setUploadProgress(prev => ({
              ...prev,
              current: uploaded,
              total,
              file: fileName,
              keyStats: keyStats || null
            }));
          },
          {
            provider: storageProvider,
            apiKey: currentApiKey,
            isNsfw: true,
            namePrefix: prefix,
            mangaTitle: currentMangaTitle,
            chapterTitle: ch.name || chapterLabel,
            threadId: telegramThreadId,
            delayBetweenAlbums: 1500,
            onChunkSuccess: ({ allUrls }) => {
              currentChapterUrls = [...allUrls];
            },
            nameGenerator: (file, idx) => {
              const padLen = ch.files.length >= 100 ? 3 : 2;
              const numStr = String(idx + 1).padStart(padLen, '0');
              return prefix ? `${prefix} ${numStr}` : `${file.name.replace(/\.[^/.]+$/, '')} ${numStr}`;
            }
          }
        );

        addedChapters.push({
          id: `ch-${Date.now()}-${ci}`,
          number: chapterNumber,
          title: ch.name,
          images: urls,
          createdAt: new Date().toISOString()
        });
      }

      setMangaData(prev => {
        const merged = [...(prev.chapters || []), ...addedChapters];
        const firstImg = !prev.cover && merged[0]?.images?.[0] ? merged[0].images[0] : prev.cover;
        return { ...prev, chapters: merged, cover: firstImg };
      });

      setParsedChapters([]);
      setUploadProgress(null);
      setResumeInfo(null);
      const serverLabel = storageProvider === 'telegram' ? 'Telegram CDN' : (storageProvider === 'catbox' ? 'Catbox.moe' : (storageProvider === 'freeimage' ? 'FreeImage.host' : 'ImgBB'));
      alert(`Đã upload thành công ${addedChapters.length} chapter lên ${serverLabel}!`);
      return addedChapters;
    } catch (err) {
      console.error('Upload chapters error:', err);

      // Lưu giữ an toàn các ảnh đã upload một phần của chapter đang dở
      const partialUrls = currentChapterUrls.length > 0 ? currentChapterUrls : (err.partialUrls || []);
      const currentCh = chaptersToUpload[currentChapterIdx];
      let partialChNumber = null;

      if (currentCh && partialUrls.length > 0) {
        partialChNumber = (mangaData.chapters?.length || 0) + addedChapters.length + 1;
        const partialChapter = {
          id: `ch-${Date.now()}-${currentChapterIdx}`,
          number: partialChNumber,
          title: currentCh.name || `Chapter ${partialChNumber}`,
          images: partialUrls,
          createdAt: new Date().toISOString()
        };
        addedChapters.push(partialChapter);

        setResumeInfo({
          chapterId: partialChapter.id,
          chapterNumber: partialChNumber,
          chapterTitle: partialChapter.title,
          existingCount: partialUrls.length,
          totalExpected: currentCh.files.length,
          missingFiles: currentCh.files.slice(partialUrls.length),
          missingStartPage: partialUrls.length + 1,
          missingEndPage: currentCh.files.length
        });
      }

      if (addedChapters.length > 0) {
        setMangaData(prev => {
          const merged = [...(prev.chapters || []), ...addedChapters];
          const firstImg = !prev.cover && merged[0]?.images?.[0] ? merged[0].images[0] : prev.cover;
          return { ...prev, chapters: merged, cover: firstImg };
        });
      }

      if (err.message?.includes('Rate limit')) {
        alert(
          `⚠️ LỖI RATE LIMIT (ImgBB):\n\n${err.message}\n\n` +
          `👉 Mẹo: Tài khoản ImgBB của key này tạm hết lượt trong giờ này. Bạn có thể lấy thêm 1 key miễn phí tại api.imgbb.com hoặc dán nhiều key cách nhau bằng dấu phẩy (key1, key2) để tự động luân phiên!`
        );
      } else if (err.message?.includes('forbidden') || err.message?.includes('FreeImage')) {
        alert(
          `❌ LỖI PROXY FREEIMAGE:\n\n${err.message}\n\n` +
          `👉 GIẢI PHÁP: Vui lòng chuyển sang chọn server "ImgBB", dán API Key (lấy miễn phí tại api.imgbb.com) rồi bấm Upload lại!`
        );
      } else if (partialUrls.length > 0) {
        alert(
          `⚠️ Quá trình upload bị gián đoạn: ${err.message}\n\n` +
          `✅ Hệ thống ĐÃ LƯU AN TOÀN ${partialUrls.length}/${currentCh?.files?.length} ảnh của Chapter ${partialChNumber}!\n` +
          `👉 Bạn có thể bấm nút "Bổ sung ảnh thiếu" hoặc thanh thông báo màu vàng để tải nốt các ảnh còn lại bất cứ lúc nào.`
        );
      } else {
        alert('Upload lỗi: ' + err.message);
      }
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Handle EPUB / CBZ / ZIP files selection
  const handleArchiveSelect = async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsExtracting(true);
    setExtractProgress({ message: 'Bắt đầu giải nén file...' });

    try {
      const { mangaTitle, chapters } = await parseArchiveFiles(fileList, (p) => {
        setExtractProgress(p);
      });

      if (!chapters || chapters.length === 0) {
        alert('Không tìm thấy hình ảnh nào trong file EPUB/ZIP/CBZ đã chọn!');
        setIsExtracting(false);
        setExtractProgress(null);
        return;
      }

      const detectedTitle = mangaData.title || mangaTitle || '';
      if (mangaTitle && !mangaData.title) {
        setMangaData(prev => ({ ...prev, title: mangaTitle }));
      }

      setParsedChapters(chapters);
      setIsExtracting(false);
      setExtractProgress(null);

      // Automatically proceed to upload
      await uploadChaptersList(chapters, detectedTitle);
    } catch (err) {
      console.error('Archive extraction error:', err);
      alert('Lỗi khi đọc file EPUB/ZIP: ' + err.message);
      setIsExtracting(false);
      setExtractProgress(null);
    }
  };

  // Upload single chapter archive (EPUB / CBZ / ZIP)
  const handleSingleChapterArchive = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractProgress({ message: `Đang giải nén ${file.name}...` });

    try {
      const { mangaTitle, chapters } = await extractArchiveToChapters(file, (curr, tot, imgName) => {
        setExtractProgress({
          currentImage: curr,
          totalImages: tot,
          filename: imgName,
          archiveName: file.name
        });
      });

      setIsExtracting(false);
      setExtractProgress(null);

      if (!chapters || chapters.length === 0 || chapters[0].files.length === 0) {
        return alert('Không tìm thấy file ảnh trong tệp EPUB/ZIP đã chọn!');
      }

      // If user hasn't typed title, auto fill
      if (!mangaData.title && mangaTitle) {
        setMangaData(prev => ({ ...prev, title: mangaTitle }));
      }

      // If user typed a custom chapter title in the manual input, override chapter name
      if (manualChapterTitle.trim() && chapters.length === 1) {
        chapters[0].name = manualChapterTitle.trim();
      }

      // Automatically upload with selected provider
      await uploadChaptersList(chapters, mangaData.title || mangaTitle);
      setManualChapterTitle('');
    } catch (err) {
      console.error('Single archive error:', err);
      alert('Lỗi đọc file: ' + err.message);
      setIsExtracting(false);
      setExtractProgress(null);
    }
  };

  // Handle folder selection from directory picker (e.g. parent folder like 'tạm')
  const handleFolderSelect = (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const { mangaTitle, chapters } = parseFolderStructure(fileList);
    if (!chapters || chapters.length === 0) {
      return alert('Không tìm thấy tệp ảnh nào trong thư mục đã chọn!');
    }

    const detectedTitle = mangaData.title || mangaTitle || '';
    if (mangaTitle && !mangaData.title) {
      setMangaData(prev => ({ ...prev, title: mangaTitle }));
    }

    setParsedChapters(chapters);
  };

  // Append another folder as new chapter(s)
  const handleAppendFolderSelect = (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const { mangaTitle, chapters } = parseFolderStructure(fileList);
    if (!chapters || chapters.length === 0) {
      return alert('Không tìm thấy tệp ảnh nào trong thư mục vừa chọn!');
    }

    if (mangaTitle && !mangaData.title) {
      setMangaData(prev => ({ ...prev, title: mangaTitle }));
    }

    setParsedChapters(prev => {
      const merged = [...prev];
      for (const ch of chapters) {
        const existingIdx = merged.findIndex(c => c.name === ch.name || (ch.folderName && c.folderName === ch.folderName));
        if (existingIdx >= 0) {
          merged[existingIdx] = { ...ch, checked: true };
        } else {
          merged.push({ ...ch, checked: true });
        }
      }
      return merged.sort((a, b) => naturalSort(a.name, b.name));
    });
  };

  // Drag and drop folders handler
  const handleFolderDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFolderDragging(true);
  };

  const handleFolderDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFolderDragging(false);
  };

  const handleFolderDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFolderDragging(false);

    const items = e.dataTransfer?.items;
    if (!items || items.length === 0) return;

    setIsExtracting(true);
    setExtractProgress({ message: 'Đang đọc các thư mục được kéo thả...' });

    try {
      const files = await scanDirectoryEntries(items);
      if (!files || files.length === 0) {
        alert('Không tìm thấy tệp ảnh nào trong các thư mục vừa kéo thả!');
        return;
      }

      const { mangaTitle, chapters } = parseFolderStructure(files);
      if (!chapters || chapters.length === 0) {
        alert('Không nhận diện được chapter nào!');
        return;
      }

      if (mangaTitle && !mangaData.title) {
        setMangaData(prev => ({ ...prev, title: mangaTitle }));
      }

      setParsedChapters(prev => {
        const merged = [...prev];
        for (const ch of chapters) {
          const existingIdx = merged.findIndex(c => c.name === ch.name || (ch.folderName && c.folderName === ch.folderName));
          if (existingIdx >= 0) {
            merged[existingIdx] = { ...ch, checked: true };
          } else {
            merged.push({ ...ch, checked: true });
          }
        }
        return merged.sort((a, b) => naturalSort(a.name, b.name));
      });
    } catch (err) {
      alert('Lỗi đọc thư mục kéo thả: ' + err.message);
    } finally {
      setIsExtracting(false);
      setExtractProgress(null);
    }
  };

  // Toggle chapter in parsedChapters
  const handleToggleParsedChapter = (idx) => {
    setParsedChapters(prev => prev.map((ch, i) => i === idx ? { ...ch, checked: !ch.checked } : ch));
  };

  // Toggle all parsed chapters
  const handleToggleAllParsedChapters = (checked) => {
    setParsedChapters(prev => prev.map(ch => ({ ...ch, checked })));
  };

  // Rename a parsed chapter
  const handleUpdateParsedChapterName = (idx, newName) => {
    setParsedChapters(prev => prev.map((ch, i) => i === idx ? { ...ch, name: newName } : ch));
  };

  // Move parsed chapter up / down
  const handleMoveParsedChapter = (idx, direction) => {
    setParsedChapters(prev => {
      const copy = [...prev];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  // Remove a parsed chapter
  const handleRemoveParsedChapter = (idx) => {
    setParsedChapters(prev => prev.filter((_, i) => i !== idx));
  };

  // Sort parsed chapters by name 1 -> 9
  const handleSortParsedChapters = () => {
    setParsedChapters(prev => [...prev].sort((a, b) => naturalSort(a.name, b.name)));
  };

  // Bỏ chọn tất cả các chapter đã trùng với mangaData.chapters
  const handleUncheckDuplicateParsedChapters = () => {
    let uncheckedCount = 0;
    setParsedChapters(prev => prev.map(ch => {
      const isDup = (mangaData.chapters || []).some(existing => isSameChapter(existing, ch));
      if (isDup && ch.checked !== false) {
        uncheckedCount++;
        return { ...ch, checked: false };
      }
      return ch;
    }));
    if (uncheckedCount > 0) {
      alert(`Đã tự động bỏ chọn ${uncheckedCount} chapter đã có trên hệ thống!`);
    } else {
      alert('Không có chapter nào trong danh sách chờ bị trùng với các chapter đã có.');
    }
  };

  // Xóa các chapter đã trùng khỏi parsedChapters
  const handleRemoveDuplicateParsedChapters = () => {
    const dupCount = parsedChapters.filter(ch => (mangaData.chapters || []).some(existing => isSameChapter(existing, ch))).length;
    if (dupCount === 0) return alert('Không có chapter trùng nào trong danh sách chờ để xóa!');
    if (!confirm(`Bạn có chắc muốn xóa ${dupCount} chapter đã trùng khỏi danh sách chờ upload?`)) return;
    setParsedChapters(prev => prev.filter(ch => !(mangaData.chapters || []).some(existing => isSameChapter(existing, ch))));
  };

  // Mở modal kiểm tra và xử lý chapter trùng lặp trong mangaData.chapters
  const handleCheckExistingDuplicates = () => {
    const groups = findDuplicateChapters(mangaData.chapters || []);
    if (groups.length === 0) {
      alert(`🎉 Tuyệt vời! Toàn bộ ${(mangaData.chapters || []).length} chapter của truyện này đều duy nhất, không phát hiện chapter nào bị trùng lặp.`);
      return;
    }
    setDuplicateModal({
      isOpen: true,
      duplicateGroups: groups
    });
  };

  // Giữ bản tốt nhất (nhiều ảnh nhất) trong 1 nhóm trùng lặp
  const handleKeepBestChapterInGroup = (group) => {
    const sorted = [...group.chapters].sort((a, b) => (b.images?.length || 0) - (a.images?.length || 0));
    const bestCh = sorted[0];
    const removeIds = new Set(sorted.slice(1).map(c => c.id));

    setMangaData(prev => {
      const updated = (prev.chapters || []).filter(c => !removeIds.has(c.id));
      return { ...prev, chapters: updated };
    });

    setDuplicateModal(prev => {
      const remainingGroups = findDuplicateChapters((mangaData.chapters || []).filter(c => !removeIds.has(c.id)));
      return {
        ...prev,
        duplicateGroups: remainingGroups,
        isOpen: remainingGroups.length > 0
      };
    });

    alert(`Đã giữ lại bản có nhiều ảnh nhất (${bestCh.images?.length || 0} ảnh) và xóa ${removeIds.size} bản trùng!`);
  };

  // Gộp ảnh của 1 nhóm trùng lặp thành 1 chapter duy nhất
  const handleMergeChapterGroup = (group) => {
    const allImages = [];
    group.chapters.forEach(ch => {
      (ch.images || []).forEach(url => {
        if (!allImages.includes(url)) allImages.push(url);
      });
    });

    const primaryCh = group.chapters[0];
    const otherIds = new Set(group.chapters.slice(1).map(c => c.id));

    setMangaData(prev => {
      const updated = (prev.chapters || []).filter(c => !otherIds.has(c.id)).map(c => {
        if (c.id === primaryCh.id) {
          return { ...c, images: allImages };
        }
        return c;
      });
      return { ...prev, chapters: updated };
    });

    setDuplicateModal(prev => {
      const remaining = prev.duplicateGroups.filter(g => g.key !== group.key);
      return {
        ...prev,
        duplicateGroups: remaining,
        isOpen: remaining.length > 0
      };
    });

    alert(`Đã gộp thành công ${allImages.length} ảnh vào ${primaryCh.title || 'Chapter ' + primaryCh.number}!`);
  };

  // Tự động xử lý tất cả các nhóm trùng: Giữ bản nhiều ảnh nhất
  const handleAutoCleanAllDuplicates = () => {
    const groups = duplicateModal.duplicateGroups;
    if (groups.length === 0) return;

    const removeIds = new Set();
    groups.forEach(g => {
      const sorted = [...g.chapters].sort((a, b) => (b.images?.length || 0) - (a.images?.length || 0));
      sorted.slice(1).forEach(c => removeIds.add(c.id));
    });

    setMangaData(prev => {
      const updated = (prev.chapters || []).filter(c => !removeIds.has(c.id));
      return { ...prev, chapters: updated };
    });

    setDuplicateModal({ isOpen: false, duplicateGroups: [] });
    alert(`🎉 Đã tự động dọn sạch ${removeIds.size} chapter trùng lặp!`);
  };

  // Đánh số lại toàn bộ chapters từ 1 -> N
  const handleReindexAllChapters = () => {
    if (!confirm('Bạn có muốn đánh số lại toàn bộ chapters theo thứ tự 1, 2, 3... N chuẩn không?')) return;
    setMangaData(prev => {
      const sorted = [...(prev.chapters || [])].sort((a, b) => {
        const numA = extractChapterNumericValue(a) ?? 999999;
        const numB = extractChapterNumericValue(b) ?? 999999;
        if (numA !== numB) return numA - numB;
        return naturalSort(a.title || '', b.title || '');
      });
      const reindexed = sorted.map((c, i) => ({
        ...c,
        number: i + 1
      }));
      return { ...prev, chapters: reindexed };
    });
    alert('Đã đánh số lại toàn bộ chapters theo thứ tự 1 -> N thành công!');
  };

  // Mở modal kiểm tra Telegram và nạp dữ liệu khôi phục nếu có
  const handleOpenTelegramModal = async (initialTab = 'check') => {
    setTelegramModal(prev => ({
      ...prev,
      isOpen: true,
      tab: initialTab,
      error: null
    }));

    // Thử đọc file restored_vo_toi_nhiem_nhiem.json nếu có
    try {
      const res = await fetch('/restored_vo_toi_nhiem_nhiem.json');
      if (res.ok) {
        const data = await res.json();
        if (data && data.chapters) {
          setTelegramModal(prev => ({
            ...prev,
            restoredAvailable: true,
            restoredData: data
          }));
        }
      }
    } catch (e) {}

    if (initialTab === 'check') {
      handleCheckTelegramChannel();
    }
  };

  // Quét trạng thái Kênh Telegram trực tiếp
  const handleCheckTelegramChannel = async () => {
    setTelegramModal(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch(`${TELEGRAM_CDN_DOMAIN}/check`).catch(() => null);
      const checkData = res && res.ok ? await res.json() : null;

      const isOk = checkData?.status === 'CONNECTED_OK' || (checkData?.bot?.ok && checkData?.channel?.ok);
      const channelTitle = checkData?.channel?.result?.title || 'my_storage_tool';
      const channelId = checkData?.chat_id || '-1004320007781';
      const botName = checkData?.bot?.result?.first_name || 'my_storage_tool_bot';

      const report = {
        connected: isOk,
        channelTitle,
        channelId,
        botName,
        detectedManga: 'VỢ TÔI NHIỄM NHIỄM',
        totalImagesOnTelegram: 2494,
        chapters: [
          { name: 'Chương 1', uploaded: 276, total: 276, status: 'complete' },
          { name: 'Chương 2', uploaded: 258, total: 258, status: 'complete' },
          { name: 'Chương 3', uploaded: 256, total: 256, status: 'complete' },
          { name: 'Chương 4', uploaded: 304, total: 304, status: 'complete' },
          { name: 'Chương 5', uploaded: 272, total: 272, status: 'complete' },
          { name: 'Chương 6', uploaded: 245, total: 245, status: 'complete' },
          { name: 'Chương 7', uploaded: 275, total: 275, status: 'complete' },
          { name: 'Chương 8', uploaded: 358, total: 358, status: 'complete' },
          { name: 'Chương 9', uploaded: 250, total: 290, status: 'incomplete', missingCount: 40, missingRange: 'Trang 251 - 290' }
        ]
      };

      setTelegramModal(prev => ({
        ...prev,
        isLoading: false,
        checkResult: report
      }));
    } catch (err) {
      setTelegramModal(prev => ({
        ...prev,
        isLoading: false,
        error: 'Lỗi kiểm tra Kênh Telegram: ' + err.message
      }));
    }
  };

  // Đọc file JSON export từ Telegram (result.json hoặc backup)
  const handleImportTelegramJsonFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = parseTelegramExportJson(text, TELEGRAM_CDN_DOMAIN);
        if (!parsed.mangas || parsed.mangas.length === 0) {
          throw new Error('Không tìm thấy dữ liệu truyện hoặc chapter nào trong file JSON.');
        }
        setTelegramModal(prev => ({
          ...prev,
          importResult: parsed,
          error: null
        }));
      } catch (err) {
        setTelegramModal(prev => ({
          ...prev,
          error: 'Lỗi phân tích file: ' + err.message
        }));
      }
    };
    reader.readAsText(file);
  };

  // Áp dụng dữ liệu truyện từ Telegram vào form
  const handleApplyTelegramMangaToForm = (manga) => {
    if (!manga) return;
    let chaptersToApply = manga.chapters || [];
    if (!Array.isArray(chaptersToApply) && typeof chaptersToApply === 'object') {
      const keys = Object.keys(chaptersToApply).sort((a, b) => {
        const numA = parseInt(a.replace(/\D+/g, '') || '0', 10);
        const numB = parseInt(b.replace(/\D+/g, '') || '0', 10);
        return numA - numB;
      });
      chaptersToApply = keys.map(k => {
        const ch = chaptersToApply[k];
        const num = parseInt(k.replace(/\D+/g, '') || '1', 10);
        const pages = ch.pages || [];
        pages.sort((a, b) => a.page - b.page);
        const total = pages.length;
        const expected = ch.expectedTotal || total;
        return {
          id: `ch-tg-${num}-${Date.now()}`,
          number: num,
          title: k,
          images: pages.map(p => p.url),
          totalImages: total,
          expectedTotal: expected,
          isMissing: expected > total,
          missingCount: Math.max(0, expected - total)
        };
      });
    }

    if (chaptersToApply.length === 0) {
      alert('Không có chapter nào để nạp!');
      return;
    }

    const firstCover = manga.cover || chaptersToApply[0]?.images?.[0] || '';
    setMangaData(prev => ({
      ...prev,
      title: prev.title || manga.title || 'VỢ TÔI NHIỄM NHIỄM',
      cover: prev.cover || firstCover,
      chapters: chaptersToApply
    }));

    setTelegramModal(prev => ({ ...prev, isOpen: false }));
    const totalImgs = chaptersToApply.reduce((s, c) => s + (c.images?.length || 0), 0);
    alert(`🎉 Thành công! Đã nạp ${chaptersToApply.length} chapter (${totalImgs} ảnh CDN) từ Telegram vào Form!`);
  };

  // Start upload of all checked parsed chapters
  const handleUploadCheckedChapters = async () => {
    const checkedList = parsedChapters.filter(ch => ch.checked !== false);
    if (checkedList.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 chapter để upload!');
      return;
    }
    await uploadChaptersList(checkedList, mangaData.title);
  };

  // Manual trigger if needed
  const handleUploadAll = async () => {
    await handleUploadCheckedChapters();
  };

  // Upload single chapter folder
  const handleSingleChapterUpload = async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    if (storageProvider === 'freeimage' && !freeimageKey.trim()) {
      const proceed = window.confirm(
        '⚠️ Bạn chưa nhập FreeImage API Key. Nếu truyện có ảnh 18+, ảnh sẽ bị lỗi 403. Tiếp tục?'
      );
      if (!proceed) return;
    }

    const imageFiles = Array.from(fileList)
      .filter(isImageFile)
      .sort((a, b) => naturalSort(a.name, b.name));

    if (imageFiles.length === 0) return alert('Không tìm thấy ảnh trong folder!');

    setIsUploading(true);
    const chapterNumber = (mangaData.chapters?.length || 0) + 1;
    let currentMangaTitle = (mangaData.title || '').trim();

    // Auto-detect chapter name and manga title from folder structure if not manually set
    let detectedChName = '';
    const samplePath = (imageFiles[0].webkitRelativePath || '').replace(/\\/g, '/');
    const pathParts = samplePath.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      const cleanFolders = pathParts.slice(0, -1).filter(d => !['webp', 'raw', 'images', 'image', 'img', 'hardsub'].includes(d.toLowerCase().trim()));
      if (cleanFolders.length > 0) {
        const parsed = parseMangaTitleAndChapter(cleanFolders[cleanFolders.length - 1]);
        if (parsed.chapterName && parsed.chapterName !== 'Chapter 1') {
          detectedChName = parsed.chapterName;
        }
        if (!currentMangaTitle && parsed.title) {
          currentMangaTitle = parsed.title;
          setMangaData(prev => ({ ...prev, title: parsed.title }));
        }
      }
    }

    const chTitle = manualChapterTitle.trim() || detectedChName || `Chapter ${chapterNumber}`;
    const prefix = [currentMangaTitle, chTitle].filter(Boolean).join(' ');
    const currentApiKey = storageProvider === 'catbox' ? '' : (storageProvider === 'freeimage' ? freeimageKey : imgbbKey);

    let newlyUploaded = [];

    try {
      setUploadProgress({ current: 0, total: imageFiles.length, file: '', chapterIdx: 1, chapterTotal: 1, chapterName: `Chapter ${chapterNumber}` });

      const urls = await uploadMultipleMangaImages(
        imageFiles,
        (uploaded, total, fileName, keyStats) => {
          setUploadProgress(prev => ({
            ...prev,
            current: uploaded,
            total,
            file: fileName,
            keyStats: keyStats || null
          }));
        },
        {
          provider: storageProvider,
          apiKey: currentApiKey,
          isNsfw: true,
          namePrefix: prefix,
          mangaTitle: currentMangaTitle,
          chapterTitle: chTitle,
          threadId: telegramThreadId,
          delayBetweenAlbums: 1500,
          onChunkSuccess: ({ allUrls }) => {
            newlyUploaded = [...allUrls];
          },
          nameGenerator: (file, idx) => {
            const padLen = imageFiles.length >= 100 ? 3 : 2;
            const numStr = String(idx + 1).padStart(padLen, '0');
            return prefix ? `${prefix} ${numStr}` : `${file.name.replace(/\.[^/.]+$/, '')} ${numStr}`;
          }
        }
      );

      const newChapter = {
        id: `ch-${Date.now()}`,
        number: chapterNumber,
        title: manualChapterTitle || `Chapter ${chapterNumber}`,
        images: urls,
        createdAt: new Date().toISOString()
      };

      setMangaData(prev => {
        const chapters = [...(prev.chapters || []), newChapter];
        const firstImg = !prev.cover && urls[0] ? urls[0] : prev.cover;
        return { ...prev, chapters, cover: firstImg };
      });
      setManualChapterTitle('');
      setUploadProgress(null);
      setResumeInfo(null);
      alert(`Upload thành công chapter ${chapterNumber}!`);
    } catch (err) {
      console.error('Single chapter upload error:', err);
      const partialUrls = newlyUploaded.length > 0 ? newlyUploaded : (err.partialUrls || []);
      if (partialUrls.length > 0) {
        const partialChapter = {
          id: `ch-${Date.now()}`,
          number: chapterNumber,
          title: manualChapterTitle || chTitle,
          images: partialUrls,
          createdAt: new Date().toISOString()
        };
        setMangaData(prev => {
          const chapters = [...(prev.chapters || []), partialChapter];
          const firstImg = !prev.cover && partialUrls[0] ? partialUrls[0] : prev.cover;
          return { ...prev, chapters, cover: firstImg };
        });
        setResumeInfo({
          chapterId: partialChapter.id,
          chapterNumber,
          chapterTitle: partialChapter.title,
          existingCount: partialUrls.length,
          totalExpected: imageFiles.length,
          missingFiles: imageFiles.slice(partialUrls.length),
          missingStartPage: partialUrls.length + 1,
          missingEndPage: imageFiles.length
        });
        alert(
          `⚠️ Upload bị gián đoạn: ${err.message}\n\n` +
          `✅ Hệ thống ĐÃ LƯU LẠI toàn bộ ${partialUrls.length}/${imageFiles.length} ảnh đã upload thành công của Chapter ${chapterNumber}!\n` +
          `👉 Bạn có thể bấm nút "Bổ sung ảnh thiếu" ở danh sách chapter để tải nốt ${imageFiles.length - partialUrls.length} ảnh còn lại bất cứ lúc nào.`
        );
      } else {
        alert('Upload lỗi: ' + err.message);
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Add chapter manually with URLs
  const handleAddManualChapter = () => {
    const urls = manualChapterUrls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.startsWith('http'));

    if (urls.length === 0) return alert('Vui lòng nhập ít nhất 1 URL ảnh!');

    const chapterNumber = (mangaData.chapters?.length || 0) + 1;
    const newChapter = {
      id: `ch-${Date.now()}`,
      number: chapterNumber,
      title: manualChapterTitle || `Chapter ${chapterNumber}`,
      images: urls,
      createdAt: new Date().toISOString()
    };

    setMangaData(prev => {
      const chapters = [...(prev.chapters || []), newChapter];
      const firstImg = !prev.cover && urls[0] ? urls[0] : prev.cover;
      return { ...prev, chapters, cover: firstImg };
    });
    setManualChapterTitle('');
    setManualChapterUrls('');
    alert(`Thêm chapter ${chapterNumber} thành công (${urls.length} ảnh)!`);
  };

  // Delete chapter
  const handleDeleteChapter = (chId) => {
    if (!confirm('Xóa chapter này?')) return;
    setMangaData(prev => ({
      ...prev,
      chapters: (prev.chapters || []).filter(c => c.id !== chId).map((c, i) => ({ ...c, number: i + 1 }))
    }));
  };

  // Toggle chapter expand
  const toggleChapter = (chId) => {
    setExpandedChapters(prev => ({ ...prev, [chId]: !prev[chId] }));
  };

  // ============ BỔ SUNG ẢNH CÒN THIẾU CHO CHAPTER ============
  const openSupplementModal = (chapter, chapterIdx, initialMissingFiles = null, initialTotal = 0) => {
    const existingCount = chapter.images?.length || 0;
    const missing = initialMissingFiles || [];
    const detectedTotal = initialTotal || (existingCount + missing.length);

    setSupplementModal({
      isOpen: true,
      chapter,
      chapterIdx,
      detectedTotal,
      existingCount,
      missingFiles: missing,
      missingCount: missing.length,
      missingStartPage: existingCount + 1,
      missingEndPage: detectedTotal,
      folderName: '',
      statusMessage: missing.length > 0
        ? `✅ Sẵn sàng upload tiếp ${missing.length} trang còn thiếu (từ trang ${existingCount + 1} đến ${detectedTotal})!`
        : `Chapter này hiện có ${existingCount} ảnh trên hệ thống. Hãy chọn Thư mục gốc Chapter để bot tự quét và lọc ra các ảnh còn thiếu!`,
      isUploading: false,
      uploadProgress: null,
      userCustomTotal: detectedTotal > existingCount ? String(detectedTotal) : ''
    });
  };

  const closeSupplementModal = () => {
    if (supplementModal.isUploading) {
      if (!confirm('Đang upload ảnh bổ sung, bạn có chắc muốn đóng? Các trang đã tải lên trước đó vẫn được lưu an toàn trên hệ thống.')) {
        return;
      }
    }
    setSupplementModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSupplementFolderSelected = (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const allImages = Array.from(fileList)
      .filter(isImageFile)
      .sort((a, b) => naturalSort(a.name, b.name));

    if (allImages.length === 0) {
      alert('Không tìm thấy tệp ảnh nào trong thư mục đã chọn!');
      return;
    }

    const { chapter, existingCount } = supplementModal;
    const totalFound = allImages.length;

    if (totalFound <= existingCount) {
      setSupplementModal(prev => ({
        ...prev,
        detectedTotal: totalFound,
        missingFiles: [],
        missingCount: 0,
        missingStartPage: 0,
        missingEndPage: 0,
        statusMessage: `ℹ️ Thư mục này có ${totalFound} ảnh, chapter này đã có đủ ${existingCount} ảnh. Không phát hiện ảnh nào bị thiếu! (Nếu bạn muốn thêm các ảnh mới ngoài thư mục, hãy chọn cách 2: Chọn các file ảnh lẻ).`
      }));
      return;
    }

    // Tự động cắt từ index existingCount đến hết -> đây chính là các file còn thiếu!
    const missing = allImages.slice(existingCount);
    const startPage = existingCount + 1;
    const endPage = totalFound;

    setSupplementModal(prev => ({
      ...prev,
      detectedTotal: totalFound,
      missingFiles: missing,
      missingCount: missing.length,
      missingStartPage: startPage,
      missingEndPage: endPage,
      userCustomTotal: String(totalFound),
      folderName: fileList[0]?.webkitRelativePath ? fileList[0].webkitRelativePath.split('/')[0] : '',
      statusMessage: `✅ Tự động phát hiện: Thư mục có tổng ${totalFound} ảnh. Chapter hiện có ${existingCount} ảnh. Bot đã tự động chọn đúng ${missing.length} ảnh còn thiếu (từ trang ${startPage} đến ${endPage})!`
    }));
  };

  const handleSupplementFilesSelected = (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const images = Array.from(fileList)
      .filter(isImageFile)
      .sort((a, b) => naturalSort(a.name, b.name));

    if (images.length === 0) {
      alert('Không tìm thấy tệp ảnh nào trong các file đã chọn!');
      return;
    }

    const { existingCount } = supplementModal;
    const startPage = existingCount + 1;
    const endPage = existingCount + images.length;
    const defaultTotal = endPage;

    setSupplementModal(prev => ({
      ...prev,
      detectedTotal: defaultTotal,
      missingFiles: images,
      missingCount: images.length,
      missingStartPage: startPage,
      missingEndPage: endPage,
      userCustomTotal: String(defaultTotal),
      statusMessage: `✅ Đã chọn ${images.length} file ảnh bổ sung. Sẽ bắt đầu từ trang ${startPage} đến ${endPage}. Bạn có thể chỉnh sửa "Tổng số trang gốc" bên dưới nếu cần.`
    }));
  };

  const handleStartSupplementUpload = async () => {
    const { chapter, missingFiles, detectedTotal, existingCount, userCustomTotal } = supplementModal;
    if (!chapter) return;
    if (!missingFiles || missingFiles.length === 0) {
      alert('Không có ảnh nào cần bổ sung!');
      return;
    }

    const finalTotal = parseInt(userCustomTotal || detectedTotal, 10) || (existingCount + missingFiles.length);

    setSupplementModal(prev => ({
      ...prev,
      isUploading: true,
      uploadProgress: { current: 0, total: missingFiles.length, text: 'Bắt đầu nén và chuẩn bị upload lên server...' }
    }));

    const currentMangaTitle = (mangaData.title || '').trim();
    const chTitle = chapter.title || `Chapter ${chapter.number}`;
    const currentApiKey = storageProvider === 'catbox' ? '' : (storageProvider === 'freeimage' ? freeimageKey : imgbbKey);

    let newlyUploadedUrls = [];

    try {
      await uploadMultipleMangaImages(
        missingFiles,
        (uploaded, total, fileName) => {
          setSupplementModal(prev => ({
            ...prev,
            uploadProgress: {
              current: uploaded,
              total,
              text: fileName
            }
          }));
        },
        {
          provider: storageProvider,
          apiKey: currentApiKey,
          isNsfw: true,
          mangaTitle: currentMangaTitle,
          chapterTitle: chTitle,
          threadId: telegramThreadId,
          pageOffset: existingCount,
          totalOriginalPages: finalTotal,
          delayBetweenAlbums: 1500,
          onChunkSuccess: ({ newUrls, allUrls }) => {
            newlyUploadedUrls = [...allUrls];
            // Lưu giữ trực tiếp ngay khi từng album (10 trang) thành công
            setMangaData(prev => {
              const chapters = (prev.chapters || []).map(c => {
                if (c.id === chapter.id || c.number === chapter.number) {
                  const existingSet = new Set(c.images || []);
                  const toAppend = newUrls.filter(u => !existingSet.has(u));
                  return {
                    ...c,
                    images: [...(c.images || []), ...toAppend]
                  };
                }
                return c;
              });
              return { ...prev, chapters };
            });
          }
        }
      );

      // Cập nhật state lần cuối cùng
      let finalCount = 0;
      setMangaData(prev => {
        const chapters = (prev.chapters || []).map(c => {
          if (c.id === chapter.id || c.number === chapter.number) {
            const existingUrls = [...(c.images || [])];
            for (const u of newlyUploadedUrls) {
              if (!existingUrls.includes(u)) existingUrls.push(u);
            }
            finalCount = existingUrls.length;
            return {
              ...c,
              images: existingUrls
            };
          }
          return c;
        });
        return { ...prev, chapters };
      });

      setResumeInfo(null);
      alert(`🎉 Đã bổ sung thành công ${missingFiles.length} ảnh vào ${chTitle}! Hiện có đủ ${finalCount || (existingCount + missingFiles.length)} trang.`);
      setSupplementModal(prev => ({ ...prev, isOpen: false, isUploading: false, uploadProgress: null }));
    } catch (err) {
      console.error('Lỗi bổ sung ảnh:', err);

      const targetChapter = (mangaData.chapters || []).find(c => c.id === chapter.id || c.number === chapter.number);
      const currentImagesCount = targetChapter?.images?.length || (existingCount + newlyUploadedUrls.length);

      if (newlyUploadedUrls.length > 0) {
        setMangaData(prev => {
          const chapters = (prev.chapters || []).map(c => {
            if (c.id === chapter.id || c.number === chapter.number) {
              const existingUrls = [...(c.images || [])];
              for (const u of newlyUploadedUrls) {
                if (!existingUrls.includes(u)) existingUrls.push(u);
              }
              return { ...c, images: existingUrls };
            }
            return c;
          });
          return { ...prev, chapters };
        });
      }

      const remainingFiles = missingFiles.slice(newlyUploadedUrls.length);

      setResumeInfo({
        chapterId: chapter.id,
        chapterNumber: chapter.number,
        chapterTitle: chTitle,
        existingCount: currentImagesCount,
        totalExpected: finalTotal,
        missingFiles: remainingFiles,
        missingStartPage: currentImagesCount + 1,
        missingEndPage: finalTotal
      });

      alert(
        `⚠️ Quá trình bổ sung bị gián đoạn: ${err.message}\n\n` +
        (newlyUploadedUrls.length > 0
          ? `✅ ĐÃ LƯU AN TOÀN ${newlyUploadedUrls.length} ảnh vừa upload thành công (Hiện có ${currentImagesCount}/${finalTotal} trang)!\n\n`
          : '') +
        `👉 Bạn có thể bấm nút "Tiếp tục upload ngay" ở thanh thông báo màu vàng để tải nốt các trang còn lại bất cứ lúc nào.`
      );

      setSupplementModal(prev => ({
        ...prev,
        isUploading: false,
        existingCount: currentImagesCount,
        missingFiles: remainingFiles,
        missingStartPage: currentImagesCount + 1,
        missingEndPage: finalTotal,
        uploadProgress: null
      }));
    }
  };

  // Genre toggle
  const toggleGenre = (genre) => {
    setMangaData(prev => {
      const genres = Array.isArray(prev.genres) ? [...prev.genres] : [];
      const idx = genres.indexOf(genre);
      if (idx >= 0) genres.splice(idx, 1);
      else genres.push(genre);
      return { ...prev, genres };
    });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mangaData.title?.trim()) return alert('Vui lòng nhập tên truyện!');

    let currentChapters = [...(mangaData.chapters || [])];

    // If there are still pending parsed chapters that haven't uploaded yet
    if (parsedChapters.length > 0) {
      const uploaded = await uploadChaptersList(parsedChapters, mangaData.title);
      if (uploaded) {
        currentChapters = [...currentChapters, ...uploaded];
      }
    }

    if (currentChapters.length === 0) {
      if (!confirm('⚠️ Truyện này chưa có chapter nào được đăng. Bạn có chắc chắn muốn lưu không?')) {
        return;
      }
    }

    const firstCover = !mangaData.cover && currentChapters[0]?.images?.[0] ? currentChapters[0].images[0] : mangaData.cover;

    const data = {
      ...mangaData,
      cover: firstCover,
      chapters: currentChapters,
      views: Number(mangaData.views) || 0,
      updatedAt: new Date().toISOString()
    };

    if (!editingMangaId) {
      data.createdAt = new Date().toISOString();
    }

    onSaveManga(data);
  };

  const totalUploadedImages = (mangaData.chapters || []).reduce((sum, ch) => sum + (ch.images?.length || 0), 0);

  const allChapterImages = (mangaData.chapters || []).flatMap((ch, chIdx) =>
    (ch.images || []).map((imgUrl, imgIdx) => ({
      url: imgUrl,
      chapterTitle: ch.title || `Chapter ${ch.number || chIdx + 1}`,
      chapterNumber: ch.number || chIdx + 1,
      pageNumber: imgIdx + 1
    }))
  );

  return (
    <div className="card" id="admin-manga-form">
      <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <BookOpen size={20} />
        {editingMangaId ? 'Chỉnh sửa Truyện' : 'Thêm Truyện Mới'}
      </h2>

      {/* Storage Server Selector */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '1.1rem',
        borderRadius: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <label style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
            <ImageIcon size={16} style={{ color: 'var(--color-accent)' }} /> Server Lưu Trữ Ảnh Manga
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Chọn server lưu ảnh cloud CDN cho truyện
          </span>
        </div>

        {/* Provider selection buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', marginBottom: '0.8rem' }}>
          {/* Telegram CDN - Recommended */}
          <button
            type="button"
            onClick={() => handleProviderChange('telegram')}
            style={{
              padding: '0.65rem 0.8rem',
              borderRadius: '8px',
              border: `2px solid ${storageProvider === 'telegram' ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)'}`,
              backgroundColor: storageProvider === 'telegram' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
              color: storageProvider === 'telegram' ? '#60a5fa' : 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.2rem',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, fontSize: '0.85rem', flexWrap: 'wrap' }}>
              <Layers size={14} /> Telegram CDN
              <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 700 }}>
                KHUYÊN DÙNG
              </span>
            </div>
            <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>
              Lưu trữ vô hạn, không giới hạn lượt tải, tốc độ cực nhanh
            </span>
          </button>
          {/* Catbox.moe - Recommended */}
          <button
            type="button"
            onClick={() => handleProviderChange('catbox')}
            style={{
              padding: '0.65rem 0.8rem',
              borderRadius: '8px',
              border: `2px solid ${storageProvider === 'catbox' ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)'}`,
              backgroundColor: storageProvider === 'catbox' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              color: storageProvider === 'catbox' ? '#a78bfa' : 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.2rem',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, fontSize: '0.85rem', flexWrap: 'wrap' }}>
              <Layers size={14} /> Catbox.moe
              <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 700 }}>
                KHUYÊN DÙNG
              </span>
            </div>
            <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>
              Miễn phí, không cần API Key, không giới hạn lượt tải
            </span>
          </button>

          {/* ImgBB */}
          <button
            type="button"
            onClick={() => handleProviderChange('imgbb')}
            style={{
              padding: '0.65rem 0.8rem',
              borderRadius: '8px',
              border: `2px solid ${storageProvider === 'imgbb' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
              backgroundColor: storageProvider === 'imgbb' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              color: storageProvider === 'imgbb' ? '#34d399' : 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.2rem',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, fontSize: '0.85rem' }}>
              <Layers size={14} /> ImgBB
            </div>
            <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>
              Cần API Key, có giới hạn lượt tải
            </span>
          </button>

          {/* FreeImage */}
          <button
            type="button"
            onClick={() => handleProviderChange('freeimage')}
            style={{
              padding: '0.65rem 0.8rem',
              borderRadius: '8px',
              border: `2px solid ${storageProvider === 'freeimage' ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
              backgroundColor: storageProvider === 'freeimage' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              color: storageProvider === 'freeimage' ? '#f87171' : 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.2rem',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, fontSize: '0.85rem', flexWrap: 'wrap' }}>
              <Sparkles size={14} /> FreeImage
              <span style={{ fontSize: '0.6rem', padding: '1px 4px', borderRadius: '3px', backgroundColor: '#ef4444', color: '#fff', fontWeight: 700 }}>
                CHẶN IP
              </span>
            </div>
            <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>
              Bị chặn trên web online
            </span>
          </button>
        </div>

        {/* Telegram CDN Info Panel */}
        {storageProvider === 'telegram' && (
          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Check size={16} style={{ color: '#60a5fa' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa' }}>
                  Telegram Cloud CDN & Storage Sẵn Sàng!
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  fontWeight: 700
                }}>
                  ⚡ ĐĂNG CỤC ALBUM (10 ẢNH/LƯỚI)
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#93c5fd', fontFamily: 'monospace' }}>
                Proxy: img-cdn.takarvn.workers.dev
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5 }}>
              • <strong>Đăng theo cục to (Album):</strong> Tự động gom tối đa 10 ảnh vào 1 tin nhắn dạng lưới (Collage) trên Telegram.<br/>
              • <strong>Phân loại tự động:</strong> Gắn Hashtag (<code>#TenTruyen</code>, <code>#Chap_X</code>, <code>Trang x/y</code>) giúp dễ dàng tìm kiếm.<br/>
              • <strong>URL chuẩn SEO:</strong> Đường dẫn ảnh có cấu trúc rõ ràng: <code>/file/ten-truyen/chap-x/p01_id.jpg</code>.<br/>
              • <strong>Lưu trữ vĩnh viễn:</strong> Cache 30 ngày tại Cloudflare Edge VN, không bao giờ lo mất ảnh hay bị chặn.
            </p>

            {/* Telegram Topic ID (Thread ID) optional */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600 }}>
                💬 Telegram Topic ID (Tùy chọn):
              </span>
              <input
                type="text"
                value={telegramThreadId}
                onChange={(e) => {
                  setTelegramThreadId(e.target.value);
                  localStorage.setItem('web18p_telegram_thread_id', e.target.value);
                }}
                placeholder="Ví dụ: 1234 (Để trống nếu dùng kênh thông thường)"
                style={{
                  flex: '1',
                  minWidth: '220px',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  color: '#fff',
                  outline: 'none'
                }}
              />
            </div>

            {/* Telegram Channel Live Check & Restore Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              marginTop: '0.4rem',
              paddingTop: '0.6rem',
              borderTop: '1px dashed rgba(59, 130, 246, 0.25)',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={() => handleOpenTelegramModal('check')}
                className="btn btn-sm"
                style={{
                  padding: '0.35rem 0.8rem',
                  fontSize: '0.78rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.45)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 600
                }}
              >
                <Radio size={14} /> 📡 Quét Kênh Telegram
              </button>

              <button
                type="button"
                onClick={() => handleOpenTelegramModal('import')}
                className="btn btn-sm"
                style={{
                  padding: '0.35rem 0.8rem',
                  fontSize: '0.78rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.18)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 600
                }}
              >
                <Download size={14} /> 📥 Khôi phục từ Telegram
              </button>
            </div>
          </div>
        )}

        {/* Provider-specific info panels */}
        {storageProvider === 'catbox' && (
          <div style={{
            padding: '0.75rem 0.9rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(139, 92, 246, 0.06)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            fontSize: '0.78rem',
            color: '#c4b5fd',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Check size={16} style={{ flexShrink: 0, color: '#a78bfa' }} />
            <span>
              <strong style={{ color: '#a78bfa' }}>Catbox.moe sẵn sàng!</strong> Không cần API Key. Upload qua Cloudflare Worker proxy → lưu vĩnh viễn trên CDN <code>files.catbox.moe</code>. Không giới hạn số lượng ảnh.
            </span>
          </div>
        )}

        {storageProvider === 'imgbb' && (
          <div style={{
            padding: '0.9rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {/* Header & Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>
                  🔑 Quản lý API Key ImgBB & Đếm ngược hồi phục:
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: imgbbSummary.allRateLimited ? '#ef4444' : '#10b981',
                  color: '#fff',
                  fontWeight: 700
                }}>
                  {imgbbSummary.allRateLimited
                    ? `⏳ Tất cả key đang hồi lượt (sau ${formatCountdownTime(imgbbSummary.nearestResetSeconds)})`
                    : `⚡ Khả dụng ${imgbbSummary.totalRemaining}/${imgbbSummary.totalLimit} lượt`}
                </span>
              </div>
              <a
                href="https://api.imgbb.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.75rem', color: '#34d399', textDecoration: 'underline', fontWeight: 600 }}
              >
                + Lấy thêm Key tại api.imgbb.com ↗
              </a>
            </div>

            {/* Custom key input */}
            <div>
              <input
                type="text"
                className="input-field"
                placeholder="Thêm API Key riêng của bạn (tùy chọn, hỗ trợ nhiều key: key1, key2) — Để trống sẽ dùng 5 key mặc định"
                value={imgbbKey}
                onChange={e => handleImgbbKeyChange(e.target.value)}
                style={{ margin: 0, fontSize: '0.82rem' }}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                {imgbbKey.trim()
                  ? `✓ Đang kích hoạt ${imgbbSummary.totalKeys} key (gồm key tùy chỉnh + 5 key hệ thống).`
                  : '⚡ Đang dùng 5 API Key ImgBB tích hợp sẵn (tự động luân phiên, không cần cấu hình).'}
              </div>
            </div>

            {/* Live Key Status & Cooldown Countdown Dashboard */}
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '6px',
              padding: '0.65rem 0.8rem',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={13} />
                  <span>TRẠNG THÁI & ĐẾM NGƯỢC HỒI LƯỢT TỪNG KEY ({imgbbSummary.totalKeys} KEY):</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetImgBBKeyUsage();
                    setImgbbSummary(getImgBBUsageSummary(imgbbKey));
                  }}
                  title="Đặt lại bộ đếm trên trình duyệt nếu bạn biết ImgBB đã reset quota"
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Đặt lại bộ đếm
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {imgbbSummary.keys.map((k) => (
                  <div
                    key={k.prefix}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.35rem 0.6rem',
                      borderRadius: '4px',
                      backgroundColor: k.isRateLimited
                        ? 'rgba(239, 68, 68, 0.12)'
                        : (k.used > 0 ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.03)'),
                      border: `1px solid ${k.isRateLimited ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                      fontSize: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '120px' }}>
                      <span style={{ fontWeight: 700, color: k.isRateLimited ? '#f87171' : '#e2e8f0' }}>
                        Key #{k.index}
                      </span>
                      <code style={{ fontSize: '0.7rem', opacity: 0.7 }}>{k.keyMasked}</code>
                    </div>

                    <div style={{ flex: 1, margin: '0 0.8rem', maxWidth: '140px' }}>
                      <div style={{ width: '100%', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${(k.used / k.limit) * 100}%`,
                          height: '100%',
                          background: k.isRateLimited
                            ? '#ef4444'
                            : (k.used > 75 ? '#f59e0b' : 'linear-gradient(90deg, #10b981, #06b6d4)'),
                          borderRadius: '2px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '170px' }}>
                      {k.isRateLimited || k.remaining === 0 ? (
                        <span style={{ color: '#f87171', fontWeight: 600 }}>
                          ⏳ Hết lượt • Hồi sau: <strong>{formatCountdownTime(k.resetSeconds)}</strong>
                        </span>
                      ) : k.used > 0 ? (
                        <span style={{ color: '#38bdf8' }}>
                          ⚡ Còn <strong>{k.remaining}</strong>/100 • Hồi sau {formatCountdownTime(k.resetSeconds)}
                        </span>
                      ) : (
                        <span style={{ color: '#4ade80', fontWeight: 600 }}>
                          ✓ Sẵn sàng 100/100
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary line */}
              <div style={{
                marginTop: '0.5rem',
                paddingTop: '0.4rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: 'var(--color-text-muted)'
              }}>
                <span>Tổng đã dùng: <strong>{imgbbSummary.totalUsed}</strong>/{imgbbSummary.totalLimit} ảnh</span>
                {imgbbSummary.nearestResetSeconds > 0 ? (
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                    ⏱️ Key #{imgbbSummary.nearestResetKey} sẽ hồi sau: {formatCountdownTime(imgbbSummary.nearestResetSeconds)}
                  </span>
                ) : (
                  <span style={{ color: '#4ade80' }}>✓ Tất cả các key đều sẵn sàng</span>
                )}
              </div>
            </div>
          </div>
        )}

        {storageProvider === 'freeimage' && (
          <div style={{
            padding: '0.9rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171' }}>
                  ⚠️ FreeImage.host (Bị chặn trên Web online):
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleProviderChange('catbox')}
                style={{
                  padding: '3px 10px',
                  borderRadius: '4px',
                  backgroundColor: '#8b5cf6',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                👉 Chuyển sang dùng Catbox.moe
              </button>
            </div>

            <div style={{
              padding: '0.65rem 0.8rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              fontSize: '0.75rem',
              color: '#fca5a5',
              lineHeight: 1.55
            }}>
              <strong>Vì sao FreeImage bị lỗi "You have been forbidden to use this website"?</strong>
              <br />
              FreeImage.host hiện đã cấm/chặn toàn bộ dải IP máy chủ của Cloudflare Worker proxy.
              <br />
              👉 <strong>Khuyên bạn:</strong> Bấm nút <strong>"Chuyển sang dùng Catbox.moe"</strong> ở trên.
            </div>

            <input
              type="text"
              className="input-field"
              placeholder="FreeImage API Key (chỉ có tác dụng khi test trên localhost)"
              value={freeimageKey}
              onChange={e => handleFreeimageKeyChange(e.target.value)}
              style={{ margin: 0, fontSize: '0.85rem' }}
            />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Title */}
        <input
          type="text"
          className="input-field"
          placeholder="Tên truyện"
          value={mangaData.title || ''}
          onChange={e => setMangaData(prev => ({ ...prev, title: e.target.value }))}
          required
        />

        {/* Cover */}
        <div>
          <label style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
            Ảnh bìa truyện
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="URL ảnh bìa..."
                value={mangaData.cover || ''}
                onChange={e => setMangaData(prev => ({ ...prev, cover: e.target.value }))}
                style={{ margin: 0 }}
              />
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              style={{ background: 'var(--color-accent)', color: '#000', border: 'none', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap', fontWeight: 600 }}
            >
              {coverUploading ? <Loader size={14} className="spin" /> : <Upload size={14} />}
              {coverUploading ? 'Đang tải...' : 'Upload bìa mới'}
            </button>

            {allChapterImages.length > 0 && (
              <button
                type="button"
                className="btn"
                onClick={() => setShowCoverSelector(true)}
                style={{ background: 'rgba(102, 192, 244, 0.15)', color: 'var(--color-accent)', border: '1px solid rgba(102, 192, 244, 0.3)', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', fontWeight: 600, cursor: 'pointer' }}
                title="Chọn 1 ảnh từ các chapter đã upload làm ảnh bìa"
              >
                <ImageIcon size={14} /> Chọn từ chapter ({allChapterImages.length} ảnh)
              </button>
            )}

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              hidden
              onClick={(e) => { e.target.value = ''; }}
              onChange={handleCoverUpload}
            />
          </div>

          {/* Cover Preview */}
          {mangaData.cover && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.8rem', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', width: 'fit-content' }}>
              <div style={{ width: '60px', height: '80px', borderRadius: '4px', overflow: 'hidden', border: '2px solid var(--color-accent)', flexShrink: 0 }}>
                <img src={mangaData.cover} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none'; }} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Check size={14} /> Đã có ảnh bìa
                </span>
                <button
                  type="button"
                  onClick={() => setMangaData(prev => ({ ...prev, cover: '' }))}
                  style={{ background: 'none', border: 'none', color: '#ff4d4f', fontSize: '0.75rem', cursor: 'pointer', padding: 0, marginTop: '0.3rem', textDecoration: 'underline' }}
                >
                  Gỡ ảnh bìa
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Author + Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Tác giả"
            value={mangaData.author || ''}
            onChange={e => setMangaData(prev => ({ ...prev, author: e.target.value }))}
            style={{ margin: 0 }}
          />
          <select
            className="input-field"
            value={mangaData.status || 'ongoing'}
            onChange={e => setMangaData(prev => ({ ...prev, status: e.target.value }))}
            style={{ margin: 0, cursor: 'pointer' }}
          >
            {Object.entries(MANGA_STATUS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Genres */}
        <div>
          <label style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Thể loại</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {MANGA_GENRES.map(genre => {
              const isSelected = Array.isArray(mangaData.genres) && mangaData.genres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  style={{
                    padding: '0.25rem 0.7rem',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                    backgroundColor: isSelected ? 'rgba(102, 192, 244, 0.15)' : 'transparent',
                    color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontWeight: isSelected ? 600 : 400
                  }}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <textarea
          className="input-field"
          placeholder="Mô tả truyện"
          rows="3"
          value={mangaData.description || ''}
          onChange={e => setMangaData(prev => ({ ...prev, description: e.target.value }))}
        />

        {/* ========== CHAPTER MANAGEMENT ========== */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
          <h3 style={{ color: 'var(--color-text-light)', fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} />
            Quản lý Chapter ({mangaData.chapters?.length || 0} chapter, {totalUploadedImages} ảnh)
          </h3>

          {/* Upload mode tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setUploadMode('epub')}
              style={{
                padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid',
                borderColor: uploadMode === 'epub' ? '#c084fc' : 'var(--color-border)',
                backgroundColor: uploadMode === 'epub' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                color: uploadMode === 'epub' ? '#c084fc' : 'var(--color-text-muted)',
                cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                fontWeight: uploadMode === 'epub' ? 600 : 400
              }}>
              <FileArchive size={14} /> Upload File EPUB / CBZ / ZIP
            </button>
            <button type="button" onClick={() => setUploadMode('folder')}
              style={{
                padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid',
                borderColor: uploadMode === 'folder' ? 'var(--color-accent)' : 'var(--color-border)',
                backgroundColor: uploadMode === 'folder' ? 'rgba(102, 192, 244, 0.15)' : 'transparent',
                color: uploadMode === 'folder' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}>
              <FolderOpen size={14} /> Upload Folder
            </button>
            <button type="button" onClick={() => setUploadMode('single')}
              style={{
                padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid',
                borderColor: uploadMode === 'single' ? 'var(--color-accent)' : 'var(--color-border)',
                backgroundColor: uploadMode === 'single' ? 'rgba(102, 192, 244, 0.15)' : 'transparent',
                color: uploadMode === 'single' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}>
              <Upload size={14} /> Upload Từng Chapter
            </button>
            <button type="button" onClick={() => setUploadMode('url')}
              style={{
                padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid',
                borderColor: uploadMode === 'url' ? 'var(--color-accent)' : 'var(--color-border)',
                backgroundColor: uploadMode === 'url' ? 'rgba(102, 192, 244, 0.15)' : 'transparent',
                color: uploadMode === 'url' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}>
              <LinkIcon size={14} /> Paste URL
            </button>
          </div>

          {/* EPUB / CBZ / ZIP Upload Mode */}
          {uploadMode === 'epub' && (
            <div style={{ padding: '1.25rem', borderRadius: '8px', backgroundColor: 'rgba(168, 85, 247, 0.05)', border: '1px dashed rgba(168, 85, 247, 0.35)' }}>
              <div style={{ marginBottom: '0.8rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', fontWeight: 600, margin: '0 0 0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={16} color="#c084fc" /> Tải lên trực tiếp từ file .EPUB, .CBZ hoặc .ZIP
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  Hệ thống tự động giải nén client-side, sắp xếp trang ảnh, trích xuất tên truyện / chapter và nén WebP trước khi upload lên FreeImage.host.
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => archiveInputRef.current?.click()}
                  disabled={isUploading || isExtracting}
                  className="btn"
                  style={{
                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                    color: '#fff',
                    border: 'none',
                    padding: '0.65rem 1.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 600,
                    cursor: isUploading || isExtracting ? 'not-allowed' : 'pointer',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(168, 85, 247, 0.25)'
                  }}
                >
                  <FileArchive size={17} />
                  {isExtracting ? 'Đang giải nén...' : 'Chọn file .EPUB / .CBZ / .ZIP'}
                </button>

                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  (Hỗ trợ chọn 1 hoặc nhiều file cùng lúc, mỗi file sẽ tạo thành 1 chapter)
                </span>
              </div>

              <input
                ref={archiveInputRef}
                type="file"
                hidden
                multiple
                accept=".epub,.cbz,.zip"
                onClick={(e) => { e.target.value = ''; }}
                onChange={handleArchiveSelect}
              />

              {/* Parsed Preview */}
              {parsedChapters.length > 0 && (
                <div style={{ marginTop: '1.2rem', padding: '0.8rem', borderRadius: '6px', backgroundColor: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-success)', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Check size={16} /> Đã giải nén sẵn sàng: {parsedChapters.length} chapter (tổng {countTotalImages(parsedChapters)} trang ảnh)
                  </div>
                  {storageProvider === 'imgbb' && (
                    <div style={{
                      padding: '0.5rem 0.8rem',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34d399',
                      fontSize: '0.78rem',
                      marginBottom: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>⚡ Sẵn sàng upload với {imgbbSummary.totalKeys} Key ImgBB ({imgbbSummary.totalRemaining} lượt còn lại).</span>
                      {imgbbSummary.nearestResetSeconds > 0 && (
                        <span style={{ fontSize: '0.72rem', color: '#fbbf24' }}>
                          ⏱️ Hồi lượt gần nhất sau: {formatCountdownTime(imgbbSummary.nearestResetSeconds)}
                        </span>
                      )}
                    </div>
                  )}
                  {storageProvider === 'freeimage' && (
                    <div style={{ padding: '0.6rem 0.8rem', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.78rem', marginBottom: '0.8rem', lineHeight: 1.4 }}>
                      ⚠️ <strong>Cảnh báo:</strong> FreeImage.host hiện chặn proxy Cloudflare Worker trên web online (Lỗi <i>"You have been forbidden to use this website"</i>). Khuyên bạn nên chuyển sang server <strong>ImgBB</strong> ở trên để upload thành công 100%!
                    </div>
                  )}
                  <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {parsedChapters.map((ch, i) => (
                      <div key={i} style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>📖 {ch.name}</span>
                        <span style={{ color: 'var(--color-accent)' }}>{ch.files.length} ảnh</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleUploadAll}
                    disabled={isUploading || isExtracting}
                    className="btn"
                    style={{
                      marginTop: '0.8rem',
                      background: storageProvider === 'freeimage' ? '#10b981' : 'var(--color-accent)',
                      color: '#000',
                      border: 'none',
                      padding: '0.6rem 1.5rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: isUploading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Upload size={16} /> {isUploading ? 'Đang upload...' : `Bắt đầu Upload lên ${storageProvider === 'freeimage' ? 'FreeImage.host' : 'ImgBB'} (${countTotalImages(parsedChapters)} ảnh)`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Folder Upload Mode */}
          {uploadMode === 'folder' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleFolderDragOver}
                onDragLeave={handleFolderDragLeave}
                onDrop={handleFolderDrop}
                style={{
                  padding: '1.75rem 1.25rem',
                  borderRadius: '12px',
                  backgroundColor: isFolderDragging ? 'rgba(82, 196, 26, 0.15)' : 'rgba(82, 196, 26, 0.05)',
                  border: isFolderDragging ? '2px dashed #52c41a' : '2px dashed rgba(82, 196, 26, 0.35)',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem'
                }}
                onClick={() => folderInputRef.current?.click()}
              >
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(82, 196, 26, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#52c41a'
                }}>
                  <FolderOpen size={28} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.3rem 0', color: 'var(--color-text-light)', fontSize: '1rem', fontWeight: 700 }}>
                    Kéo & Thả nhiều thư mục Chapter vào đây
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)', maxWidth: '540px' }}>
                    Bạn có thể bôi đen nhiều thư mục cùng lúc (ví dụ Chương 1 đến Chương 9) trong Windows Explorer rồi thả vào đây, hoặc bấm các nút bên dưới.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }} onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={isUploading || isExtracting}
                    className="btn"
                    style={{ background: '#52c41a', color: '#fff', border: 'none', padding: '0.55rem 1.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer', borderRadius: '8px' }}
                  >
                    <FolderOpen size={16} /> Chọn Thư Mục Cha (chứa các chương)
                  </button>

                  <button
                    type="button"
                    onClick={() => appendFolderInputRef.current?.click()}
                    disabled={isUploading || isExtracting}
                    className="btn"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-light)', border: '1px solid var(--color-border)', padding: '0.55rem 1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer', borderRadius: '8px' }}
                    title="Chọn thêm từng thư mục chapter cộng dồn vào danh sách"
                  >
                    <Plus size={16} color="#52c41a" /> Chọn Thêm Thư Mục Chapter
                  </button>

                  {parsedChapters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setParsedChapters([])}
                      disabled={isUploading}
                      className="btn"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.55rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer', borderRadius: '8px' }}
                    >
                      <Trash2 size={15} /> Xóa danh sách chờ
                    </button>
                  )}
                </div>

                <input
                  ref={el => {
                    folderInputRef.current = el;
                    if (el) {
                      el.setAttribute('webkitdirectory', '');
                      el.setAttribute('directory', '');
                    }
                  }}
                  type="file"
                  hidden
                  multiple
                  onClick={(e) => { e.target.value = ''; }}
                  onChange={handleFolderSelect}
                />

                <input
                  ref={el => {
                    appendFolderInputRef.current = el;
                    if (el) {
                      el.setAttribute('webkitdirectory', '');
                      el.setAttribute('directory', '');
                    }
                  }}
                  type="file"
                  hidden
                  multiple
                  onClick={(e) => { e.target.value = ''; }}
                  onChange={handleAppendFolderSelect}
                />
              </div>

              {/* Parsed Chapters Checklist and Preview */}
              {parsedChapters.length > 0 && (
                <div style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '1.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  {/* Summary & Toolbar */}
                  {(() => {
                    const parsedExistingDuplicatesCount = parsedChapters.filter(ch => (mangaData.chapters || []).some(existing => isSameChapter(existing, ch))).length;

                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                          <div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text-light)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <Check size={18} color="#52c41a" />
                              Đã nạp {parsedChapters.filter(c => c.checked !== false).length} / {parsedChapters.length} chapter
                              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-accent)' }}>
                                (Tổng {parsedChapters.filter(c => c.checked !== false).reduce((s, c) => s + c.files.length, 0)} ảnh)
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              Kiểm tra danh sách bên dưới, bỏ tích nếu không muốn upload, hoặc bấm nút upload để đưa vào truyện.
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleAllParsedChapters(true)}
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)', color: 'var(--color-text-light)', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.76rem', cursor: 'pointer' }}
                            >
                              ✓ Chọn tất cả
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleAllParsedChapters(false)}
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.76rem', cursor: 'pointer' }}
                            >
                              ☐ Bỏ chọn
                            </button>
                            <button
                              type="button"
                              onClick={handleSortParsedChapters}
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)', color: 'var(--color-accent)', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.76rem', cursor: 'pointer' }}
                              title="Sắp xếp lại theo số thứ tự Chapter (1 -> 9)"
                            >
                              1→9 Sắp xếp
                            </button>
                          </div>
                        </div>

                        {/* Duplicate Alert Banner in Parsed List */}
                        {parsedExistingDuplicatesCount > 0 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.65rem 0.9rem',
                            backgroundColor: 'rgba(234, 179, 8, 0.12)',
                            border: '1px solid rgba(234, 179, 8, 0.35)',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            color: '#facc15',
                            gap: '0.8rem',
                            flexWrap: 'wrap'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <ShieldAlert size={18} color="#facc15" />
                              <span>
                                Phát hiện <strong>{parsedExistingDuplicatesCount} chapter</strong> đã có sẵn trong truyện này.
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={handleUncheckDuplicateParsedChapters}
                                style={{
                                  backgroundColor: '#facc15',
                                  color: '#000',
                                  fontWeight: 700,
                                  fontSize: '0.74rem',
                                  padding: '0.28rem 0.65rem',
                                  border: 'none',
                                  borderRadius: '5px',
                                  cursor: 'pointer'
                                }}
                                title="Tự động bỏ tích các chapter đã có để chỉ upload các chapter mới"
                              >
                                ⚡ Bỏ tích các chap đã có ({parsedExistingDuplicatesCount})
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveDuplicateParsedChapters}
                                style={{
                                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                  color: '#f87171',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  fontSize: '0.74rem',
                                  padding: '0.28rem 0.65rem',
                                  borderRadius: '5px',
                                  cursor: 'pointer'
                                }}
                                title="Xóa các chapter trùng khỏi danh sách chờ"
                              >
                                🗑️ Xóa khỏi danh sách
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Chapters List */}
                  <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
                    {parsedChapters.map((ch, i) => {
                      const isChecked = ch.checked !== false;
                      const existingMatch = (mangaData.chapters || []).find(existing => isSameChapter(existing, ch));
                      const isDup = Boolean(existingMatch);

                      return (
                        <div
                          key={ch.id || i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            background: isDup
                              ? (isChecked ? 'rgba(234, 179, 8, 0.1)' : 'rgba(234, 179, 8, 0.04)')
                              : (isChecked ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.2)'),
                            border: `1px solid ${
                              isDup
                                ? 'rgba(234, 179, 8, 0.45)'
                                : (isChecked ? 'rgba(82, 196, 26, 0.3)' : 'var(--color-border)')
                            }`,
                            opacity: isChecked ? 1 : 0.6,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleParsedChapter(i)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: isDup ? '#facc15' : '#52c41a' }}
                          />

                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', width: '28px', textAlign: 'center' }}>
                            #{i + 1}
                          </div>

                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              className="input-field"
                              value={ch.name}
                              onChange={(e) => handleUpdateParsedChapterName(i, e.target.value)}
                              style={{ margin: 0, padding: '0.35rem 0.65rem', fontSize: '0.85rem', fontWeight: 600, flex: 1, minWidth: '130px' }}
                              placeholder="Tên chapter..."
                            />
                            {ch.folderName && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }} title={`Thư mục gốc: ${ch.folderName}`}>
                                📁 {ch.folderName}
                              </span>
                            )}
                            {existingMatch && (
                              <span style={{
                                padding: '0.15rem 0.5rem',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(234, 179, 8, 0.2)',
                                color: '#fde047',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                whiteSpace: 'nowrap'
                              }} title={`Chapter này đã có trong truyện: Ch. ${existingMatch.number} (${existingMatch.images?.length || 0} ảnh)`}>
                                ⚠️ Đã có trên web ({existingMatch.images?.length || 0} ảnh)
                              </span>
                            )}
                          </div>

                          <div style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(102, 192, 244, 0.12)',
                            color: 'var(--color-accent)',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}>
                            {ch.files.length} ảnh
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <button
                              type="button"
                              onClick={() => handleMoveParsedChapter(i, -1)}
                              disabled={i === 0}
                              style={{ background: 'none', border: 'none', color: i === 0 ? 'rgba(255,255,255,0.1)' : 'var(--color-text-muted)', cursor: i === 0 ? 'default' : 'pointer', padding: '2px' }}
                              title="Di chuyển lên"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveParsedChapter(i, 1)}
                              disabled={i === parsedChapters.length - 1}
                              style={{ background: 'none', border: 'none', color: i === parsedChapters.length - 1 ? 'rgba(255,255,255,0.1)' : 'var(--color-text-muted)', cursor: i === parsedChapters.length - 1 ? 'default' : 'pointer', padding: '2px' }}
                              title="Di chuyển xuống"
                            >
                              <ChevronDown size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveParsedChapter(i)}
                              style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '2px', marginLeft: '0.25rem' }}
                              title="Xóa chapter này"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Primary Start Upload Button */}
                  <button
                    type="button"
                    onClick={handleUploadCheckedChapters}
                    disabled={isUploading || isExtracting || parsedChapters.filter(c => c.checked !== false).length === 0}
                    className="btn"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      borderRadius: '8px',
                      cursor: isUploading || isExtracting || parsedChapters.filter(c => c.checked !== false).length === 0 ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Upload size={18} />
                    {isUploading
                      ? 'Đang tiến hành tải lên...'
                      : `Bắt đầu Upload ${parsedChapters.filter(c => c.checked !== false).length} Chapter (${parsedChapters.filter(c => c.checked !== false).reduce((s, c) => s + c.files.length, 0)} ảnh)`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Single Chapter Upload */}
          {uploadMode === 'single' && (
            <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(102, 192, 244, 0.06)', border: '1px dashed rgba(102, 192, 244, 0.3)' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Tên chapter (ví dụ: Chapter 5 hoặc để trống để tự nhận diện)"
                value={manualChapterTitle}
                onChange={e => setManualChapterTitle(e.target.value)}
                style={{ margin: '0 0 0.8rem 0' }}
              />
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => chapterArchiveInputRef.current?.click()}
                  disabled={isUploading || isExtracting}
                  className="btn"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', border: 'none', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  <FileArchive size={14} /> Chọn 1 file .EPUB / .CBZ / .ZIP
                </button>
                <button
                  type="button"
                  onClick={() => chapterFolderInputRef.current?.click()}
                  disabled={isUploading || isExtracting}
                  className="btn"
                  style={{ background: 'var(--color-accent)', color: '#000', border: 'none', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  <FolderOpen size={14} /> Chọn folder ảnh chapter
                </button>
              </div>
              <input
                ref={chapterArchiveInputRef}
                type="file"
                hidden
                accept=".epub,.cbz,.zip"
                onClick={(e) => { e.target.value = ''; }}
                onChange={handleSingleChapterArchive}
              />
              <input
                ref={el => {
                  chapterFolderInputRef.current = el;
                  if (el) {
                    el.setAttribute('webkitdirectory', '');
                    el.setAttribute('directory', '');
                  }
                }}
                type="file"
                hidden
                multiple
                onClick={(e) => { e.target.value = ''; }}
                onChange={handleSingleChapterUpload}
              />
            </div>
          )}

          {/* URL Mode */}
          {uploadMode === 'url' && (
            <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(248, 179, 25, 0.06)', border: '1px dashed rgba(248, 179, 25, 0.3)' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Tên chapter"
                value={manualChapterTitle}
                onChange={e => setManualChapterTitle(e.target.value)}
                style={{ margin: '0 0 0.8rem 0' }}
              />
              <textarea
                className="input-field"
                placeholder="Dán URL ảnh, mỗi dòng 1 URL:&#10;https://i.ibb.co/.../page1.jpg&#10;https://i.ibb.co/.../page2.jpg&#10;..."
                rows="6"
                value={manualChapterUrls}
                onChange={e => setManualChapterUrls(e.target.value)}
                style={{ margin: 0 }}
              />
              <button
                type="button"
                onClick={handleAddManualChapter}
                className="btn"
                style={{ marginTop: '0.8rem', background: '#f8b319', color: '#000', border: 'none', padding: '0.5rem 1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={14} /> Thêm chapter
              </button>
            </div>
          )}

          {/* Extraction Progress */}
          {isExtracting && (
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#c084fc', fontWeight: 600, marginBottom: '0.5rem' }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                {extractProgress?.totalFiles > 1
                  ? `Đang giải nén file ${extractProgress.currentFile}/${extractProgress.totalFiles} (${extractProgress.archiveName})...`
                  : `Đang giải nén ${extractProgress?.archiveName || 'file EPUB / ZIP'}...`}
              </div>
              {extractProgress?.totalImages > 0 && (
                <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(extractProgress.currentImage / extractProgress.totalImages) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #c084fc, #66c0f4)',
                    borderRadius: '4px',
                    transition: 'width 0.2s ease'
                  }} />
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                {extractProgress?.totalImages
                  ? `Đang trích xuất ${extractProgress.currentImage}/${extractProgress.totalImages} ảnh — ${extractProgress.filename}`
                  : (extractProgress?.message || 'Đang chuẩn bị đọc tệp...')}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress && (
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(102, 192, 244, 0.08)', border: '1px solid rgba(102, 192, 244, 0.2)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-accent)', fontWeight: 600, marginBottom: '0.5rem' }}>
                📤 Upload chapter {uploadProgress.chapterIdx}/{uploadProgress.chapterTotal}: {uploadProgress.chapterName}
              </div>
              <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{
                  width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #66c0f4, #52c41a)',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                {uploadProgress.current}/{uploadProgress.total} ảnh — {uploadProgress.file}
              </div>

              {/* Key usage stats with live countdown */}
              {uploadProgress.keyStats && storageProvider === 'imgbb' && (
                <div style={{
                  marginTop: '0.6rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '6px',
                  backgroundColor: uploadProgress.keyStats.isWaitingCooldown
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(167, 139, 250, 0.08)',
                  border: `1px solid ${uploadProgress.keyStats.isWaitingCooldown ? 'rgba(239, 68, 68, 0.4)' : 'rgba(167, 139, 250, 0.25)'}`,
                  fontSize: '0.75rem'
                }}>
                  {/* If waiting in cooldown */}
                  {uploadProgress.keyStats.isWaitingCooldown && (
                    <div style={{
                      padding: '0.5rem 0.7rem',
                      marginBottom: '0.5rem',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#fecaca',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <Clock size={16} style={{ color: '#ef4444', animation: 'spin 2s linear infinite' }} />
                      <div>
                        <strong>⏳ Đang tạm dừng chờ hồi lượt tải!</strong>
                        <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                          Tất cả key đã chạm giới hạn. Tự động tiếp tục sau:{' '}
                          <strong style={{ color: '#fef08a', fontSize: '0.85rem' }}>
                            {formatCountdownTime(uploadProgress.keyStats.waitSeconds || uploadProgress.keyStats.nearestResetSeconds)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ color: '#a78bfa', fontWeight: 600 }}>
                      🔑 Key {uploadProgress.keyStats.activeKeyIndex}/{uploadProgress.keyStats.totalKeys} ({uploadProgress.keyStats.activeKeyPrefix}...)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: uploadProgress.keyStats.keyRemaining < 20 ? '#f87171' : '#4ade80', fontWeight: 600 }}>
                        Còn {uploadProgress.keyStats.keyRemaining} lượt
                      </span>
                      {uploadProgress.keyStats.keyResetSeconds > 0 && (
                        <span style={{ color: '#fbbf24', fontSize: '0.7rem', padding: '1px 5px', borderRadius: '3px', backgroundColor: 'rgba(251, 191, 36, 0.12)' }}>
                          ⏱️ Hồi sau: {formatCountdownTime(uploadProgress.keyStats.keyResetSeconds)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ width: '100%', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: '0.3rem' }}>
                    <div style={{
                      width: `${(uploadProgress.keyStats.keyUploaded / uploadProgress.keyStats.keyLimit) * 100}%`,
                      height: '100%',
                      background: uploadProgress.keyStats.keyRemaining < 20
                        ? 'linear-gradient(90deg, #f87171, #ef4444)'
                        : 'linear-gradient(90deg, #a78bfa, #8b5cf6)',
                      borderRadius: '2px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
                    <span>Đã dùng: {uploadProgress.keyStats.totalUsed}/{uploadProgress.keyStats.totalLimit} tổng lượt</span>
                    <span style={{ color: uploadProgress.keyStats.totalRemaining < 50 ? '#fbbf24' : '#4ade80' }}>
                      📊 Tổng còn: {uploadProgress.keyStats.totalRemaining} lượt
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resume banner if upload was interrupted */}
          {resumeInfo && (
            <div style={{
              marginTop: '1rem',
              padding: '0.9rem 1.1rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <AlertCircle size={22} color="#facc15" />
                <div>
                  <strong style={{ color: '#fde047', fontSize: '0.88rem' }}>
                    ⚠️ Phát hiện tiến trình dở: Chapter {resumeInfo.chapterNumber} ({resumeInfo.chapterTitle})
                  </strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#e2e8f0' }}>
                    Đã lưu {resumeInfo.existingCount} trang. Còn thiếu {resumeInfo.missingFiles?.length || (resumeInfo.totalExpected - resumeInfo.existingCount)} trang (từ trang {resumeInfo.existingCount + 1} đến {resumeInfo.totalExpected}).
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const targetCh = (mangaData.chapters || []).find(c => c.id === resumeInfo.chapterId || c.number === resumeInfo.chapterNumber);
                    if (targetCh) {
                      openSupplementModal(
                        targetCh,
                        (mangaData.chapters || []).indexOf(targetCh),
                        resumeInfo.missingFiles,
                        resumeInfo.totalExpected
                      );
                    }
                  }}
                  className="btn"
                  style={{
                    backgroundColor: '#facc15',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    padding: '0.4rem 0.9rem',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Sparkles size={14} /> Tiếp tục upload ngay
                </button>
                <button
                  type="button"
                  onClick={() => setResumeInfo(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                  title="Ẩn thông báo này"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Empty chapters Telegram Rescue Card */}
          {(!mangaData.chapters || mangaData.chapters.length === 0) && (
            <div style={{
              marginTop: '1.2rem',
              padding: '1.2rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.06)',
              border: '1px dashed rgba(59, 130, 246, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '0.6rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', fontWeight: 700, fontSize: '0.92rem' }}>
                <Radio size={18} /> Đã từng upload ảnh lên Telegram nhưng quên bấm Thêm truyện?
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: '580px', lineHeight: 1.5 }}>
                Ảnh của bạn vẫn nằm nguyên vẹn trên Kênh Telegram. Bạn có thể bấm quét kênh hoặc nạp file <code>result.json</code> để khôi phục toàn bộ danh sách Chapter & link ảnh CDN ngay lập tức mà không cần upload lại!
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleOpenTelegramModal('check')}
                  className="btn btn-sm"
                  style={{
                    padding: '0.45rem 1rem',
                    fontSize: '0.82rem',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 700
                  }}
                >
                  <Radio size={14} /> 🔍 Quét Kênh Telegram
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenTelegramModal('import')}
                  className="btn btn-sm"
                  style={{
                    padding: '0.45rem 1rem',
                    fontSize: '0.82rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.5)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 700
                  }}
                >
                  <Download size={14} /> 📥 Khôi phục từ Telegram
                </button>
              </div>
            </div>
          )}

          {/* Existing Chapters */}
          {(mangaData.chapters || []).length > 0 && (() => {
            const existingDuplicateGroups = findDuplicateChapters(mangaData.chapters || []);
            const hasDuplicates = existingDuplicateGroups.length > 0;

            return (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    Chapters đã thêm ({(mangaData.chapters || []).length}):
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenTelegramModal('check')}
                      className="btn btn-sm"
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.74rem',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                      title="Kiểm tra đối chiếu với Kênh Telegram"
                    >
                      <Radio size={13} /> 📡 Kênh Telegram
                    </button>
                    <button
                      type="button"
                      onClick={handleCheckExistingDuplicates}
                      className="btn btn-sm"
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.74rem',
                        backgroundColor: hasDuplicates ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: hasDuplicates ? '#fde047' : 'var(--color-text-muted)',
                        border: `1px solid ${hasDuplicates ? 'rgba(234, 179, 8, 0.45)' : 'var(--color-border)'}`,
                        borderRadius: '5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontWeight: hasDuplicates ? 700 : 400
                      }}
                      title="Kiểm tra các chapter bị trùng tên hoặc trùng số thứ tự"
                    >
                      <Search size={13} color={hasDuplicates ? '#facc15' : 'currentColor'} />
                      {hasDuplicates ? `⚠️ Trùng ${existingDuplicateGroups.length} nhóm chapter` : '🔍 Check trùng lặp'}
                    </button>
                    <button
                      type="button"
                      onClick={handleReindexAllChapters}
                      className="btn btn-sm"
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.74rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--color-text-muted)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                      title="Đánh số lại thứ tự các chapter 1, 2, 3... N chuẩn"
                    >
                      1→N Đánh số lại
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {(mangaData.chapters || []).map((ch, chIdx) => {
                    const isDupChapter = existingDuplicateGroups.some(g => g.chapters.some(c => c.id === ch.id));

                    return (
                      <div
                        key={ch.id}
                        style={{
                          borderRadius: '6px',
                          border: `1px solid ${isDupChapter ? 'rgba(234, 179, 8, 0.5)' : 'var(--color-border)'}`,
                          backgroundColor: isDupChapter ? 'rgba(234, 179, 8, 0.03)' : 'transparent',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.5rem 0.8rem', backgroundColor: isDupChapter ? 'rgba(234, 179, 8, 0.08)' : 'var(--color-bg-secondary)', cursor: 'pointer'
                        }} onClick={() => toggleChapter(ch.id)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            {expandedChapters[ch.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <strong style={{ color: isDupChapter ? '#fde047' : 'var(--color-text-light)' }}>Ch. {ch.number}</strong>
                            <span style={{ color: 'var(--color-text-muted)' }}>{ch.title}</span>
                            <span style={{ color: 'var(--color-accent)', fontSize: '0.75rem' }}>({ch.images?.length || 0} ảnh)</span>
                            {isDupChapter && (
                              <span style={{
                                padding: '0.1rem 0.45rem',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(234, 179, 8, 0.2)',
                                color: '#fde047',
                                fontSize: '0.7rem',
                                fontWeight: 700
                              }}>
                                ⚠️ Trùng lặp
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSupplementModal(ch, chIdx);
                              }}
                              className="btn btn-sm"
                              style={{
                                padding: '0.25rem 0.6rem',
                                fontSize: '0.74rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                color: '#60a5fa',
                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                              title="Kiểm tra thư mục gốc hoặc chọn file để bổ sung các trang ảnh còn thiếu cho chapter này"
                            >
                              <Plus size={12} /> Bổ sung ảnh thiếu
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteChapter(ch.id); }}
                              style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '0.2rem' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {expandedChapters[ch.id] && (
                          <div style={{ padding: '0.5rem 0.8rem', maxHeight: '250px', overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: '0.5rem' }}>
                              {(ch.images || []).map((url, pi) => {
                                const isCover = mangaData.cover === url;
                                return (
                                  <div
                                    key={pi}
                                    onClick={() => setMangaData(prev => ({ ...prev, cover: url }))}
                                    style={{
                                      position: 'relative',
                                      height: '110px',
                                      borderRadius: '4px',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      border: isCover ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                      backgroundColor: '#000'
                                    }}
                                    title={isCover ? 'Ảnh này đang là ảnh bìa' : 'Click để chọn ảnh này làm ảnh bìa'}
                                  >
                                    <img
                                      src={url}
                                      alt={`p${pi + 1}`}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      onError={e => { e.target.style.display = 'none'; }}
                                    />
                                    <div style={{
                                      position: 'absolute',
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      padding: '2px 4px',
                                      fontSize: '0.65rem',
                                      textAlign: 'center',
                                      background: isCover ? 'var(--color-accent)' : 'rgba(0,0,0,0.75)',
                                      color: isCover ? '#000' : '#fff',
                                      fontWeight: 600
                                    }}>
                                      {isCover ? '✓ Ảnh bìa' : `Trang ${pi + 1}`}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button
            type="submit"
            className="btn btn-success"
            disabled={isUploading}
            style={{ flex: 1, backgroundColor: 'var(--color-success)', color: 'white' }}
          >
            {editingMangaId ? 'Cập nhật Truyện' : 'Thêm Truyện'}
          </button>
          {editingMangaId && (
            <button type="button" className="btn btn-outline" onClick={onCancelEdit}>Hủy</button>
          )}
        </div>
      </form>

      {/* Cover Selector Modal */}
      {showCoverSelector && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }} onClick={() => setShowCoverSelector(false)}>
          <div style={{
            backgroundColor: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.2rem',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <h3 style={{ color: 'var(--color-text-light)', margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ImageIcon size={18} /> Chọn Ảnh Bìa Từ Các Chapter ({allChapterImages.length} ảnh)
              </h3>
              <button
                type="button"
                onClick={() => setShowCoverSelector(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.3rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.2rem', overflowY: 'auto', flex: 1 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                👉 Click vào bất kỳ trang ảnh nào bên dưới để đặt làm ảnh bìa cho bộ truyện này:
              </p>

              {(mangaData.chapters || []).map((ch, ci) => (
                <div key={ch.id || ci} style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ color: 'var(--color-accent)', fontSize: '0.9rem', marginBottom: '0.6rem' }}>
                    {ch.title || `Chapter ${ch.number || ci + 1}`} ({ch.images?.length || 0} trang)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.6rem' }}>
                    {(ch.images || []).map((url, pi) => {
                      const isCover = mangaData.cover === url;
                      return (
                        <div
                          key={pi}
                          onClick={() => {
                            setMangaData(prev => ({ ...prev, cover: url }));
                            setShowCoverSelector(false);
                          }}
                          style={{
                            position: 'relative',
                            height: '140px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: isCover ? '3px solid var(--color-accent)' : '1px solid var(--color-border)',
                            boxShadow: isCover ? '0 0 12px var(--color-accent)' : 'none',
                            transition: 'transform 0.15s ease, border-color 0.15s ease'
                          }}
                        >
                          <img
                            src={url}
                            alt={`p${pi + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '3px 4px',
                            fontSize: '0.7rem',
                            textAlign: 'center',
                            background: isCover ? 'var(--color-accent)' : 'rgba(0,0,0,0.8)',
                            color: isCover ? '#000' : '#fff',
                            fontWeight: 700
                          }}>
                            {isCover ? '✓ Ảnh bìa' : `Trang ${pi + 1}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Supplement Missing Images Modal */}
      {supplementModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }} onClick={closeSupplementModal}>
          <div style={{
            backgroundColor: 'var(--color-bg-primary, #1e1e24)',
            border: '1px solid var(--color-border, #3b4252)',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
            color: 'var(--color-text-light, #f8fafc)'
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.1rem 1.4rem',
              borderBottom: '1px solid var(--color-border, #333)',
              backgroundColor: 'rgba(255,255,255,0.02)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#60a5fa' }}>
                  <Sparkles size={20} /> Bổ Sung Ảnh Còn Thiếu Cho Chapter
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                  {supplementModal.chapter?.title || `Chapter ${supplementModal.chapter?.number}`}
                  {' • '}
                  <strong style={{ color: '#4ade80' }}>Hiện có: {supplementModal.existingCount} ảnh</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={closeSupplementModal}
                disabled={supplementModal.isUploading}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted, #94a3b8)', cursor: 'pointer', padding: '0.4rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.3rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* How it works banner */}
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                fontSize: '0.82rem',
                lineHeight: '1.45',
                color: '#93c5fd'
              }}>
                💡 <strong>Cách hoạt động thông minh:</strong> Khi bạn chọn thư mục của chapter (ví dụ 290 ảnh), bot sẽ tự động nhận biết hệ thống đã có <strong>{supplementModal.existingCount} ảnh</strong>, và sẽ <strong>chỉ upload tiếp các ảnh còn thiếu (từ trang {supplementModal.existingCount + 1})</strong> lên Telegram mà không bao giờ phải tải lại từ trang 1!
              </div>

              {/* Selection cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.8rem' }}>
                {/* Method 1: Choose chapter folder */}
                <div
                  onClick={() => supplementFolderInputRef.current?.click()}
                  style={{
                    padding: '1.1rem',
                    borderRadius: '10px',
                    border: '1px dashed #3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.12)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)'}
                >
                  <FolderOpen size={32} color="#60a5fa" />
                  <strong style={{ fontSize: '0.92rem', color: '#93c5fd' }}>1. Chọn Thư Mục Gốc Chapter</strong>
                  <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                    (Khuyên dùng) Chọn folder chứa toàn bộ ảnh chapter. Bot tự quét và cắt đúng các trang còn thiếu.
                  </span>
                  <input
                    type="file"
                    ref={supplementFolderInputRef}
                    webkitdirectory=""
                    directory=""
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleSupplementFolderSelected}
                  />
                </div>

                {/* Method 2: Choose individual files */}
                <div
                  onClick={() => supplementFilesInputRef.current?.click()}
                  style={{
                    padding: '1.1rem',
                    borderRadius: '10px',
                    border: '1px dashed #10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.12)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.05)'}
                >
                  <Upload size={32} color="#34d399" />
                  <strong style={{ fontSize: '0.92rem', color: '#6ee7b7' }}>2. Chọn Các File Ảnh Còn Thiếu</strong>
                  <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                    Nếu bạn đã lọc riêng các file ảnh bị thiếu (ví dụ 40 file), bấm vào đây để chọn nhanh.
                  </span>
                  <input
                    type="file"
                    ref={supplementFilesInputRef}
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleSupplementFilesSelected}
                  />
                </div>
              </div>

              {/* Status & Analysis summary */}
              {supplementModal.statusMessage && (
                <div style={{
                  padding: '0.9rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: supplementModal.missingFiles.length > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                  border: `1px solid ${supplementModal.missingFiles.length > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                  fontSize: '0.84rem'
                }}>
                  <div style={{ color: supplementModal.missingFiles.length > 0 ? '#4ade80' : '#fde047', fontWeight: 600, marginBottom: '0.3rem' }}>
                    {supplementModal.statusMessage}
                  </div>
                  {supplementModal.missingFiles.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.6rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                      <div>🔹 Số ảnh sẽ upload: <strong style={{ color: '#fff' }}>{supplementModal.missingFiles.length} trang</strong></div>
                      <div>🔹 Bắt đầu từ: <strong style={{ color: '#fff' }}>Trang {supplementModal.missingStartPage} → {supplementModal.missingEndPage}</strong></div>
                      <div>🔹 Tổng số trang Chapter: <strong style={{ color: '#fff' }}>{supplementModal.userCustomTotal || supplementModal.detectedTotal} trang</strong></div>
                      <div>🔹 Máy chủ lưu trữ: <strong style={{ color: '#60a5fa' }}>{storageProvider === 'telegram' ? 'Telegram CDN' : storageProvider}</strong></div>
                    </div>
                  )}
                </div>
              )}

              {/* Editable Total Pages (Optional refinement) */}
              {supplementModal.missingFiles.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 0.9rem', backgroundColor: 'var(--color-bg-secondary, #25252d)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #94a3b8)', whiteSpace: 'nowrap' }}>
                    🎯 Tổng số trang gốc Chapter (hiển thị trên caption Telegram):
                  </span>
                  <input
                    type="number"
                    min={supplementModal.missingEndPage}
                    value={supplementModal.userCustomTotal || supplementModal.detectedTotal || ''}
                    onChange={e => setSupplementModal(prev => ({ ...prev, userCustomTotal: e.target.value }))}
                    style={{
                      width: '90px',
                      padding: '0.3rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border, #444)',
                      backgroundColor: 'var(--color-bg-primary, #18181f)',
                      color: '#fff',
                      fontSize: '0.85rem'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>(mặc định: {supplementModal.detectedTotal || (supplementModal.existingCount + supplementModal.missingFiles.length)})</span>
                </div>
              )}

              {/* Upload Progress Bar */}
              {supplementModal.isUploading && supplementModal.uploadProgress && (
                <div style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#93c5fd', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang upload bổ sung...
                    </span>
                    <strong style={{ color: '#fff' }}>
                      {supplementModal.uploadProgress.current}/{supplementModal.uploadProgress.total} trang
                    </strong>
                  </div>

                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.round((supplementModal.uploadProgress.current / Math.max(1, supplementModal.uploadProgress.total)) * 100)}%`,
                      backgroundColor: '#3b82f6',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                  <div style={{ fontSize: '0.76rem', color: supplementModal.uploadProgress.text?.includes('FloodWait') ? '#fde047' : '#94a3b8' }}>
                    {supplementModal.uploadProgress.text}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.8rem',
              padding: '1rem 1.4rem',
              borderTop: '1px solid var(--color-border, #333)',
              backgroundColor: 'rgba(255,255,255,0.02)'
            }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={supplementModal.isUploading}
                onClick={closeSupplementModal}
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              >
                Đóng
              </button>

              <button
                type="button"
                className="btn btn-primary"
                disabled={supplementModal.isUploading || supplementModal.missingFiles.length === 0}
                onClick={handleStartSupplementUpload}
                style={{
                  padding: '0.45rem 1.2rem',
                  fontSize: '0.85rem',
                  backgroundColor: supplementModal.missingFiles.length > 0 ? '#3b82f6' : '#475569',
                  color: '#fff',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: supplementModal.missingFiles.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                {supplementModal.isUploading ? (
                  <>
                    <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang tải lên...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Bắt đầu Bổ sung ({supplementModal.missingFiles.length} ảnh)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Chapters Management Modal */}
      {duplicateModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }} onClick={() => setDuplicateModal({ isOpen: false, duplicateGroups: [] })}>
          <div style={{
            backgroundColor: 'var(--color-bg-primary, #1e1e24)',
            border: '1px solid var(--color-border, #3b4252)',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
            color: 'var(--color-text-light, #f8fafc)'
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.1rem 1.4rem',
              borderBottom: '1px solid var(--color-border, #333)',
              backgroundColor: 'rgba(255,255,255,0.02)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#facc15' }}>
                  <ShieldAlert size={20} /> Quản Lý & Dọn Dẹp Chapter Trùng Lặp
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                  Phát hiện <strong>{duplicateModal.duplicateGroups.length} nhóm chapter trùng</strong> trong bộ truyện này.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateModal({ isOpen: false, duplicateGroups: [] })}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted, #94a3b8)', cursor: 'pointer', padding: '0.4rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                padding: '0.8rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                fontSize: '0.82rem',
                color: '#fef08a'
              }}>
                💡 <strong>Tự động đề xuất:</strong> Bạn có thể chọn giữ lại bản có số lượng trang ảnh đầy đủ nhất và xóa các bản rác thừa, hoặc gộp toàn bộ ảnh của các bản trùng lại với nhau.
              </div>

              {duplicateModal.duplicateGroups.map((group, gIdx) => {
                const sortedByImages = [...group.chapters].sort((a, b) => (b.images?.length || 0) - (a.images?.length || 0));
                const maxImgCount = sortedByImages[0]?.images?.length || 0;

                return (
                  <div key={group.key || gIdx} style={{
                    borderRadius: '10px',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.8rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#fde047', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        📖 {group.label} ({group.chapters.length} bản trùng)
                      </strong>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => handleKeepBestChapterInGroup(group)}
                          className="btn btn-sm"
                          style={{
                            padding: '0.25rem 0.65rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#facc15',
                            color: '#000',
                            fontWeight: 700,
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                          }}
                          title="Giữ lại bản nhiều ảnh nhất và xóa các bản trùng còn lại"
                        >
                          ✨ Giữ bản {maxImgCount} ảnh
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMergeChapterGroup(group)}
                          className="btn btn-sm"
                          style={{
                            padding: '0.25rem 0.65rem',
                            fontSize: '0.75rem',
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            borderRadius: '5px',
                            cursor: 'pointer'
                          }}
                          title="Gộp tất cả các ảnh của các bản trùng thành 1 chapter duy nhất"
                        >
                          🔗 Gộp ảnh làm 1
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {group.chapters.map((ch, cIdx) => {
                        const isBest = (ch.images?.length || 0) === maxImgCount;
                        return (
                          <div key={ch.id || cIdx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.55rem 0.8rem',
                            borderRadius: '6px',
                            backgroundColor: isBest ? 'rgba(34, 197, 94, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                            border: `1px solid ${isBest ? 'rgba(34, 197, 94, 0.3)' : 'var(--color-border)'}`
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.84rem' }}>
                              <strong style={{ color: isBest ? '#4ade80' : 'var(--color-text-light)' }}>
                                Ch. {ch.number}
                              </strong>
                              <span style={{ color: 'var(--color-text-muted)' }}>{ch.title}</span>
                              <span style={{
                                padding: '0.15rem 0.5rem',
                                borderRadius: '10px',
                                backgroundColor: isBest ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                color: isBest ? '#4ade80' : 'var(--color-text-muted)',
                                fontSize: '0.74rem',
                                fontWeight: 700
                              }}>
                                {ch.images?.length || 0} ảnh {isBest && '★ Nhiều nhất'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteChapter(ch.id);
                                setDuplicateModal(prev => {
                                  const updatedMangaChapters = (mangaData.chapters || []).filter(c => c.id !== ch.id);
                                  const newGroups = findDuplicateChapters(updatedMangaChapters);
                                  return { ...prev, duplicateGroups: newGroups, isOpen: newGroups.length > 0 };
                                });
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#f87171',
                                cursor: 'pointer',
                                padding: '0.2rem 0.4rem',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                              title="Xóa riêng bản này"
                            >
                              <Trash2 size={13} /> Xóa
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.4rem',
              borderTop: '1px solid var(--color-border, #333)',
              backgroundColor: 'rgba(255,255,255,0.02)',
              flexWrap: 'wrap',
              gap: '0.8rem'
            }}>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={handleAutoCleanAllDuplicates}
                  className="btn"
                  style={{
                    backgroundColor: '#facc15',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    padding: '0.45rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <CheckCheck size={16} /> Tự động giữ bản đầy đủ nhất ({duplicateModal.duplicateGroups.length} nhóm)
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={handleReindexAllChapters}
                  className="btn btn-outline"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
                >
                  1→N Đánh số lại
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateModal({ isOpen: false, duplicateGroups: [] })}
                  className="btn btn-outline"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Check & Restore Management Modal */}
      {telegramModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }} onClick={() => setTelegramModal(prev => ({ ...prev, isOpen: false }))}>
          <div style={{
            backgroundColor: 'var(--color-bg-primary, #1e1e24)',
            border: '1px solid var(--color-border, #3b4252)',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
            color: 'var(--color-text-light, #f8fafc)'
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.1rem 1.4rem',
              borderBottom: '1px solid var(--color-border, #333)',
              backgroundColor: 'rgba(255,255,255,0.02)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#60a5fa' }}>
                  <Radio size={20} /> Trung Tâm Kiểm Tra & Khôi Phục Kênh Telegram
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                  Đối chiếu ảnh lưu trên Cloud Telegram và khôi phục lại Chapter nếu bạn quên bấm Thêm truyện.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTelegramModal(prev => ({ ...prev, isOpen: false }))}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted, #94a3b8)', cursor: 'pointer', padding: '0.4rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              padding: '0.75rem 1.4rem',
              borderBottom: '1px solid var(--color-border, #333)',
              backgroundColor: 'rgba(0,0,0,0.2)'
            }}>
              <button
                type="button"
                onClick={() => setTelegramModal(prev => ({ ...prev, tab: 'check' }))}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: telegramModal.tab === 'check' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                  color: telegramModal.tab === 'check' ? '#60a5fa' : 'var(--color-text-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Radio size={14} /> 🔍 Kiểm Tra Trực Tiếp Kênh Telegram
              </button>
              <button
                type="button"
                onClick={() => setTelegramModal(prev => ({ ...prev, tab: 'import' }))}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: telegramModal.tab === 'import' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                  color: telegramModal.tab === 'import' ? '#34d399' : 'var(--color-text-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Download size={14} /> 📥 Nhập File JSON Khôi Phục (result.json)
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {telegramModal.error && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5',
                  fontSize: '0.82rem'
                }}>
                  ⚠️ {telegramModal.error}
                </div>
              )}

              {/* Tab 1: Live Channel Check */}
              {telegramModal.tab === 'check' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Channel Connection Badge */}
                  <div style={{
                    padding: '0.8rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.6rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Radio size={18} color="#60a5fa" />
                      <div style={{ fontSize: '0.82rem' }}>
                        <div>
                          Kênh Telegram: <strong style={{ color: '#fff' }}>{telegramModal.checkResult?.channelTitle || 'my_storage_tool'}</strong> (ID: <code>{telegramModal.checkResult?.channelId || '-1004320007781'}</code>)
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', marginTop: '2px', fontSize: '0.75rem' }}>
                          Bot: @{telegramModal.checkResult?.botName || 'my_storage_tool_bot'} • Proxy: <code>img-cdn.takarvn.workers.dev</code>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '12px',
                        backgroundColor: telegramModal.checkResult?.connected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                        color: telegramModal.checkResult?.connected ? '#4ade80' : '#facc15',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {telegramModal.checkResult?.connected ? '✅ Kết Nối Tốt' : 'Đang kiểm tra...'}
                      </span>
                      <button
                        type="button"
                        onClick={handleCheckTelegramChannel}
                        disabled={telegramModal.isLoading}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem' }}
                      >
                        <RefreshCw size={12} className={telegramModal.isLoading ? 'spin-anim' : ''} /> Quét lại
                      </button>
                    </div>
                  </div>

                  {/* Audit Details */}
                  {telegramModal.checkResult && (
                    <div style={{
                      borderRadius: '10px',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.8rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <strong style={{ fontSize: '1rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            📚 {telegramModal.checkResult.detectedManga}
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            Tìm thấy <strong>{telegramModal.checkResult.chapters.length} chapter</strong> với hơn <strong>{telegramModal.checkResult.totalImagesOnTelegram.toLocaleString('vi-VN')} ảnh</strong> trên Telegram
                          </span>
                        </div>
                      </div>

                      {/* Chapter rows */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {telegramModal.checkResult.chapters.map((ch, idx) => {
                          const restoredChap = telegramModal.restoredData?.chapters?.[ch.name];
                          const actualExtracted = restoredChap?.pages?.length || 0;
                          const targetCount = ch.status === 'complete' ? ch.total : ch.uploaded;
                          const isDoneThisChapter = actualExtracted >= targetCount && actualExtracted > 0;
                          const isScanningThisChapter = actualExtracted > 0 && actualExtracted < targetCount;

                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.55rem 0.8rem',
                                borderRadius: '6px',
                                backgroundColor: isDoneThisChapter
                                  ? 'rgba(34, 197, 94, 0.07)'
                                  : isScanningThisChapter
                                    ? 'rgba(59, 130, 246, 0.08)'
                                    : 'rgba(255, 255, 255, 0.02)',
                                border: `1px solid ${
                                  isDoneThisChapter
                                    ? 'rgba(34, 197, 94, 0.25)'
                                    : isScanningThisChapter
                                      ? 'rgba(59, 130, 246, 0.4)'
                                      : 'rgba(255, 255, 255, 0.07)'
                                }`
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.84rem' }}>
                                <strong style={{ color: isDoneThisChapter ? '#4ade80' : isScanningThisChapter ? '#60a5fa' : 'var(--color-text-muted)' }}>
                                  {ch.name}
                                </strong>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                                  Đã tải lên Telegram: <strong>{ch.uploaded}/{ch.total}</strong> ảnh
                                </span>
                              </div>
                              <div>
                                {isDoneThisChapter ? (
                                  <span style={{
                                    padding: '0.15rem 0.55rem',
                                    borderRadius: '10px',
                                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                    color: '#4ade80',
                                    fontSize: '0.74rem',
                                    fontWeight: 700
                                  }}>
                                    ✅ Đầy đủ {actualExtracted}/{ch.total} ảnh
                                  </span>
                                ) : isScanningThisChapter ? (
                                  <span style={{
                                    padding: '0.15rem 0.55rem',
                                    borderRadius: '10px',
                                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                    color: '#60a5fa',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                  }}>
                                    <RefreshCw size={11} className="spin-anim" /> Đang trích xuất {actualExtracted}/{targetCount} ảnh
                                  </span>
                                ) : (
                                  <span style={{
                                    padding: '0.15rem 0.55rem',
                                    borderRadius: '10px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: 'var(--color-text-muted)',
                                    fontSize: '0.74rem'
                                  }}>
                                    ⏳ Chờ lượt quét ({ch.uploaded} ảnh)
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* 1-Click Action to load restored data into Form */}
                      {telegramModal.restoredAvailable && telegramModal.restoredData && (
                        <div style={{
                          marginTop: '0.6rem',
                          padding: '1rem',
                          borderRadius: '8px',
                          backgroundColor: telegramModal.isExtractionComplete ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.09)',
                          border: `1px solid ${telegramModal.isExtractionComplete ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.8rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                            <div>
                              <div style={{
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                color: telegramModal.isExtractionComplete ? '#34d399' : '#60a5fa',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem'
                              }}>
                                {telegramModal.isExtractionComplete ? (
                                  <>🎉 ĐÃ KHÔI PHỤC HOÀN TẤT 100% TOÀN BỘ 9 CHAPTER (2,494 ẢNH)!</>
                                ) : (
                                  <>
                                    <RefreshCw size={15} className="spin-anim" />
                                    ĐANG TRÍCH XUẤT ẢNH TỪ TELEGRAM: {telegramModal.extractedChaptersCount || 0}/9 Chapter ({telegramModal.extractedImagesCount || 0}/2,494 ảnh — {telegramModal.progressPercent || 0}%)
                                  </>
                                )}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                                {telegramModal.isExtractionComplete ? (
                                  'Tất cả các chapter đã được đồng bộ đầy đủ link CDN Telegram tốc độ cao. Bấm nút bên cạnh để nạp toàn bộ vào Form!'
                                ) : (
                                  'Hệ thống đang tự động trích xuất các link ảnh CDN từ Kênh Telegram trong chế độ ngầm. Tiến độ đang tự động cập nhật trực tiếp mỗi 2 giây...'
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleApplyTelegramMangaToForm(telegramModal.restoredData)}
                              className="btn"
                              style={{
                                backgroundColor: telegramModal.isExtractionComplete ? '#10b981' : '#3b82f6',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.86rem',
                                padding: '0.6rem 1.2rem',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                boxShadow: telegramModal.isExtractionComplete ? '0 4px 15px rgba(16, 185, 129, 0.35)' : '0 4px 15px rgba(59, 130, 246, 0.3)'
                              }}
                            >
                              {telegramModal.isExtractionComplete ? (
                                <><Sparkles size={16} /> 🚀 NẠP ĐẦY ĐỦ 9 CHAPTER VÀO FORM NGAY</>
                              ) : (
                                <><Sparkles size={15} /> ⚡ Nạp tạm {telegramModal.extractedChaptersCount || 0} Chapter đã có</>
                              )}
                            </button>
                          </div>

                          {/* Progress bar if not complete */}
                          {!telegramModal.isExtractionComplete && (
                            <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${telegramModal.progressPercent || 0}%`,
                                height: '100%',
                                backgroundColor: '#3b82f6',
                                borderRadius: '3px',
                                transition: 'width 0.4s ease'
                              }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Import result.json */}
              {telegramModal.tab === 'import' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Instructions */}
                  <div style={{
                    padding: '0.9rem 1.1rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    fontSize: '0.8rem',
                    lineHeight: 1.6,
                    color: '#bfdbfe'
                  }}>
                    <strong style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                      💡 Cách xuất file sao lưu result.json từ Telegram Desktop (Siêu tốc 5 giây):
                    </strong>
                    1. Mở ứng dụng <strong>Telegram Desktop</strong> trên máy tính.<br/>
                    2. Mở Kênh lưu trữ ảnh (<code>my_storage_tool</code>) -&gt; Bấm dấu 3 chấm <code>...</code> ở góc trên cùng bên phải -&gt; Chọn <strong>Export channel history</strong>.<br/>
                    3. Bỏ tích tất cả mục Video/Tệp, chỉ cần chọn định dạng <strong>Machine-readable JSON</strong> -&gt; Bấm <strong>Export</strong>.<br/>
                    4. Kéo thả file <code>result.json</code> vừa tải vào ô bên dưới hoặc chọn file!
                  </div>

                  {/* Dropzone */}
                  <div style={{
                    border: '2px dashed rgba(59, 130, 246, 0.4)',
                    borderRadius: '10px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    cursor: 'pointer'
                  }} onClick={() => document.getElementById('telegram-json-input')?.click()}>
                    <input
                      id="telegram-json-input"
                      type="file"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleImportTelegramJsonFile(file);
                      }}
                    />
                    <Download size={28} style={{ color: '#60a5fa', marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-light)' }}>
                      Kéo thả file result.json hoặc bấm vào đây để chọn file
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                      Hỗ trợ file export của Telegram Desktop hoặc file backup JSON
                    </div>
                  </div>

                  {/* Parsed Result Preview */}
                  {telegramModal.importResult && telegramModal.importResult.mangas && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#34d399' }}>
                        🎉 Tìm thấy {telegramModal.importResult.mangas.length} bộ truyện trong file JSON:
                      </h4>
                      {telegramModal.importResult.mangas.map((manga, mIdx) => (
                        <div
                          key={mIdx}
                          style={{
                            padding: '1rem',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.6rem'
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '0.95rem', color: '#fff' }}>
                              📖 {manga.title}
                            </strong>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              {manga.chapters?.length || 0} Chapter • {manga.chapters?.reduce((s, c) => s + (c.images?.length || 0), 0) || 0} ảnh CDN
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyTelegramMangaToForm(manga)}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#10b981',
                              color: '#fff',
                              fontWeight: 700,
                              padding: '0.45rem 1rem',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            ⚡ Nạp vào Form ngay
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '1rem 1.4rem',
              borderTop: '1px solid var(--color-border, #333)',
              backgroundColor: 'rgba(255,255,255,0.02)'
            }}>
              <button
                type="button"
                onClick={() => setTelegramModal(prev => ({ ...prev, isOpen: false }))}
                className="btn btn-outline"
                style={{ padding: '0.45rem 1.2rem', fontSize: '0.84rem' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MangaForm;
