/**
 * Thư viện nén ảnh Client-side bằng HTML5 Canvas
 * Tự động giảm kích thước chiều rộng/cao tối đa (max 1920px) và nén chất lượng JPEG 80%.
 * Giúp giảm dung lượng ảnh từ 5-10MB xuống ~150KB-300KB trước khi upload.
 */
export async function compressImageFile(file, maxWidth = 1920, maxHeight = 1920, quality = 0.82) {
  if (!file || !file.type.startsWith('image/')) {
    return file; // Giữ nguyên nếu không phải là file ảnh (ví dụ PDF, docx)
  }

  // Nếu file ảnh vốn dĩ rất nhỏ (< 300KB), không cần nén lại
  if (file.size <= 300 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Tính toán kích thước thu nhỏ tỷ lệ chuẩn
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Vẽ ảnh lên canvas với làm mịn chất lượng cao
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            console.log(`[ImageCompressor] ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024).toFixed(0)}KB (Giảm ${(((file.size - compressedFile.size) / file.size) * 100).toFixed(0)}%)`);
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
