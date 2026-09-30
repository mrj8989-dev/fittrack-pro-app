import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { WorkoutSessionsService } from './workout-sessions.service';

describe('WorkoutSessionsService', () => {
  let service: WorkoutSessionsService;
  let prisma: {
    user: { findUnique: jest.Mock };
    workoutSession: { findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    sessionSet: { findMany: jest.Mock };
  };

  const client = { id: 'client-1', role: Role.CLIENT };
  const trainer = { id: 'trainer-1', role: Role.TRAINER };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      workoutSession: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      sessionSet: { findMany: jest.fn() },
    };
    service = new WorkoutSessionsService(prisma as any);
  });

  describe('findOne', () => {
    it('lanza NotFound si la sesión no existe', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue(null);
      await expect(service.findOne('s1', client.id)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza Forbidden si la sesión es de otro usuario', async () => {
      prisma.workoutSession.findUnique.mockResolvedValue({ id: 's1', userId: 'otro' });
      await expect(service.findOne('s1', client.id)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('devuelve la sesión si pertenece al usuario', async () => {
      const session = { id: 's1', userId: client.id };
      prisma.workoutSession.findUnique.mockResolvedValue(session);
      await expect(service.findOne('s1', client.id)).resolves.toBe(session);
    });
  });

  describe('permisos de historial (findAll)', () => {
    it('un cliente no puede consultar el historial de otro usuario', async () => {
      await expect(service.findAll(client, 'otro')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.workoutSession.findMany).not.toHaveBeenCalled();
    });

    it('un entrenador no puede consultar a un cliente que no es suyo', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'c2', trainerId: 'otro-entrenador' });
      await expect(service.findAll(trainer, 'c2')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('un entrenador puede consultar a su cliente', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'c1', trainerId: trainer.id });
      prisma.workoutSession.findMany.mockResolvedValue([]);
      await service.findAll(trainer, 'c1');
      expect(prisma.workoutSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'c1' } }),
      );
    });

    it('sin clientId consulta las sesiones del propio usuario', async () => {
      prisma.workoutSession.findMany.mockResolvedValue([]);
      await service.findAll(client);
      expect(prisma.workoutSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: client.id } }),
      );
    });
  });

  describe('getPersonalRecords', () => {
    const day = (d: number) => ({ date: new Date(2026, 0, d) });

    it('se queda con la serie más pesada de cada ejercicio', async () => {
      // Prisma los devuelve ya ordenados por peso descendente
      prisma.sessionSet.findMany.mockResolvedValue([
        { exerciseId: 'banca', weight: 100, reps: 5, workoutSession: day(3) },
        { exerciseId: 'banca', weight: 90, reps: 8, workoutSession: day(2) },
        { exerciseId: 'dominadas', weight: 20, reps: 6, workoutSession: day(1) },
      ]);

      const records = await service.getPersonalRecords(client);

      expect(records).toEqual([
        { exerciseId: 'banca', maxWeight: 100, reps: 5, date: day(3).date, volume: 500 },
        { exerciseId: 'dominadas', maxWeight: 20, reps: 6, date: day(1).date, volume: 120 },
      ]);
    });

    it('devuelve una lista vacía sin series registradas', async () => {
      prisma.sessionSet.findMany.mockResolvedValue([]);
      await expect(service.getPersonalRecords(client)).resolves.toEqual([]);
    });
  });

  describe('getProgress', () => {
    it('calcula el volumen como peso x repeticiones', async () => {
      prisma.sessionSet.findMany.mockResolvedValue([
        { weight: 50, reps: 10, setNumber: 1, workoutSession: { date: new Date(2026, 0, 1) } },
        { weight: 60, reps: null, setNumber: 2, workoutSession: { date: new Date(2026, 0, 2) } },
      ]);

      const progress = await service.getProgress(client, 'banca');

      expect(progress.map(p => p.volume)).toEqual([500, 0]);
    });
  });
});
