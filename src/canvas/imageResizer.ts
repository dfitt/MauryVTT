export interface ProcessedImageResult {
  assetHash: string;
  blob: Blob;
  mimeType: string;
  widthPx: number;
  heightPx: number;
  byteSize: number;
}

export async function processImageFile(
  file: File,
  maxDimensionPx = 1024
): Promise<ProcessedImageResult> {
  // Load image bitmap or HTMLImageElement
  const imgUrl = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (e) => reject(new Error("Failed to load image: " + e));
    image.src = imgUrl;
  });

  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;
  const maxSide = Math.max(originalWidth, originalHeight);

  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  if (maxSide > maxDimensionPx) {
    const scale = maxDimensionPx / maxSide;
    targetWidth = Math.round(originalWidth * scale);
    targetHeight = Math.round(originalHeight * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(imgUrl);
    throw new Error("2D canvas context unavailable");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  URL.revokeObjectURL(imgUrl);

  const mimeType = file.type.startsWith("image/") ? file.type : "image/png";
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Canvas toBlob conversion failed"));
      },
      mimeType === "image/jpeg" || mimeType === "image/webp" ? mimeType : "image/png",
      0.92
    );
  });

  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const assetHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return {
    assetHash,
    blob,
    mimeType: blob.type,
    widthPx: targetWidth,
    heightPx: targetHeight,
    byteSize: blob.size
  };
}

export async function processTokenImageFile(
  file: File,
  ringColor: string = "#38bdf8"
): Promise<ProcessedImageResult> {
  const imgUrl = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (e) => reject(new Error("Failed to load token image: " + e));
    image.src = imgUrl;
  });

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(imgUrl);
    throw new Error("2D canvas context unavailable");
  }

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(128, 128, 116, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, size, size);
  ctx.restore();

  // Draw circular exterior token ring with increased thickness and importing user's active color
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 20;
  ctx.stroke();

  URL.revokeObjectURL(imgUrl);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Canvas toBlob conversion failed"));
      },
      "image/png"
    );
  });

  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const assetHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return {
    assetHash,
    blob,
    mimeType: "image/png",
    widthPx: size,
    heightPx: size,
    byteSize: blob.size
  };
}

export async function generatePlainTokenImage(
  fillColor: string = "#38bdf8"
): Promise<ProcessedImageResult> {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable");
  }

  ctx.clearRect(0, 0, size, size);

  // Fill circle with current color
  ctx.beginPath();
  ctx.arc(128, 128, 116, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Black border ring
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 20;
  ctx.stroke();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Canvas toBlob conversion failed"));
      },
      "image/png"
    );
  });

  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const assetHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return {
    assetHash,
    blob,
    mimeType: "image/png",
    widthPx: size,
    heightPx: size,
    byteSize: blob.size
  };
}
