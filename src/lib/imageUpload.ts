export async function fileToBase64(file: File, maxWidth = 600, quality = 0.72): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('請上傳圖片檔案（JPG、PNG 等）');
  if (file.size > 8 * 1024 * 1024) throw new Error('圖片請小於 8MB');

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('無法處理圖片');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let q = quality;
  let dataUrl = canvas.toDataURL('image/jpeg', q);
  // Firestore 單文件約 1MB，輪播多張需壓縮
  while (dataUrl.length > 450_000 && q > 0.45) {
    q -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', q);
  }
  if (dataUrl.length > 700_000) {
    throw new Error('圖片壓縮後仍太大，請改用較小的照片或較低解析度');
  }
  return dataUrl;
}

/** 輪播用（會自動壓縮以符合 Firestore 容量） */
export async function fileToBase64Hero(file: File): Promise<string> {
  return fileToBase64(file, 960, 0.68);
}

export function approxBase64Bytes(dataUrl: string): number {
  return Math.round((dataUrl.length * 3) / 4);
}
