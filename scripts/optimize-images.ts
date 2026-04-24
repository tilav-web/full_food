import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { basename, extname, join } from 'path';
import {
  OPTIMIZED_IMAGE_EXTENSION,
  optimizeImageBuffer,
} from '../src/uploads/image-optimizer';
import { getUploadsDir } from '../src/uploads/uploads-path';

const prisma = new PrismaClient();
const uploadsDir = getUploadsDir();
const serverUrl = (process.env.SERVER_URL ?? '').replace(/\/$/, '');

type ImageOwner =
  | { type: 'category'; id: string; image: string | null }
  | { type: 'product'; id: string; image: string | null }
  | { type: 'orderItemProduct'; id: string; image: string | null }
  | { type: 'orderItemCategory'; id: string; image: string | null };

type OptimizedImage = {
  oldUrl: string;
  newUrl: string;
  oldPath: string | null;
  newPath: string;
};

function resolveUploadPath(imageUrl: string): string | null {
  if (imageUrl.startsWith('/uploads/')) {
    return join(uploadsDir, basename(imageUrl));
  }

  if (serverUrl && imageUrl.startsWith(`${serverUrl}/uploads/`)) {
    return join(uploadsDir, basename(imageUrl));
  }

  return null;
}

function toPublicUrl(filePath: string): string {
  const relativePath = `/uploads/${basename(filePath)}`;
  return serverUrl ? `${serverUrl}${relativePath}` : relativePath;
}

async function optimizeUploadImage(imageUrl: string): Promise<OptimizedImage | null> {
  const sourcePath = resolveUploadPath(imageUrl);

  await mkdir(uploadsDir, { recursive: true });

  if (!sourcePath) {
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return null;
    }

    const response = await fetch(imageUrl);

    if (!response.ok) {
      return null;
    }

    const targetPath = join(uploadsDir, `${randomUUID()}${OPTIMIZED_IMAGE_EXTENSION}`);
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const optimized = await optimizeImageBuffer(imageBuffer);

    await writeFile(targetPath, optimized);

    return {
      oldUrl: imageUrl,
      newUrl: toPublicUrl(targetPath),
      oldPath: null,
      newPath: targetPath,
    };
  }

  if (!existsSync(sourcePath)) {
    return null;
  }

  const sourceExtension = extname(sourcePath).toLowerCase();
  const targetPath =
    sourceExtension === OPTIMIZED_IMAGE_EXTENSION
      ? sourcePath
      : join(uploadsDir, `${basename(sourcePath, sourceExtension)}${OPTIMIZED_IMAGE_EXTENSION}`);
  const tempPath = join(uploadsDir, `${randomUUID()}${OPTIMIZED_IMAGE_EXTENSION}`);
  const optimized = await optimizeImageBuffer(await readFile(sourcePath));

  await writeFile(tempPath, optimized);

  if (targetPath === sourcePath) {
    await rename(tempPath, sourcePath);
  } else {
    await rename(tempPath, targetPath);
  }

  return {
    oldUrl: imageUrl,
    newUrl: toPublicUrl(targetPath),
    oldPath: sourcePath,
    newPath: targetPath,
  };
}

async function updateOwner(owner: ImageOwner, newUrl: string): Promise<void> {
  if (owner.type === 'category') {
    await prisma.category.update({ where: { id: owner.id }, data: { image: newUrl } });
    return;
  }

  if (owner.type === 'product') {
    await prisma.product.update({ where: { id: owner.id }, data: { image: newUrl } });
    return;
  }

  if (owner.type === 'orderItemProduct') {
    await prisma.orderItem.update({ where: { id: owner.id }, data: { productImage: newUrl } });
    return;
  }

  await prisma.orderItem.update({ where: { id: owner.id }, data: { categoryImage: newUrl } });
}

async function main() {
  const [categories, products, orderItemProductImages, orderItemCategoryImages] =
    await Promise.all([
      prisma.category.findMany({
        where: { image: { not: null } },
        select: { id: true, image: true },
      }),
      prisma.product.findMany({
        where: { image: { not: null } },
        select: { id: true, image: true },
      }),
      prisma.orderItem.findMany({
        where: { productImage: { not: null } },
        select: { id: true, productImage: true },
      }),
      prisma.orderItem.findMany({
        where: { categoryImage: { not: null } },
        select: { id: true, categoryImage: true },
      }),
    ]);

  const owners: ImageOwner[] = [
    ...categories.map((item) => ({
      type: 'category' as const,
      id: item.id,
      image: item.image,
    })),
    ...products.map((item) => ({
      type: 'product' as const,
      id: item.id,
      image: item.image,
    })),
    ...orderItemProductImages.map((item) => ({
      type: 'orderItemProduct' as const,
      id: item.id,
      image: item.productImage,
    })),
    ...orderItemCategoryImages.map((item) => ({
      type: 'orderItemCategory' as const,
      id: item.id,
      image: item.categoryImage,
    })),
  ];

  const optimizedByUrl = new Map<string, OptimizedImage | null>();
  let updatedRows = 0;
  let skippedRows = 0;

  for (const owner of owners) {
    if (!owner.image) {
      skippedRows += 1;
      continue;
    }

    if (!optimizedByUrl.has(owner.image)) {
      try {
        optimizedByUrl.set(owner.image, await optimizeUploadImage(owner.image));
      } catch (error) {
        console.warn(`Image skipped: ${owner.image}`, error);
        optimizedByUrl.set(owner.image, null);
      }
    }

    const optimized = optimizedByUrl.get(owner.image);

    if (!optimized) {
      skippedRows += 1;
      continue;
    }

    if (owner.image !== optimized.newUrl) {
      await updateOwner(owner, optimized.newUrl);
      updatedRows += 1;
    }
  }

  const uniqueOptimized = [...optimizedByUrl.values()].filter(
    (item): item is OptimizedImage => Boolean(item),
  );

  for (const item of uniqueOptimized) {
    if (item.oldPath && item.oldPath !== item.newPath && existsSync(item.oldPath)) {
      await unlink(item.oldPath);
    }
  }

  console.log(
    `Optimized ${uniqueOptimized.length} image file(s), updated ${updatedRows} database row(s), skipped ${skippedRows} external/missing image reference(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
