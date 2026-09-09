import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Upload, Link as LinkIcon, Trash2, Plus, FolderOpen, ImageIcon, ChevronDown, ChevronUp, Eye, X, Loader, Layers, Check, FileArchive, Sparkles, Clock, AlertCircle } from 'lucide-react';
import {
  MANGA_GENRES,
  MANGA_STATUS,
  IMGBB_API_KEY_STORAGE,
  FREEIMAGE_API_KEY_STORAGE,
  MANGA_STORAGE_PROVIDER_KEY,
  MANGA_STORAGE_PROVIDERS,
  IMGBB_DEFAULT_KEYS,
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
  extractArchiveToChapters
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
  const coverInputRef = useRef(null);
  const chapterFolderInputRef = useRef(null);
  const archiveInputRef = useRef(null);
  const chapterArchiveInputRef = useRef(null);

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

    try {
      for (let ci = 0; ci < chaptersToUpload.length; ci++) {
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
      const serverLabel = storageProvider === 'telegram' ? 'Telegram CDN' : (storageProvider === 'catbox' ? 'Catbox.moe' : (storageProvider === 'freeimage' ? 'FreeImage.host' : 'ImgBB'));
      alert(`Đã upload thành công ${addedChapters.length} chapter lên ${serverLabel}!`);
      return addedChapters;
    } catch (err) {
      console.error('Upload chapters error:', err);
      if (err.message.includes('Rate limit')) {
        alert(
          `⚠️ LỖI RATE LIMIT (ImgBB):\n\n${err.message}\n\n` +
          `👉 Mẹo: Tài khoản ImgBB của key này tạm hết lượt trong giờ này. Bạn có thể lấy thêm 1 key miễn phí tại api.imgbb.com hoặc dán nhiều key cách nhau bằng dấu phẩy (key1, key2) để tự động luân phiên!`
        );
      } else if (err.message.includes('forbidden') || err.message.includes('FreeImage')) {
        alert(
          `❌ LỖI PROXY FREEIMAGE:\n\n${err.message}\n\n` +
          `👉 GIẢI PHÁP: Vui lòng chuyển sang chọn server "ImgBB", dán API Key (lấy miễn phí tại api.imgbb.com) rồi bấm Upload lại!`
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

  // Handle folder selection (auto starts upload)
  const handleFolderSelect = async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const { mangaTitle, chapters } = parseFolderStructure(fileList);
    if (chapters.length === 0) return alert('Không tìm thấy tệp ảnh nào trong thư mục đã chọn!');

    const detectedTitle = mangaData.title || mangaTitle || '';
    if (mangaTitle && !mangaData.title) {
      setMangaData(prev => ({ ...prev, title: mangaTitle }));
    }

    setParsedChapters(chapters);
    await uploadChaptersList(chapters, detectedTitle);
  };

  // Manual trigger if needed
  const handleUploadAll = async () => {
    await uploadChaptersList(parsedChapters, mangaData.title);
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
      .filter(f => f.type?.startsWith('image/'))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (imageFiles.length === 0) return alert('Không tìm thấy ảnh trong folder!');

    setIsUploading(true);
    const chapterNumber = (mangaData.chapters?.length || 0) + 1;
    const currentMangaTitle = (mangaData.title || '').trim();
    const chTitle = manualChapterTitle || `Chapter ${chapterNumber}`;
    const prefix = [currentMangaTitle, chTitle].filter(Boolean).join(' ');
    const currentApiKey = storageProvider === 'catbox' ? '' : (storageProvider === 'freeimage' ? freeimageKey : imgbbKey);

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
      alert(`Upload thành công chapter ${chapterNumber}!`);
    } catch (err) {
      alert('Upload lỗi: ' + err.message);
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
                  ⚡ PHÂN BIỆT THÔNG MINH
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#93c5fd', fontFamily: 'monospace' }}>
                Proxy: img-cdn.takarvn.workers.dev
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5 }}>
              • <strong>Phân loại tự động:</strong> Mỗi bức ảnh tải lên đều được tự động gắn Hashtag (<code>#TenTruyen</code>, <code>#Chap_X</code>, <code>Trang x/y</code>) giúp dễ dàng tìm kiếm.<br/>
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
            <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(82, 196, 26, 0.06)', border: '1px dashed rgba(82, 196, 26, 0.3)' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.8rem' }}>
                📁 Chọn <strong>thư mục truyện lớn</strong> — mỗi subfolder sẽ tự nhận diện thành 1 chapter.
              </p>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                disabled={isUploading}
                className="btn"
                style={{ background: '#52c41a', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}
              >
                <FolderOpen size={16} /> Chọn Thư Mục Truyện
              </button>
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

              {/* Parsed Preview */}
              {parsedChapters.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-success)', fontWeight: 600, marginBottom: '0.5rem' }}>
                    ✓ Tìm thấy {parsedChapters.length} chapter, tổng {countTotalImages(parsedChapters)} ảnh
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {parsedChapters.map((ch, i) => (
                      <div key={i} style={{ padding: '0.3rem 0', borderBottom: '1px solid var(--color-border)' }}>
                        📂 {ch.name} — {ch.files.length} ảnh
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleUploadAll}
                    disabled={isUploading}
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
                      gap: '0.5rem'
                    }}
                  >
                    <Upload size={16} /> {isUploading ? 'Đang upload...' : `Upload tất cả lên ${storageProvider === 'freeimage' ? 'FreeImage.host' : 'ImgBB'}`}
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

          {/* Existing Chapters */}
          {(mangaData.chapters || []).length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Chapters đã thêm:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(mangaData.chapters || []).map((ch) => (
                  <div key={ch.id} style={{ borderRadius: '6px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.5rem 0.8rem', backgroundColor: 'var(--color-bg-secondary)', cursor: 'pointer'
                    }} onClick={() => toggleChapter(ch.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                        {expandedChapters[ch.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        <strong style={{ color: 'var(--color-text-light)' }}>Ch. {ch.number}</strong>
                        <span style={{ color: 'var(--color-text-muted)' }}>{ch.title}</span>
                        <span style={{ color: 'var(--color-accent)', fontSize: '0.75rem' }}>({ch.images?.length || 0} ảnh)</span>
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteChapter(ch.id); }}
                        style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '0.2rem' }}>
                        <Trash2 size={14} />
                      </button>
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
                ))}
              </div>
            </div>
          )}
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
    </div>
  );
}

export default MangaForm;
