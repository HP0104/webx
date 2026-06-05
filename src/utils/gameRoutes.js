export const createGameSlug = (game) => {
  const source = game?.title || game?.id?.toString() || 'game';

  return source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'game';
};

export const getGamePath = (game) => `/game/${createGameSlug(game)}`;

export const findGameByRouteParam = (games, routeParam) => {
  if (!routeParam) return null;

  return games.find(game =>
    game.id.toString() === routeParam ||
    createGameSlug(game) === routeParam
  ) || null;
};
