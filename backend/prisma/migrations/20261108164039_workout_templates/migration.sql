-- DropForeignKey
ALTER TABLE "SessionSet" DROP CONSTRAINT "SessionSet_workoutSessionId_fkey";

-- DropForeignKey
ALTER TABLE "Workout" DROP CONSTRAINT "Workout_workoutPlanId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutExercise" DROP CONSTRAINT "WorkoutExercise_workoutId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutSession" DROP CONSTRAINT "WorkoutSession_workoutId_fkey";

-- AlterTable
ALTER TABLE "WorkoutPlan" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN     "workoutName" TEXT,
ALTER COLUMN "workoutId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSet" ADD CONSTRAINT "SessionSet_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Las sesiones ya existentes guardan el nombre de su día para el historial.
UPDATE "WorkoutSession" s SET "workoutName" = w."name" FROM "Workout" w WHERE s."workoutId" = w."id";
