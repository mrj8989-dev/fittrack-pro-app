import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../access/access.service';

const DAY = 24 * 60 * 60 * 1000;
// Sin entrenar en estos días, el cliente aparece como "inactivo".
const INACTIVE_AFTER_DAYS = 7;

export type ClientAlert =
  | 'inactive'
  | 'revision'
  | 'no-plan'
  | 'no-menu'
  | 'messages';

/** Resumen para la pantalla de inicio del entrenador: un vistazo a toda su cartera. */
@Injectable()
export class TrainerDashboardService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async get(trainerId: string) {
    const clients = await this.prisma.user.findMany({
      where: { trainerId, role: Role.CLIENT, active: true },
      select: {
        id: true,
        name: true,
        email: true,
        profilePhoto: true,
        subscriptionPlan: true,
        revisionInterval: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
    const ids = clients.map((c) => c.id);
    const now = Date.now();
    const weekAgo = new Date(now - 7 * DAY);

    const [
      lastSessions,
      sessionsWeek,
      lastRevisions,
      plans,
      menus,
      unread,
      recentSessions,
    ] = await Promise.all([
      this.prisma.workoutSession.groupBy({
        by: ['userId'],
        where: { userId: { in: ids } },
        _max: { date: true },
      }),
      this.prisma.workoutSession.groupBy({
        by: ['userId'],
        where: { userId: { in: ids }, date: { gte: weekAgo } },
        _count: true,
      }),
      this.prisma.bodyRevision.groupBy({
        by: ['userId'],
        where: { userId: { in: ids } },
        _max: { date: true },
      }),
      this.prisma.workoutPlan.groupBy({
        by: ['userId'],
        where: { userId: { in: ids }, isTemplate: false },
        _count: true,
      }),
      this.prisma.mealPlan.groupBy({
        by: ['userId'],
        where: { userId: { in: ids }, isTemplate: false },
        _count: true,
      }),
      this.prisma.message.groupBy({
        by: ['senderId'],
        where: { receiverId: trainerId, read: false, senderId: { in: ids } },
        _count: true,
      }),
      this.prisma.workoutSession.findMany({
        where: { userId: { in: ids } },
        orderBy: { date: 'desc' },
        take: 8,
        select: {
          id: true,
          date: true,
          completed: true,
          duration: true,
          userId: true,
          workoutName: true,
          workout: { select: { name: true } },
          sets: { select: { weight: true, reps: true } },
        },
      }),
    ]);

    const byUser = <T extends { userId: string | null }>(rows: T[]) =>
      new Map(rows.map((r) => [r.userId, r]));
    const lastSession = byUser(lastSessions);
    const weekCount = byUser(sessionsWeek);
    const lastRevision = byUser(lastRevisions);
    const planCount = byUser(plans);
    const menuCount = byUser(menus);
    const unreadBy = new Map(unread.map((u) => [u.senderId, u._count]));

    const rows = await Promise.all(
      clients.map(async (c) => {
        const lastSessionAt = lastSession.get(c.id)?._max.date ?? null;
        const lastRevisionAt = lastRevision.get(c.id)?._max.date ?? null;
        // Sin revisiones, la primera tocaba al darse de alta.
        const nextRevisionAt = new Date(
          (lastRevisionAt ?? c.createdAt).getTime() +
            (lastRevisionAt ? c.revisionInterval * DAY : 0),
        );
        const daysSinceSession = lastSessionAt
          ? Math.floor((now - lastSessionAt.getTime()) / DAY)
          : null;
        const nutrition = await this.access.entitled(
          { ...c, role: Role.CLIENT },
          'nutrition',
        );
        const unreadMessages = unreadBy.get(c.id) ?? 0;

        const alerts: ClientAlert[] = [];
        if (
          daysSinceSession === null ||
          daysSinceSession >= INACTIVE_AFTER_DAYS
        )
          alerts.push('inactive');
        if (nextRevisionAt.getTime() <= now) alerts.push('revision');
        if (!planCount.get(c.id)) alerts.push('no-plan');
        if (nutrition && !menuCount.get(c.id)) alerts.push('no-menu');
        if (unreadMessages > 0) alerts.push('messages');

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          profilePhoto: c.profilePhoto,
          subscriptionPlan: c.subscriptionPlan,
          lastSessionAt,
          daysSinceSession,
          sessionsLast7d: weekCount.get(c.id)?._count ?? 0,
          lastRevisionAt,
          nextRevisionAt,
          hasPlan: !!planCount.get(c.id),
          hasMenu: !!menuCount.get(c.id),
          nutritionEnabled: nutrition,
          unreadMessages,
          alerts,
        };
      }),
    );

    const names = new Map(clients.map((c) => [c.id, c.name]));
    return {
      totals: {
        clients: clients.length,
        sessionsLast7d: rows.reduce((n, r) => n + r.sessionsLast7d, 0),
        activeLast7d: rows.filter((r) => r.sessionsLast7d > 0).length,
        revisionsDue: rows.filter((r) => r.alerts.includes('revision')).length,
        unreadMessages: rows.reduce((n, r) => n + r.unreadMessages, 0),
        needAttention: rows.filter((r) => r.alerts.length > 0).length,
      },
      clients: rows,
      recentSessions: recentSessions.map((s) => ({
        id: s.id,
        date: s.date,
        completed: s.completed,
        duration: s.duration,
        clientId: s.userId,
        clientName: names.get(s.userId) ?? '',
        workoutName: s.workout?.name ?? s.workoutName ?? 'Sesión',
        sets: s.sets.length,
        volume: Math.round(
          s.sets.reduce((v, x) => v + (x.weight ?? 0) * (x.reps ?? 0), 0),
        ),
      })),
    };
  }
}
