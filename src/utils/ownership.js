export const OWNERSHIP_DURATION_MONTHS = 2;

const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());

export const addMonths = (date, months) => {
  const nextDate = new Date(date);
  const originalDay = nextDate.getDate();

  nextDate.setDate(1);
  nextDate.setMonth(nextDate.getMonth() + months);

  const lastDayOfTargetMonth = new Date(
    nextDate.getFullYear(),
    nextDate.getMonth() + 1,
    0
  ).getDate();

  nextDate.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return nextDate;
};

const parseDate = (value, fallbackDate) => {
  const date = new Date(value);
  return isValidDate(date) ? date : fallbackDate;
};

export const createOwnershipRecord = (gameId, purchasedAt = new Date()) => {
  const purchaseDate = parseDate(purchasedAt, new Date());

  return {
    id: gameId.toString(),
    purchasedAt: purchaseDate.toISOString(),
    expiresAt: addMonths(purchaseDate, OWNERSHIP_DURATION_MONTHS).toISOString()
  };
};

export const getOwnershipGameId = (ownership) => {
  if (ownership && typeof ownership === 'object') {
    return (ownership.id ?? ownership.gameId)?.toString() || '';
  }

  return ownership?.toString() || '';
};

export const normalizeOwnedGames = (ownedGames = [], fallbackDate = new Date()) => {
  const normalizedByGameId = new Map();
  const fallback = parseDate(fallbackDate, new Date());

  for (const ownership of ownedGames || []) {
    const gameId = getOwnershipGameId(ownership);
    if (!gameId) continue;

    let record;
    if (ownership && typeof ownership === 'object') {
      const purchasedAt = parseDate(ownership.purchasedAt, fallback);
      const expiresAt = parseDate(
        ownership.expiresAt,
        addMonths(purchasedAt, OWNERSHIP_DURATION_MONTHS)
      );

      record = {
        id: gameId,
        purchasedAt: purchasedAt.toISOString(),
        expiresAt: expiresAt.toISOString()
      };
    } else {
      record = createOwnershipRecord(gameId, fallback);
    }

    const existing = normalizedByGameId.get(gameId);
    if (!existing || Date.parse(record.expiresAt) > Date.parse(existing.expiresAt)) {
      normalizedByGameId.set(gameId, record);
    }
  }

  return [...normalizedByGameId.values()];
};

export const isOwnershipActive = (ownership, now = new Date()) => {
  if (!ownership) return false;

  if (typeof ownership !== 'object') {
    return true;
  }

  return Date.parse(ownership.expiresAt) > now.getTime();
};

export const getGameOwnership = (ownedGames = [], gameId, now = new Date()) => {
  const targetGameId = gameId?.toString();
  const record = normalizeOwnedGames(ownedGames).find(
    ownership => ownership.id === targetGameId
  );

  return {
    record,
    isActive: isOwnershipActive(record, now),
    isExpired: Boolean(record) && !isOwnershipActive(record, now)
  };
};

export const formatOwnershipDate = (dateString) => {
  const date = new Date(dateString);
  if (!isValidDate(date)) return '';

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};
