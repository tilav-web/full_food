import sharp from 'sharp';

export const OPTIMIZED_IMAGE_EXTENSION = '.webp';
export const OPTIMIZED_IMAGE_CONTENT_TYPE = 'image/webp';

const MAX_IMAGE_WIDTH = 900;
const MAX_IMAGE_HEIGHT = 900;
const WEBP_QUALITY = 78;

export async function optimizeImageBuffer(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, {
    animated: false,
    failOn: 'none',
  })
    .rotate()
    .resize({
      width: MAX_IMAGE_WIDTH,
      height: MAX_IMAGE_HEIGHT,
      fit: 'inside',
      withoutEnlargement: true,
      fastShrinkOnLoad: true,
    })
    .webp({
      quality: WEBP_QUALITY,
      effort: 4,
    })
    .toBuffer();
}
