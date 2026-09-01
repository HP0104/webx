import React, { useState, useRef } from 'react';
import { BookOpen, Upload, Link as LinkIcon, Trash2, Plus, FolderOpen, Image, ChevronDown, ChevronUp, Eye, X, Loader } from 'lucide-react';
import { MANGA_GENRES, MANGA_STATUS, IMGBB_API_KEY_STORAGE, uploadMultipleToImgBB, uploadToImgBB, parseFolderStructure, countTotalImages } from '../../utils/mangaUtils';

function MangaForm({
  mangaData,
  setMangaData,
  editingMangaId,
  onSaveManga,
  onCancelEdit
}) {
  const [imgbbKey, setImgbbKey] = useState(() => localStorage.getItem(IMGBB_API_KEY_STORAGE) || '');
  const [uploadMode, setUploadMode] = useState('folder'); // 'folder' or 'url'
  const [parsedChapters, setParsedChapters] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null); // { current, total, file, chapterIdx, chapterTotal }
  const [isUploading, setIsUploading] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [coverUploading, setCoverUploading] = useState(false);

  // Manual chapter addition state
  const [manualChapterTitle, setManualChapterTitle] = useState('');
  const [manualChapterUrls, setManualChapterUrls] = useState('');

  const folderInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const chapterFolderInputRef = useRef(null);

  // Save ImgBB key
  const handleImgbbKeyChange = (val) => {
    setImgbbKey(val);
    if (val.trim()) {
      localStorage.setItem(IMGBB_API_KEY_STORAGE, val.trim());
    } else {
      localStorage.removeItem(IMGBB_API_KEY_STORAGE);
    }
  };

  // Handle cover upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!imgbbKey.trim()) return alert('Vui lòng nhập ImgBB API Key trước!');

    setCoverUploading(true);
    try {
      const result = await uploadToImgBB(file, imgbbKey);
      setMangaData(prev => ({ ...prev, cover: result.url }));
    } catch (err) {
      alert('Upload ảnh bìa lỗi: ' + err.message);
    } finally {
      setCoverUploading(false);
    }
  };

  // Handle folder selection
  const handleFolderSelect = (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const { mangaTitle, chapters } = parseFolderStructure(fileList);
    setParsedChapters(chapters);

    if (mangaTitle && !mangaData.title) {
      setMangaData(prev => ({ ...prev, title: mangaTitle }));
    }
  };

  // Upload all parsed chapters to ImgBB
  const handleUploadAll = async () => {
    if (!imgbbKey.trim()) return alert('Vui lòng nhập ImgBB API Key!');
    if (parsedChapters.length === 0) return alert('Chưa có chapter nào!');

    setIsUploading(true);
    const newChapters = [...(mangaData.chapters || [])];

    try {
      for (let ci = 0; ci < parsedChapters.length; ci++) {
        const ch = parsedChapters[ci];
        const chapterNumber = newChapters.length + 1;

        setUploadProgress({
          current: 0,
          total: ch.files.length,
          file: '',
          chapterIdx: ci + 1,
          chapterTotal: parsedChapters.length,
          chapterName: ch.name
        });

        const urls = await uploadMultipleToImgBB(ch.files, imgbbKey, (uploaded, total, fileName) => {
          setUploadProgress(prev => ({
            ...prev,
            current: uploaded,
            total,
            file: fileName
          }));
        });

        newChapters.push({
          id: `ch-${Date.now()}-${ci}`,
          number: chapterNumber,
          title: ch.name,
          images: urls,
          createdAt: new Date().toISOString()
        });
      }

      setMangaData(prev => ({ ...prev, chapters: newChapters }));
      setParsedChapters([]);
      setUploadProgress(null);
      alert(`Upload thành công ${parsedChapters.length} chapter!`);
    } catch (err) {
      alert('Upload lỗi: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Upload single chapter folder
  const handleSingleChapterUpload = async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    if (!imgbbKey.trim()) return alert('Vui lòng nhập ImgBB API Key!');

    const imageFiles = Array.from(fileList)
      .filter(f => f.type?.startsWith('image/'))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (imageFiles.length === 0) return alert('Không tìm thấy ảnh trong folder!');

    setIsUploading(true);
    const chapterNumber = (mangaData.chapters?.length || 0) + 1;

    try {
      setUploadProgress({ current: 0, total: imageFiles.length, file: '', chapterIdx: 1, chapterTotal: 1, chapterName: `Chapter ${chapterNumber}` });

      const urls = await uploadMultipleToImgBB(imageFiles, imgbbKey, (uploaded, total, fileName) => {
        setUploadProgress(prev => ({ ...prev, current: uploaded, total, file: fileName }));
      });

      const newChapter = {
        id: `ch-${Date.now()}`,
        number: chapterNumber,
        title: manualChapterTitle || `Chapter ${chapterNumber}`,
        images: urls,
        createdAt: new Date().toISOString()
      };

      setMangaData(prev => ({ ...prev, chapters: [...(prev.chapters || []), newChapter] }));
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

    setMangaData(prev => ({ ...prev, chapters: [...(prev.chapters || []), newChapter] }));
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
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!mangaData.title?.trim()) return alert('Vui lòng nhập tên truyện!');

    const data = {
      ...mangaData,
      views: Number(mangaData.views) || 0,
      updatedAt: new Date().toISOString()
    };

    if (!editingMangaId) {
      data.createdAt = new Date().toISOString();
    }

    onSaveManga(data);
  };

  const totalUploadedImages = (mangaData.chapters || []).reduce((sum, ch) => sum + (ch.images?.length || 0), 0);

  return (
    <div className="card" id="admin-manga-form">
      <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <BookOpen size={20} />
        {editingMangaId ? 'Chỉnh sửa Truyện' : 'Thêm Truyện Mới'}
      </h2>

      {/* ImgBB API Key */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(102, 192, 244, 0.06)', border: '1px solid rgba(102, 192, 244, 0.15)' }}>
        <label style={{ color: 'var(--color-accent)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
          <Image size={14} /> ImgBB API Key (để upload ảnh)
        </label>
        <input
          type="text"
          className="input-field"
          placeholder="Nhập ImgBB API Key..."
          value={imgbbKey}
          onChange={e => handleImgbbKeyChange(e.target.value)}
          style={{ margin: 0, fontSize: '0.85rem' }}
        />
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.3rem', display: 'block' }}>
          Lấy key miễn phí tại api.imgbb.com — Key được lưu trên trình duyệt
        </span>
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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              className="input-field"
              placeholder="URL ảnh bìa"
              value={mangaData.cover || ''}
              onChange={e => setMangaData(prev => ({ ...prev, cover: e.target.value }))}
              style={{ margin: 0 }}
            />
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => coverInputRef.current?.click()}
            disabled={coverUploading || !imgbbKey.trim()}
            style={{ background: 'var(--color-accent)', color: '#000', border: 'none', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap', fontWeight: 600 }}
          >
            {coverUploading ? <Loader size={14} className="spin" /> : <Upload size={14} />}
            {coverUploading ? 'Đang tải...' : 'Upload bìa'}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={handleCoverUpload} />
        </div>

        {/* Cover Preview */}
        {mangaData.cover && (
          <div style={{ maxWidth: '150px' }}>
            <img src={mangaData.cover} alt="Cover" style={{ width: '100%', borderRadius: '6px', border: '1px solid var(--color-border)' }}
              onError={e => { e.target.style.display = 'none'; }} />
          </div>
        )}

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
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
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

          {/* Folder Upload Mode */}
          {uploadMode === 'folder' && (
            <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(82, 196, 26, 0.06)', border: '1px dashed rgba(82, 196, 26, 0.3)' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.8rem' }}>
                📁 Chọn <strong>thư mục truyện lớn</strong> — mỗi subfolder sẽ tự nhận diện thành 1 chapter.
              </p>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                disabled={isUploading || !imgbbKey.trim()}
                className="btn"
                style={{ background: '#52c41a', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
              >
                <FolderOpen size={16} /> Chọn Thư Mục Truyện
              </button>
              <input
                ref={folderInputRef}
                type="file"
                hidden
                webkitdirectory=""
                directory=""
                multiple
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
                    style={{ marginTop: '0.8rem', background: 'var(--color-accent)', color: '#000', border: 'none', padding: '0.6rem 1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Upload size={16} /> {isUploading ? 'Đang upload...' : `Upload tất cả lên ImgBB`}
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
                placeholder="Tên chapter (ví dụ: Chapter 5)"
                value={manualChapterTitle}
                onChange={e => setManualChapterTitle(e.target.value)}
                style={{ margin: '0 0 0.8rem 0' }}
              />
              <button
                type="button"
                onClick={() => chapterFolderInputRef.current?.click()}
                disabled={isUploading || !imgbbKey.trim()}
                className="btn"
                style={{ background: 'var(--color-accent)', color: '#000', border: 'none', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
              >
                <FolderOpen size={14} /> Chọn folder ảnh chapter
              </button>
              <input
                ref={chapterFolderInputRef}
                type="file"
                hidden
                webkitdirectory=""
                directory=""
                multiple
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
                      <div style={{ padding: '0.5rem 0.8rem', maxHeight: '200px', overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.4rem' }}>
                          {(ch.images || []).map((url, pi) => (
                            <img key={pi} src={url} alt={`p${pi + 1}`}
                              style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                              onError={e => { e.target.style.display = 'none'; }} />
                          ))}
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
    </div>
  );
}

export default MangaForm;
