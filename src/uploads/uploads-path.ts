import { basename, dirname, isAbsolute, join, resolve } from 'path';

function getRuntimeRoot(): string {
  const cwd = process.cwd();

  return basename(cwd) === 'dist' ? dirname(cwd) : cwd;
}

export function getUploadsDir(): string {
  const configuredUploadsDir = process.env.UPLOADS_DIR?.trim();

  if (configuredUploadsDir) {
    return isAbsolute(configuredUploadsDir)
      ? configuredUploadsDir
      : resolve(getRuntimeRoot(), configuredUploadsDir);
  }

  return join(getRuntimeRoot(), 'uploads');
}
