export const getEventImages = (event) => {
  const gallery = Array.isArray(event?.images) ? event.images : [];
  const fallback = typeof event?.image === 'string' ? [event.image] : [];

  return [...new Set([...gallery, ...fallback]
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean))];
};

export const getEventPrimaryImage = (event) => {
  return getEventImages(event)[0] || event?.banner || '';
};