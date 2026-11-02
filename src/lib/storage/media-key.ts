export function validateStorageKey(key: string): string {
  if (!key || key.startsWith('/') || key.includes('\\') || /[\x00-\x1f\x7f]/.test(key) || key.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('Invalid storage key');
  }
  return key;
}
export function storageUrl(key: string): string {
  validateStorageKey(key);
  return `/api/${/\.(mp3|wav|ogg|opus|m4a|aac|flac|webm)$/i.test(key) ? 'stream' : 'file'}/${encodeURIComponent(key)}`;
}
export function storageMimeType(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase() || '';
  return ({ mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', opus: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', webm: 'audio/webm', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' } as Record<string, string>)[extension] || 'application/octet-stream';
}
