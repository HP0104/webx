/**
 * Shared pure helpers for sorting admin game lists, grouping report chat threads,
 * and validating public contact messages.
 */

export function getEntitySortTimestamp(item) {
  if (!item || typeof item !== 'object') return 0;

  for (const field of ['updatedAt', 'createdAt', 'releaseDate']) {
    const val = item[field];
    if (!val) continue;
    if (typeof val?.toDate === 'function') {
      const ms = val.toDate().getTime();
      if (Number.isFinite(ms)) return ms;
    }
    if (typeof val?.seconds === 'number') {
      return val.seconds * 1000;
    }
    if (typeof val?._seconds === 'number') {
      return val._seconds * 1000;
    }
    if (typeof val === 'number' && Number.isFinite(val)) {
      return val;
    }
    const parsed = Date.parse(String(val));
    if (Number.isFinite(parsed)) return parsed;
  }

  const numericId = Number(item.id);
  return Number.isFinite(numericId) && numericId > 0 ? numericId : 0;
}

export function sortGamesList(games = [], sortBy = 'newest') {
  const list = [...(games || [])];

  switch (sortBy) {
    case 'newest':
      return list.sort((a, b) => (
        (getEntitySortTimestamp(b) - getEntitySortTimestamp(a)) ||
        ((Number(b?.id) || 0) - (Number(a?.id) || 0))
      ));
    case 'oldest':
      return list.sort((a, b) => (
        (getEntitySortTimestamp(a) - getEntitySortTimestamp(b)) ||
        ((Number(a?.id) || 0) - (Number(b?.id) || 0))
      ));
    case 'price_high':
      return list.sort((a, b) => (b?.price || 0) - (a?.price || 0));
    case 'downloads':
      return list.sort((a, b) => (b?.downloads || 0) - (a?.downloads || 0));
    case 'name':
      return list.sort((a, b) => (a?.title || '').localeCompare(b?.title || ''));
    default:
      return list;
  }
}

export function groupChatReportsFromDocs(docs = []) {
  const messagesMap = {};
  const channelDocIds = {};

  for (const d of docs || []) {
    const data = typeof d?.data === 'function' ? d.data() : d?.data;
    if (!data) continue;
    const channelId = data.channelId;
    if (!channelId) continue;

    if (!channelDocIds[channelId]) {
      channelDocIds[channelId] = [];
    }
    channelDocIds[channelId].push(d.id);

    if (data.senderRole === 'admin') continue;

    if (!messagesMap[channelId]) {
      messagesMap[channelId] = {
        id: d.id,
        _collection: 'reports',
        _channelId: channelId,
        type: 'player',
        itemId: '',
        itemTitle: '',
        message: data.text || '',
        image: data.image || null,
        senderName: data.senderName || 'Người dùng',
        senderId: data.senderId || '',
        status: data.status || 'pending',
        createdAt: data.createdAt,
        _messageCount: 1,
        _docIds: channelDocIds[channelId]
      };
    } else {
      const entry = messagesMap[channelId];
      entry.message = data.text || entry.message;
      entry.image = data.image || entry.image;
      entry.createdAt = data.createdAt || entry.createdAt;
      entry.status = data.status || 'pending';
      entry._messageCount += 1;
      entry._docIds = channelDocIds[channelId];
    }
  }

  return Object.values(messagesMap);
}

const VALID_CONTACT_SUBJECTS = new Set(['general', 'bug', 'dmca', 'partnership']);

export function buildContactMessagePayload({ name, email, subject, message } = {}) {
  const cleanName = String(name || '').normalize('NFC').trim();
  const cleanEmail = String(email || '').normalize('NFC').trim();
  const cleanSubject = String(subject || 'general').trim();
  const cleanMessage = String(message || '').normalize('NFC').trim();

  if (!cleanName || cleanName.length > 120) {
    return { valid: false, error: 'Vui lòng nhập tên hợp lệ (tối đa 120 ký tự).', payload: null };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 160) {
    return { valid: false, error: 'Địa chỉ email không hợp lệ.', payload: null };
  }
  if (!VALID_CONTACT_SUBJECTS.has(cleanSubject)) {
    return { valid: false, error: 'Phân loại yêu cầu không hợp lệ.', payload: null };
  }
  if (!cleanMessage || cleanMessage.length > 5000) {
    return { valid: false, error: 'Vui lòng nhập nội dung chi tiết (tối đa 5000 ký tự).', payload: null };
  }

  return {
    valid: true,
    error: null,
    payload: {
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
      status: 'pending'
    }
  };
}
