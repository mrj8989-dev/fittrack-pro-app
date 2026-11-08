import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ExercisesModule } from './exercises/exercises.module';
import { WorkoutPlansModule } from './workout-plans/workout-plans.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { WorkoutSessionsModule } from './workout-sessions/workout-sessions.module';
import { BodyRevisionsModule } from './body-revisions/body-revisions.module';
import { MessagesModule } from './messages/messages.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { AdminModule } from './admin/admin.module';
import { AccessModule } from './access/access.module';
import { AiModule } from './ai/ai.module';
import { UploadsModule } from './uploads/uploads.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Límite de peticiones por IP (las de login y registro, mucho más estrictas: ver AuthController).
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        errorMessage: 'Demasiadas peticiones seguidas. Espera un minuto y vuelve a intentarlo.',
        throttlers: [
          {
            ttl: 60_000,
            limit:
              Number(process.env.THROTTLE_LIMIT) ||
              (process.env.NODE_ENV === 'production' ? 300 : 3000),
          },
        ],
      }),
    }),
    // Fotos subidas: las sirve UploadsController (las de revisiones, solo con enlace firmado).
    UploadsModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    ExercisesModule,
    WorkoutPlansModule,
    WorkoutsModule,
    WorkoutSessionsModule,
    BodyRevisionsModule,
    MessagesModule,
    NutritionModule,
    AdminModule,
    AccessModule,
    AiModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}