/**
 * Universal file downloader & saver supporting Web browsers and PWA Standalone Mode (iOS & Android)
 * In PWA Standalone mode (added to home screen), iOS WebKit blocks synthetic <a download> clicks on blob URLs.
 * The Web Share API (navigator.share with File object) is the official standard that opens the native iOS
 * action sheet allowing users to "Simpan ke File" (Save to Files), AirDrop, or share via WhatsApp/Drive.
 */
export async function downloadOrShareBlob(
  blob: Blob,
  filename: string,
  title: string = 'Laporan Kinerja Resmi'
): Promise<void> {
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const isStandalone =
    Boolean(('standalone' in navigator && (navigator as any).standalone)) ||
    (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches);

  const isMobile = isIOS || /Android/.test(navigator.userAgent);

  // 1. On Mobile devices and Standalone PWA, prioritize Web Share API with File
  if ((isMobile || isStandalone) && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const mimeType = blob.type || (filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
      const file = new File([blob], filename, {
        type: mimeType,
        lastModified: Date.now(),
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
          text: title,
        });
        return;
      }
    } catch (err: any) {
      // User tapped "Batal" (Cancel) on iOS Share sheet - normal behavior, do not trigger fallback error
      if (err.name === 'AbortError') {
        return;
      }
      console.warn('Web Share API error, using standard download fallback:', err);
    }
  }

  // 2. Standard browser anchor download
  try {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 5000);
    return;
  } catch (err) {
    console.error('Standard anchor download failed:', err);
  }

  // 3. Fallback for constrained iOS standalone webviews if download was blocked
  try {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const win = window.open(dataUrl, '_blank');
      if (!win) {
        window.location.href = dataUrl;
      }
    };
    reader.readAsDataURL(blob);
  } catch (err) {
    console.error('DataURL fallback failed:', err);
  }
}
