/**
 * Image resizing and compression utilities for automatic photo optimization
 */

export async function resizeImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.82
): Promise<{ dataUrl: string; width: number; height: number; originalSize: number; newSize: number }> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('File tidak ditemukan'));
      return;
    }

    // Safety check: ensure file is an image
    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|bmp|gif|heic|heif)$/i.test(file.name)) {
      reject(new Error('File yang dipilih bukan format gambar yang didukung (gunakan JPG, PNG, atau WebP)'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar dari perangkat'));
    reader.onload = (e) => {
      const rawResult = e.target?.result as string;
      if (!rawResult) {
        reject(new Error('Data gambar kosong'));
        return;
      }

      const img = new Image();
      img.onerror = () => {
        // Fallback: If image cannot be loaded into canvas (e.g. SVG or browser quirk), resolve with raw dataUrl
        resolve({
          dataUrl: rawResult,
          width: 800,
          height: 600,
          originalSize: file.size,
          newSize: file.size,
        });
      };

      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (!width || !height) {
            resolve({
              dataUrl: rawResult,
              width: 800,
              height: 600,
              originalSize: file.size,
              newSize: file.size,
            });
            return;
          }

          // Calculate proportional dimensions
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              dataUrl: rawResult,
              width,
              height,
              originalSize: file.size,
              newSize: file.size,
            });
            return;
          }

          // Draw image smoothly
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          let dataUrl = '';
          try {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          } catch {
            dataUrl = canvas.toDataURL(); // Default PNG fallback
          }

          // Approximate byte size of base64
          const stringLength = dataUrl.length - (dataUrl.indexOf(',') + 1);
          const newSize = Math.round(stringLength * 0.75);

          resolve({
            dataUrl,
            width,
            height,
            originalSize: file.size,
            newSize: newSize || file.size,
          });
        } catch (canvasErr) {
          console.warn('Canvas resize fallback:', canvasErr);
          resolve({
            dataUrl: rawResult,
            width: img.width || 800,
            height: img.height || 600,
            originalSize: file.size,
            newSize: file.size,
          });
        }
      };

      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Convert base64 data URL into pure Uint8Array for docx embedding
 */
export function base64ToUint8Array(base64Data: string): Uint8Array {
  const parts = base64Data.split(';base64,');
  const raw = window.atob(parts.length > 1 ? parts[1] : parts[0]);
  const rawLength = raw.length;
  const array = new Uint8Array(new ArrayBuffer(rawLength));

  for (let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
}

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
