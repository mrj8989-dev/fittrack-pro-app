import { BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { basename, extname, join } from 'path';
import { diskStorage } from 'multer';
import type { Options } from 'multer';

/**
 * Carpeta de las fotos subidas (perfil y revisiones). Las sirve UploadsController en /uploads.
 * En producción se apunta con UPLOADS_DIR a un volumen persistente: el disco de un
 * contenedor se pierde en cada despliegue.
 */
export function uploadsDir(): string {
  const dir =
    process.env.UPLOADS_DIR || join(process.cwd(), 'public', 'uploads');
  mkdirSync(dir, { recursive: true });
  return dir;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 8 * 1024 * 1024;

/** Opciones de multer para fotos: solo imágenes, máximo 8 MB, nombre único con prefijo. */
export function imageUpload(prefix: string): Options {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadsDir()),
      filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(
          null,
          `${prefix}-${unique}${extname(file.originalname).toLowerCase()}`,
        );
      },
    }),
    limits: { fileSize: MAX_BYTES },
    fileFilter: (_req, file, cb) => {
      if (IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
      else
        cb(
          new BadRequestException(
            'Solo se admiten imágenes (JPG, PNG, WebP o GIF)',
          ),
        );
    },
  };
}

/** Borra el archivo de una URL pública "/uploads/<fichero>" (ignora cualquier otra ruta). */
export function deleteUpload(url: string | null | undefined): void {
  if (!url?.startsWith('/uploads/')) return;
  const file = join(uploadsDir(), basename(url));
  if (existsSync(file)) unlinkSync(file);
}

// ── Enlaces firmados ─────────────────────────────────────────
// Las fotos de revisiones son datos sensibles: solo se entregan con un enlace firmado que la API
// genera para quien puede ver esa revisión (el cliente, su entrenador o el admin). Un <img> no
// puede mandar el token de sesión, por eso la firma va en la URL. Las fotos de perfil son públicas.

/** Franja de validez: el enlace caduca entre 6 y 12 h después de generarse (y es estable en la franja, así se cachea). */
const SLOT_SECONDS = 6 * 3600;

const secret = () =>
  process.env.UPLOADS_SECRET || process.env.JWT_SECRET || 'dev-uploads-secret';

const signature = (file: string, exp: number) =>
  createHmac('sha256', secret()).update(`${file}:${exp}`).digest('base64url');

/** Las fotos de perfil (avatar-*) son públicas; el resto, privadas. */
export const isPrivateUpload = (file: string) => !file.startsWith('avatar-');

/** URL pública de una foto privada guardada como "/uploads/<fichero>", con caducidad y firma. */
export function signUploadUrl(url: string | null): string | null {
  if (!url?.startsWith('/uploads/')) return url;
  const file = basename(url);
  if (!isPrivateUpload(file)) return url;
  const exp = (Math.floor(Date.now() / 1000 / SLOT_SECONDS) + 2) * SLOT_SECONDS;
  return `/uploads/${file}?exp=${exp}&sig=${signature(file, exp)}`;
}

/** Comprueba la firma y que no haya caducado. */
export function verifyUploadSignature(
  file: string,
  exp: number,
  sig: string | undefined,
): boolean {
  if (!sig || !Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = Buffer.from(signature(file, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Las tres fotos de una revisión, firmadas. */
export function withSignedPhotos<
  T extends {
    photoFront: string | null;
    photoBack: string | null;
    photoSide: string | null;
  },
>(revision: T): T {
  return {
    ...revision,
    photoFront: signUploadUrl(revision.photoFront),
    photoBack: signUploadUrl(revision.photoBack),
    photoSide: signUploadUrl(revision.photoSide),
  };
}
