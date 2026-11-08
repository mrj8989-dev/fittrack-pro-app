import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AiSettings } from '@prisma/client';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { requireJwtSecret } from '../auth/jwt-secret';
import { AI_MODEL } from './ai-model';
import { UpdateAiSettingsDto } from './dto/ai-settings.dto';

/** Lo que se envía al frontend: la clave nunca sale del servidor. */
export interface AiSettingsView {
  tone: string;
  detail: string;
  goal: string | null;
  limitations: string | null;
  shareTraining: boolean;
  shareSessions: boolean;
  shareRevisions: boolean;
  shareNutrition: boolean;
  dailyLimit: number | null;
  hasOwnApiKey: boolean;
  apiKeyLast4: string | null;
}

const DEFAULTS: Omit<AiSettings, 'userId' | 'updatedAt'> = {
  tone: 'friendly',
  detail: 'brief',
  goal: null,
  limitations: null,
  shareTraining: true,
  shareSessions: true,
  shareRevisions: true,
  shareNutrition: true,
  dailyLimit: null,
  apiKeyEncrypted: null,
  apiKeyLast4: null,
};

@Injectable()
export class AiSettingsService {
  private readonly logger = new Logger(AiSettingsService.name);
  private cipherKey: Buffer | null = null;

  constructor(private prisma: PrismaService) {}

  /** Configuración guardada o la de por defecto (no crea fila hasta que se guarda algo). */
  async get(userId: string): Promise<Omit<AiSettings, 'updatedAt'>> {
    const row = await this.prisma.aiSettings.findUnique({ where: { userId } });
    return row ?? { userId, ...DEFAULTS };
  }

  toView(s: Omit<AiSettings, 'updatedAt'>): AiSettingsView {
    return {
      tone: s.tone,
      detail: s.detail,
      goal: s.goal,
      limitations: s.limitations,
      shareTraining: s.shareTraining,
      shareSessions: s.shareSessions,
      shareRevisions: s.shareRevisions,
      shareNutrition: s.shareNutrition,
      dailyLimit: s.dailyLimit,
      hasOwnApiKey: !!s.apiKeyEncrypted,
      apiKeyLast4: s.apiKeyLast4,
    };
  }

  /** `asAdmin` permite tocar el límite diario; un usuario no puede subirse su propio límite. */
  async update(userId: string, dto: UpdateAiSettingsDto, asAdmin: boolean) {
    const { dailyLimit, ...rest } = dto;
    // Textos libres: vacío = sin valor; undefined = no se toca.
    const clean = (v: string | null | undefined) =>
      v === undefined ? undefined : v?.trim() || null;
    const data = {
      ...rest,
      goal: clean(rest.goal),
      limitations: clean(rest.limitations),
      ...(asAdmin && dailyLimit !== undefined ? { dailyLimit } : {}),
    };
    const saved = await this.prisma.aiSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    return this.toView(saved);
  }

  /** Comprueba la clave contra la API (consultar un modelo no tiene coste) y la guarda cifrada. */
  async setApiKey(userId: string, rawKey: string) {
    const apiKey = rawKey.trim();
    try {
      await new Anthropic({ apiKey, maxRetries: 0 }).models.retrieve(AI_MODEL);
    } catch (error) {
      if (
        error instanceof Anthropic.AuthenticationError ||
        error instanceof Anthropic.PermissionDeniedError
      ) {
        throw new BadRequestException(
          'Anthropic no acepta esa clave. Revisa que la has copiado entera.',
        );
      }
      if (error instanceof Anthropic.NotFoundError) {
        throw new BadRequestException(
          `Esa clave no tiene acceso al modelo ${AI_MODEL}.`,
        );
      }
      this.logger.warn(`No se pudo validar una clave de API: ${String(error)}`);
      throw new BadGatewayException(
        'No se ha podido comprobar la clave con Anthropic. Inténtalo de nuevo.',
      );
    }
    const data = {
      apiKeyEncrypted: this.encrypt(apiKey),
      apiKeyLast4: apiKey.slice(-4),
    };
    const saved = await this.prisma.aiSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    return this.toView(saved);
  }

  async clearApiKey(userId: string) {
    const saved = await this.prisma.aiSettings.upsert({
      where: { userId },
      update: { apiKeyEncrypted: null, apiKeyLast4: null },
      create: { userId },
    });
    return this.toView(saved);
  }

  /** Clave propia descifrada, o null si no tiene (o no se puede descifrar). */
  ownApiKey(
    settings: Pick<AiSettings, 'apiKeyEncrypted' | 'userId'>,
  ): string | null {
    if (!settings.apiKeyEncrypted) return null;
    try {
      return this.decrypt(settings.apiKeyEncrypted);
    } catch {
      // Pasa si cambia AI_KEYS_SECRET: el usuario tendrá que volver a ponerla.
      this.logger.warn(
        `No se pudo descifrar la clave de API del usuario ${settings.userId}`,
      );
      return null;
    }
  }

  // AES-256-GCM. La clave de cifrado sale de AI_KEYS_SECRET (o, si no existe, del secreto JWT).
  private getCipherKey(): Buffer {
    this.cipherKey ??= scryptSync(
      process.env.AI_KEYS_SECRET || requireJwtSecret(),
      'fittrack-ai-api-keys',
      32,
    );
    return this.cipherKey;
  }

  private encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getCipherKey(), iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data]
      .map((b) => b.toString('base64'))
      .join('.');
  }

  private decrypt(stored: string): string {
    const [iv, tag, data] = stored
      .split('.')
      .map((p) => Buffer.from(p, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', this.getCipherKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  }
}
