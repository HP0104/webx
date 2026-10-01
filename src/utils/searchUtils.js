export const normalizeString = (str) => {
  if (!str) return '';
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // remove multiple spaces
};

export const matchSearch = (text, query) => {
  const normText = normalizeString(text);
  const normQuery = normalizeString(query);
  if (!normQuery) return true;
  
  const queryWords = normQuery.split(' ');
  return queryWords.every(word => normText.includes(word));
};
