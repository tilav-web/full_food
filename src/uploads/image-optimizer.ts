import { Jimp, JimpMime, ResizeStrategy } from 'jimp';

export const OPTIMIZED_IMAGE_EXTENSION = '.jpg';
export const OPTIMIZED_IMAGE_CONTENT_TYPE = 'image/jpeg';

const MAX_IMAGE_WIDTH = 900;
const MAX_IMAGE_HEIGHT = 900;
const JPEG_QUALITY = 78;

export async function optimizeImageBuffer(buffer: Buffer): Promise<Buffer> {
  const image = await Jimp.read(buffer);
  const scale = Math.min(
    1,
    MAX_IMAGE_WIDTH / image.bitmap.width,
    MAX_IMAGE_HEIGHT / image.bitmap.height,
  );

  if (scale < 1) {
    image.resize({
      w: Math.max(1, Math.round(image.bitmap.width * scale)),
      h: Math.max(1, Math.round(image.bitmap.height * scale)),
      mode: ResizeStrategy.BILINEAR,
    });
  }

  return image.getBuffer(JimpMime.jpeg, { quality: JPEG_QUALITY });
}
