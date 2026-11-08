import { Role, SubscriptionPlan } from '@prisma/client';
import { AiSettingsService } from './ai-settings.service';
import { AiService } from './ai.service';

// Validar una clave consulta la API de Anthropic: en los tests se sustituye por una que acepta todo.
jest.mock('@anthropic-ai/sdk', () => {
  class Anthropic {
    models = { retrieve: jest.fn().mockResolvedValue({ id: 'model' }) };
  }
  return { __esModule: true, default: Anthropic };
});

describe('AiSettingsService', () => {
  let service: AiSettingsService;
  let prisma: { aiSettings: { findUnique: jest.Mock; upsert: jest.Mock } };
  let stored: Record<string, unknown>;

  beforeEach(() => {
    process.env.JWT_SECRET = 'secreto-de-prueba';
    stored = {};
    prisma = {
      aiSettings: {
        findUnique: jest.fn(),
        // Devuelve lo que se habría guardado, como hace Prisma.
        upsert: jest.fn(
          ({ update, create }: { update: object; create: object }) => {
            stored = { ...create, ...update };
            return Promise.resolve({ userId: 'u1', ...stored });
          },
        ),
      },
    };
    service = new AiSettingsService(prisma as any);
  });

  it('guarda la clave cifrada, enseña solo los 4 últimos y la descifra igual', async () => {
    const key = 'sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234';
    const view = await service.setApiKey('u1', `  ${key}  `);

    expect(view.hasOwnApiKey).toBe(true);
    expect(view.apiKeyLast4).toBe('1234');
    expect(JSON.stringify(view)).not.toContain(key);
    expect(stored.apiKeyEncrypted).not.toContain(key);
    expect(
      service.ownApiKey({
        userId: 'u1',
        apiKeyEncrypted: stored.apiKeyEncrypted as string,
      }),
    ).toBe(key);
  });

  it('cifra distinto cada vez (IV aleatorio)', async () => {
    await service.setApiKey('u1', 'sk-ant-api03-misma-clave-0000000000');
    const first = stored.apiKeyEncrypted;
    await service.setApiKey('u1', 'sk-ant-api03-misma-clave-0000000000');
    expect(stored.apiKeyEncrypted).not.toBe(first);
  });

  it('devuelve null si el cifrado está manipulado', async () => {
    await service.setApiKey('u1', 'sk-ant-api03-otra-clave-1111111111');
    const [iv, tag, data] = (stored.apiKeyEncrypted as string).split('.');
    const tampered = [iv, tag, Buffer.from('x' + data).toString('base64')].join(
      '.',
    );
    expect(
      service.ownApiKey({ userId: 'u1', apiKeyEncrypted: tampered }),
    ).toBeNull();
  });

  it('un usuario no puede cambiarse el límite diario; el admin sí', async () => {
    await service.update('u1', { dailyLimit: 999, tone: 'technical' }, false);
    expect(stored).not.toHaveProperty('dailyLimit');
    expect(stored.tone).toBe('technical');

    await service.update('u1', { dailyLimit: 5 }, true);
    expect(stored.dailyLimit).toBe(5);
  });

  it('limpia los textos libres: recorta espacios y vacío = sin valor', async () => {
    await service.update(
      'u1',
      { goal: '  Ganar fuerza  ', limitations: '   ' },
      false,
    );
    expect(stored.goal).toBe('Ganar fuerza');
    expect(stored.limitations).toBeNull();
  });
});

describe('AiService.dailyLimit', () => {
  const ai = new AiService({} as any, {} as any, {} as any, {} as any);
  const base = {
    userId: 'u1',
    tone: 'friendly',
    detail: 'brief',
    goal: null,
    limitations: null,
    shareTraining: true,
    shareSessions: true,
    shareRevisions: true,
    shareNutrition: true,
    apiKeyLast4: null,
  };
  const client = (plan: SubscriptionPlan) => ({
    id: 'u1',
    role: Role.CLIENT,
    subscriptionPlan: plan,
  });

  it('por defecto, el límite de su plan', () => {
    expect(
      ai.dailyLimit(client('PRO'), {
        ...base,
        dailyLimit: null,
        apiKeyEncrypted: null,
      }),
    ).toBe(20);
  });

  it('con clave propia, sin límite', () => {
    expect(
      ai.dailyLimit(client('PRO'), {
        ...base,
        dailyLimit: null,
        apiKeyEncrypted: 'x',
      }),
    ).toBeNull();
  });

  it('el límite del admin manda sobre todo, también con clave propia', () => {
    expect(
      ai.dailyLimit(client('PRO'), {
        ...base,
        dailyLimit: 3,
        apiKeyEncrypted: 'x',
      }),
    ).toBe(3);
  });

  it('un FREE con el asistente activado por el admin recibe el límite por defecto', () => {
    expect(
      ai.dailyLimit(client('FREE'), {
        ...base,
        dailyLimit: null,
        apiKeyEncrypted: null,
      }),
    ).toBe(20);
  });
});
