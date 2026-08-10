import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ExercisesModule } from './exercises/exercises.module';
import { WorkoutPlansModule } from './workout-plans/workout-plans.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { WorkoutSessionsModule } from './workout-sessions/workout-sessions.module';
import { BodyRevisionsModule } from './body-revisions/body-revisions.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ExercisesModule,
    WorkoutPlansModule,
    WorkoutsModule,
    WorkoutSessionsModule,
    BodyRevisionsModule
  ],
})
export class AppModule {}