import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AiSettings, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../access/access.service';
import type { AccessUser } from '../access/access.service';
import { AI_DAILY_LIMIT } from '../access/plan-features';
import { NutritionProfileService } from '../nutrition/nutrition-profile.service';
import { AI_SYSTEM_PROMPT } from './ai-context';
import { AI_MODEL } from './ai-model';
import { AiSettingsService } from './ai-settings.service';

// Mensajes previos que se envían como contexto de la conversación.
const HISTORY_WINDOW = 20;
// Límite para quien tiene el asistente por una excepción del admin y no por su plan.
const FALLBACK_DAILY_LIMIT = 20;
const MAX_INPUT_CHARS = 2000;
// Tope de mensajes al día entre TODOS los usuarios que gastan la clave del servidor (no cuenta a
// quien usa su propia clave). Con el registro abierto, es lo que pone techo a la factura.
// 0 = la clave del servidor no se usa nunca. Se lee al usar (no al cargar el módulo) para respetar el .env.
const serverDailyLimit = () => {
  const raw = process.env.AI_SERVER_DAILY_LIMIT?.trim();
  return raw ? Number(raw) : 200;
};

const DAY_LABEL = [
  '',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
];
const TONE_TEXT: Record<string, string> = {
  friendly: 'cercano y sencillo, evitando tecnicismos innecesarios',
  technical:
    'técnico y preciso, con terminología de entrenamiento y el porqué fisiológico',
  motivational: 'motivador y enérgico, animándole a ser constante',
};
const DETAIL_TEXT: Record<string, string> = {
  brief: 'respuestas breves (no más de 150-200 palabras salvo que pida más)',
  detailed: 'respuestas completas y detalladas, con ejemplos cuando ayuden',
};

type Settings = Omit<AiSettings, 'updatedAt'>;

/** Límite diario efectivo; null = sin límite. */
export interface AiUsage {
  used: number;
  limit: number | null;
  remaining: number | null;
}

export interface ChatResult {
  reply: string;
  refused: boolean;
  usage: AiUsage;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private serverClient: Anthropic | null = null;

  constructor(
    private prisma: PrismaService,
    private access: AccessService,
    private nutrition: NutritionProfileService,
    private settings: AiSettingsService,
  ) {}

  /** Credenciales del servidor para la API de Anthropic. */
  private hasServerKey(): boolean {
    return !!(
      process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN
    );
  }

  /** Cliente de la API: con la clave propia del usuario si la tiene, o con la del servidor. */
  private clientFor(settings: Settings): Anthropic | null {
    const own = this.settings.ownApiKey(settings);
    if (own) return new Anthropic({ apiKey: own });
    if (!this.hasServerKey()) return null;
    this.serverClient ??= new Anthropic();
    return this.serverClient;
  }

  /**
   * Prioridad: límite fijado por el admin > sin límite si usa su propia clave (paga él) >
   * límite de su plan.
   */
  dailyLimit(user: AccessUser, settings: Settings): number | null {
    if (settings.dailyLimit !== null) return settings.dailyLimit;
    if (settings.apiKeyEncrypted) return null;
    if (user.role !== Role.CLIENT) return FALLBACK_DAILY_LIMIT;
    return AI_DAILY_LIMIT[user.subscriptionPlan] || FALLBACK_DAILY_LIMIT;
  }

  private startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /** Mensajes de hoy enviados con la clave del servidor (usuarios sin clave propia). */
  private serverUsageToday() {
    return this.prisma.aiMessage.count({
      where: {
        role: 'user',
        createdAt: { gte: this.startOfToday() },
        user: {
          OR: [{ aiSettings: null }, { aiSettings: { apiKeyEncrypted: null } }],
        },
      },
    });
  }

  async usage(user: AccessUser, settings?: Settings): Promise<AiUsage> {
    const s = settings ?? (await this.settings.get(user.id));
    const limit = this.dailyLimit(user, s);
    const used = await this.prisma.aiMessage.count({
      where: {
        userId: user.id,
        role: 'user',
        createdAt: { gte: this.startOfToday() },
      },
    });
    return {
      used,
      limit,
      remaining: limit === null ? null : Math.max(0, limit - used),
    };
  }

  async getConversation(user: AccessUser) {
    const settings = await this.settings.get(user.id);
    const [messages, usage] = await Promise.all([
      this.prisma.aiMessage.findMany({
        where: { userId: user.id, archived: false },
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, content: true, createdAt: true },
      }),
      this.usage(user, settings),
    ]);
    return {
      configured: !!settings.apiKeyEncrypted || this.hasServerKey(),
      usingOwnKey: !!settings.apiKeyEncrypted,
      model: AI_MODEL,
      usage,
      messages,
    };
  }

  /** "Nueva conversación": se archiva (sigue contando para el límite del día). */
  async archiveConversation(userId: string) {
    await this.prisma.aiMessage.updateMany({
      where: { userId, archived: false },
      data: { archived: true },
    });
  }

  /** Comprobaciones antes de abrir el stream, para poder responder con un error HTTP normal. */
  async assertCanChat(user: AccessUser, message: string) {
    const settings = await this.settings.get(user.id);
    if (!this.clientFor(settings)) {
      throw new ServiceUnavailableException(
        'El asistente IA no está configurado: falta una clave de API (en el servidor o en tus ajustes).',
      );
    }
    if (!message.trim())
      throw new HttpException('Escribe un mensaje', HttpStatus.BAD_REQUEST);
    if (message.length > MAX_INPUT_CHARS) {
      throw new HttpException(
        `El mensaje es demasiado largo (máximo ${MAX_INPUT_CHARS} caracteres)`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const { remaining, limit } = await this.usage(user, settings);
    if (remaining !== null && remaining <= 0) {
      throw new HttpException(
        limit === 0
          ? 'Tu cuenta no tiene mensajes del asistente disponibles.'
          : `Has usado tus ${limit} mensajes de hoy. Mañana tendrás ${limit} nuevos.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!settings.apiKeyEncrypted && (await this.serverUsageToday()) >= serverDailyLimit()) {
      throw new HttpException(
        'El asistente ha alcanzado el máximo de mensajes de hoy para toda la plataforma. Vuelve mañana o usa tu propia clave de API en Ajustes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Envía el mensaje y va pasando el texto según llega (onText). El intercambio solo se guarda
   * (y cuenta para el límite) si la respuesta termina: un error o una cancelación no gastan mensaje.
   */
  async chat(
    user: AccessUser,
    message: string,
    onText: (delta: string) => void,
    signal?: AbortSignal,
  ): Promise<ChatResult> {
    const settings = await this.settings.get(user.id);
    const client = this.clientFor(settings);
    if (!client)
      throw new ServiceUnavailableException(
        'El asistente IA no está configurado.',
      );

    const [history, context] = await Promise.all([
      this.prisma.aiMessage.findMany({
        where: { userId: user.id, archived: false },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_WINDOW,
        select: { role: true, content: true },
      }),
      this.buildUserContext(user, settings),
    ]);

    const messages: Anthropic.Beta.BetaMessageParam[] = history
      .reverse()
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));
    // La API exige que la conversación empiece por el usuario.
    while (messages.length && messages[0].role !== 'user') messages.shift();
    messages.push({ role: 'user', content: message.trim() });

    let final: Anthropic.Beta.BetaMessage;
    try {
      const stream = client.beta.messages.stream(
        {
          model: AI_MODEL,
          max_tokens: 16000,
          // Chat de preguntas y respuestas: esfuerzo bajo para responder rápido.
          output_config: { effort: 'low' },
          // Si un filtro de seguridad rechaza la petición, la API la reintenta en el modelo recomendado.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          cache_control: { type: 'ephemeral' },
          system: [
            { type: 'text', text: AI_SYSTEM_PROMPT },
            { type: 'text', text: context },
          ],
          messages,
        },
        { signal },
      );
      stream.on('text', (delta) => onText(delta));
      final = await stream.finalMessage();
    } catch (error) {
      throw this.toHttpError(error, !!settings.apiKeyEncrypted);
    }

    const refused = final.stop_reason === 'refusal';
    const text = final.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('')
      .trim();
    const reply =
      refused || !text
        ? 'Lo siento, no puedo ayudarte con esa pregunta. Si tiene que ver con tu entrenamiento, prueba a planteármela de otra forma o coméntala con tu entrenador.'
        : text;

    // Horas consecutivas explícitas: con la misma marca de tiempo el orden al recargar sería incierto.
    const now = Date.now();
    await this.prisma.aiMessage.createMany({
      data: [
        {
          userId: user.id,
          role: 'user',
          content: message.trim(),
          createdAt: new Date(now),
        },
        {
          userId: user.id,
          role: 'assistant',
          content: reply,
          createdAt: new Date(now + 1),
        },
      ],
    });
    return { reply, refused, usage: await this.usage(user, settings) };
  }

  private toHttpError(error: unknown, ownKey: boolean): HttpException {
    if (error instanceof Anthropic.APIUserAbortError) {
      // 499: el cliente cerró la conexión (convención de nginx); no llega a enviarse.
      return new HttpException('Cancelado', 499);
    }
    if (
      error instanceof Anthropic.AuthenticationError ||
      error instanceof Anthropic.PermissionDeniedError
    ) {
      this.logger.error(
        `Clave de Anthropic rechazada (${ownKey ? 'del usuario' : 'del servidor'}): ${error.message}`,
      );
      return new ServiceUnavailableException(
        ownKey
          ? 'Anthropic ha rechazado tu clave de API. Revísala en Ajustes.'
          : 'El asistente no está bien configurado en el servidor. Avisa al administrador.',
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return new HttpException(
        'El asistente está muy solicitado ahora mismo. Inténtalo en un momento.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (error instanceof Anthropic.APIError) {
      this.logger.error(
        `Error de la API de Anthropic (${error.status}): ${error.message}`,
      );
      return new BadGatewayException(
        'El asistente no ha podido responder. Inténtalo de nuevo.',
      );
    }
    this.logger.error(`Error inesperado del asistente: ${String(error)}`);
    return new BadGatewayException(
      'El asistente no ha podido responder. Inténtalo de nuevo.',
    );
  }

  /** Preferencias y datos del cliente que el asistente puede usar (según lo que haya permitido). */
  private async buildUserContext(
    user: AccessUser,
    s: Settings,
  ): Promise<string> {
    const [profile, plans, sessions, revisions, canNutrition] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: user.id },
          select: { name: true, subscriptionPlan: true },
        }),
        s.shareTraining
          ? this.prisma.workoutPlan.findMany({
              where: { userId: user.id, isTemplate: false },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                workouts: {
                  orderBy: { dayOfWeek: 'asc' },
                  include: {
                    exercises: {
                      orderBy: { order: 'asc' },
                      include: { exercise: { select: { name: true } } },
                    },
                  },
                },
              },
            })
          : Promise.resolve(null),
        s.shareSessions
          ? this.prisma.workoutSession.findMany({
              where: { userId: user.id },
              orderBy: { date: 'desc' },
              take: 5,
              include: { workout: { select: { name: true } } },
            })
          : Promise.resolve(null),
        s.shareRevisions
          ? this.prisma.bodyRevision.findMany({
              where: { userId: user.id },
              orderBy: { date: 'desc' },
              take: 3,
              select: {
                date: true,
                weight: true,
                bodyFat: true,
                waistCm: true,
              },
            })
          : Promise.resolve(null),
        this.access.can(user, 'nutrition'),
      ]);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const lines: string[] = [
      'Preferencias del cliente para tus respuestas:',
      `- Tono: ${TONE_TEXT[s.tone] ?? TONE_TEXT.friendly}.`,
      `- Extensión: ${DETAIL_TEXT[s.detail] ?? DETAIL_TEXT.brief}. Esto prevalece sobre la extensión por defecto.`,
    ];
    if (s.goal) lines.push(`- Su objetivo personal: ${s.goal}`);
    if (s.limitations) {
      lines.push(
        `- Lesiones o limitaciones que debes tener siempre en cuenta: ${s.limitations}. Adapta las recomendaciones y no propongas ejercicios que las comprometan.`,
      );
    }

    lines.push('', `Datos del cliente (fecha de hoy: ${fmt(new Date())}):`);
    lines.push(
      `- Nombre: ${profile?.name ?? 'desconocido'} · plan ${profile?.subscriptionPlan ?? '—'}`,
    );

    if (plans === null) {
      lines.push(
        '- Plan de entrenamiento: el cliente ha preferido no compartirlo contigo.',
      );
    } else if (plans[0]) {
      lines.push(`- Plan de entrenamiento: "${plans[0].name}"`);
      for (const w of plans[0].workouts) {
        const day = w.dayOfWeek ? DAY_LABEL[w.dayOfWeek] : 'sin día';
        const exs = w.exercises
          .map((e) => `${e.exercise.name} ${e.sets}x${e.reps ?? '?'}`)
          .join('; ');
        lines.push(`  · ${w.name} (${day}): ${exs || 'sin ejercicios'}`);
      }
    } else {
      lines.push('- Todavía no tiene plan de entrenamiento asignado.');
    }

    if (sessions === null) {
      lines.push('- Sesiones: el cliente ha preferido no compartirlas.');
    } else {
      lines.push(
        sessions.length
          ? `- Últimas sesiones: ${sessions.map((x) => `${fmt(x.date)} ${x.workout?.name ?? x.workoutName ?? ''}${x.completed ? '' : ' (sin terminar)'}`).join('; ')}`
          : '- No ha registrado sesiones todavía.',
      );
    }

    if (revisions === null) {
      lines.push('- Peso y medidas: el cliente ha preferido no compartirlos.');
    } else {
      lines.push(
        revisions.length
          ? `- Revisiones corporales: ${revisions.map((r) => `${fmt(r.date)} ${r.weight} kg${r.bodyFat ? `, ${r.bodyFat}% grasa` : ''}${r.waistCm ? `, cintura ${r.waistCm} cm` : ''}`).join('; ')}`
          : '- Sin revisiones corporales.',
      );
    }

    if (!canNutrition) {
      lines.push('- Nutrición: su plan no incluye el módulo de nutrición.');
    } else if (!s.shareNutrition) {
      lines.push(
        '- Nutrición: tiene el módulo, pero ha preferido no compartir sus datos de alimentación.',
      );
    } else {
      const { profile: np, targets } = await this.nutrition.get(user.id);
      lines.push(
        np && targets
          ? `- Nutrición (tiene el módulo): objetivo ${np.goal}; ${targets.kcal} kcal/día, proteína ${targets.protein} g, hidratos ${targets.carbs} g, grasa ${targets.fat} g.`
          : '- Nutrición (tiene el módulo): aún no ha rellenado su perfil nutricional.',
      );
    }
    return lines.join('\n');
  }
}
