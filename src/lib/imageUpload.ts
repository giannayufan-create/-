export async function fileToBase64(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('請上傳圖片檔案（JPG、PNG 等）');
  if (file.size > 8 * 1024 * 1024) throw new Error('圖片請小於 8MB');

  const bitmap = await createImageBitmap(file);
  const maxW = 600;
  const scale = Math.min(1, maxW / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('無法處理圖片');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.78);
}
