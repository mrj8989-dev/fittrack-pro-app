import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeder...');

  // ── USUARIO ──────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('demo1234', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@fittrack.com' },
    update: {},
    create: {
      email: 'demo@fittrack.com',
      password: hashedPassword,
      name: 'Demo Admin',
      role: 'ADMIN',
      subscriptionPlan: 'PRO',
      revisionInterval: 14,
    },
  });
  console.log('✅ Usuario creado:', user.email);

  // ── EJERCICIOS ───────────────────────────────────────────────────
  const exercises = await Promise.all([
    prisma.exercise.upsert({ where: { id: 'ex-press-banca' }, update: {}, create: { id: 'ex-press-banca', name: 'Press de banca con barra', muscleGroup: 'Pecho', equipment: 'Barra y banco', description: 'Ejercicio rey para ganar masa en pecho. Agarre ligeramente más ancho que los hombros.', videoUrl: 'https://www.youtube.com/watch?v=UU0a7dbs4NI' } }),
    prisma.exercise.upsert({ where: { id: 'ex-press-inclinado' }, update: {}, create: { id: 'ex-press-inclinado', name: 'Press inclinado con mancuernas', muscleGroup: 'Pecho', equipment: 'Mancuernas y banco', description: 'Trabaja la parte superior del pecho. Banco a 30-45 grados.', videoUrl: 'https://www.youtube.com/watch?v=8iPEnn-ltC8' } }),
    prisma.exercise.upsert({ where: { id: 'ex-fondos' }, update: {}, create: { id: 'ex-fondos', name: 'Fondos en paralelas', muscleGroup: 'Pecho', equipment: 'Paralelas', description: 'Excelente para pecho inferior y tríceps. Inclínate hacia adelante para más pecho.', videoUrl: 'https://www.youtube.com/watch?v=2z8JmcrW-As' } }),
    prisma.exercise.upsert({ where: { id: 'ex-aperturas' }, update: {}, create: { id: 'ex-aperturas', name: 'Aperturas con mancuernas', muscleGroup: 'Pecho', equipment: 'Mancuernas y banco', description: 'Aislamiento de pecho. Movimiento en arco, codos ligeramente flexionados.', videoUrl: 'https://www.youtube.com/watch?v=eozdVDA78K0' } }),
    prisma.exercise.upsert({ where: { id: 'ex-dominadas' }, update: {}, create: { id: 'ex-dominadas', name: 'Dominadas', muscleGroup: 'Espalda', equipment: 'Barra de dominadas', description: 'El mejor ejercicio para ganar anchura en espalda. Agarre prono, ancho.', videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g' } }),
    prisma.exercise.upsert({ where: { id: 'ex-remo-barra' }, update: {}, create: { id: 'ex-remo-barra', name: 'Remo con barra', muscleGroup: 'Espalda', equipment: 'Barra', description: 'Fundamental para grosor de espalda. Espalda recta, tira hacia el ombligo.', videoUrl: 'https://www.youtube.com/watch?v=FWJR5Ve8bnQ' } }),
    prisma.exercise.upsert({ where: { id: 'ex-remo-mancuerna' }, update: {}, create: { id: 'ex-remo-mancuerna', name: 'Remo con mancuerna', muscleGroup: 'Espalda', equipment: 'Mancuerna y banco', description: 'Remo unilateral. Excelente para corregir asimetrías y ganar grosor.', videoUrl: 'https://www.youtube.com/watch?v=pYcpY20QaE8' } }),
    prisma.exercise.upsert({ where: { id: 'ex-peso-muerto' }, update: {}, create: { id: 'ex-peso-muerto', name: 'Peso muerto', muscleGroup: 'Espalda', equipment: 'Barra', description: 'Rey de los ejercicios. Trabaja toda la cadena posterior. Técnica imprescindible.', videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q' } }),
    prisma.exercise.upsert({ where: { id: 'ex-press-militar' }, update: {}, create: { id: 'ex-press-militar', name: 'Press militar con barra', muscleGroup: 'Hombros', equipment: 'Barra', description: 'Press de hombros por encima de la cabeza. Trabaja deltoides anterior y medio.', videoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI' } }),
    prisma.exercise.upsert({ where: { id: 'ex-elevaciones-laterales' }, update: {}, create: { id: 'ex-elevaciones-laterales', name: 'Elevaciones laterales', muscleGroup: 'Hombros', equipment: 'Mancuernas', description: 'Aislamiento de deltoides medio. Clave para dar amplitud a los hombros.', videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo' } }),
    prisma.exercise.upsert({ where: { id: 'ex-pajaros' }, update: {}, create: { id: 'ex-pajaros', name: 'Pájaros con mancuernas', muscleGroup: 'Hombros', equipment: 'Mancuernas', description: 'Deltoides posterior. Muy importante para equilibrio y postura.', videoUrl: 'https://www.youtube.com/watch?v=ttvfGg9d76c' } }),
    prisma.exercise.upsert({ where: { id: 'ex-curl-barra' }, update: {}, create: { id: 'ex-curl-barra', name: 'Curl de bíceps con barra', muscleGroup: 'Bíceps', equipment: 'Barra', description: 'Ejercicio básico de bíceps. Permite mover más peso que con mancuernas.', videoUrl: 'https://www.youtube.com/watch?v=kwG2ipFRgfo' } }),
    prisma.exercise.upsert({ where: { id: 'ex-curl-mancuernas' }, update: {}, create: { id: 'ex-curl-mancuernas', name: 'Curl alternado con mancuernas', muscleGroup: 'Bíceps', equipment: 'Mancuernas', description: 'Permite supinación completa para mayor contracción del bíceps.', videoUrl: 'https://www.youtube.com/watch?v=sAq_ocpRh_I' } }),
    prisma.exercise.upsert({ where: { id: 'ex-curl-martillo' }, update: {}, create: { id: 'ex-curl-martillo', name: 'Curl martillo', muscleGroup: 'Bíceps', equipment: 'Mancuernas', description: 'Trabaja bíceps braquial y braquiorradial. Da grosor al brazo.', videoUrl: 'https://www.youtube.com/watch?v=zC3nLlEvin4' } }),
    prisma.exercise.upsert({ where: { id: 'ex-press-frances' }, update: {}, create: { id: 'ex-press-frances', name: 'Press francés con barra', muscleGroup: 'Tríceps', equipment: 'Barra y banco', description: 'Excelente para cabeza larga del tríceps. Codos fijos, solo mueve el antebrazo.', videoUrl: 'https://www.youtube.com/watch?v=d_KZxkY_0cM' } }),
    prisma.exercise.upsert({ where: { id: 'ex-fondos-triceps' }, update: {}, create: { id: 'ex-fondos-triceps', name: 'Fondos para tríceps', muscleGroup: 'Tríceps', equipment: 'Banco o silla', description: 'Cuerpo vertical para enfocarse en tríceps. Añade peso en el regazo para progresar.', videoUrl: 'https://www.youtube.com/watch?v=0326dy_-CzM' } }),
    prisma.exercise.upsert({ where: { id: 'ex-sentadilla' }, update: {}, create: { id: 'ex-sentadilla', name: 'Sentadilla con barra', muscleGroup: 'Cuádriceps', equipment: 'Barra', description: 'El ejercicio más completo para piernas. Trabaja cuádriceps, glúteos e isquios.', videoUrl: 'https://www.youtube.com/watch?v=YaXPRqUwItQ' } }),
    prisma.exercise.upsert({ where: { id: 'ex-sentadilla-goblet' }, update: {}, create: { id: 'ex-sentadilla-goblet', name: 'Sentadilla goblet', muscleGroup: 'Cuádriceps', equipment: 'Mancuerna', description: 'Variante con mancuerna al pecho. Excelente para técnica y cuádriceps.', videoUrl: 'https://www.youtube.com/watch?v=MxsFDhcyFyE' } }),
    prisma.exercise.upsert({ where: { id: 'ex-zancadas' }, update: {}, create: { id: 'ex-zancadas', name: 'Zancadas con mancuernas', muscleGroup: 'Cuádriceps', equipment: 'Mancuernas', description: 'Trabaja cuádriceps y glúteos unilateralmente. Mejora equilibrio y simetría.', videoUrl: 'https://www.youtube.com/watch?v=D7KaRcUTQeE' } }),
    prisma.exercise.upsert({ where: { id: 'ex-peso-muerto-rumano' }, update: {}, create: { id: 'ex-peso-muerto-rumano', name: 'Peso muerto rumano', muscleGroup: 'Isquiotibiales', equipment: 'Barra o mancuernas', description: 'Aislamiento de isquiotibiales y glúteos. Rodillas ligeramente flexionadas.', videoUrl: 'https://www.youtube.com/watch?v=JCXUYuzwNrM' } }),
    prisma.exercise.upsert({ where: { id: 'ex-hip-thrust' }, update: {}, create: { id: 'ex-hip-thrust', name: 'Hip thrust con barra', muscleGroup: 'Glúteos', equipment: 'Barra y banco', description: 'El mejor ejercicio para glúteos. Empuje de cadera explosivo.', videoUrl: 'https://www.youtube.com/watch?v=xDmFkJxPzeM' } }),
    prisma.exercise.upsert({ where: { id: 'ex-gemelos' }, update: {}, create: { id: 'ex-gemelos', name: 'Elevaciones de gemelos', muscleGroup: 'Gemelos', equipment: 'Peso corporal o mancuernas', description: 'Trabaja gemelos y sóleo. Rango completo de movimiento.', videoUrl: 'https://www.youtube.com/watch?v=gwLzBJYoWlI' } }),
    prisma.exercise.upsert({ where: { id: 'ex-plancha' }, update: {}, create: { id: 'ex-plancha', name: 'Plancha', muscleGroup: 'Core', equipment: 'Peso corporal', description: 'Estabilización de core. Cuerpo recto, no subas las caderas.', videoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c' } }),
    prisma.exercise.upsert({ where: { id: 'ex-rueda-ab' }, update: {}, create: { id: 'ex-rueda-ab', name: 'Rueda abdominal', muscleGroup: 'Core', equipment: 'Rueda abdominal', description: 'Excelente para core completo. Empieza de rodillas hasta dominar el movimiento.', videoUrl: 'https://www.youtube.com/watch?v=1G1AFwTsRYQ' } }),
  ]);
  console.log(`✅ ${exercises.length} ejercicios creados`);

  // ── PLAN ─────────────────────────────────────────────────────────
  let plan = await prisma.workoutPlan.findFirst({
    where: { userId: user.id, name: 'Plan Hipertrofia Upper/Lower — Casa' }
  })

  if (!plan) {
    plan = await prisma.workoutPlan.create({
      data: {
        name: 'Plan Hipertrofia Upper/Lower — Casa',
        description: 'Rutina de 4 días Upper/Lower optimizada para ganar masa muscular con barra y mancuernas en casa. Progresión lineal de cargas.',
        userId: user.id,
      }
    })
  }
  console.log('✅ Plan creado:', plan.name);

  // ── LIMPIAR WORKOUTS EXISTENTES ──────────────────────────────────
  await prisma.workoutExercise.deleteMany({
    where: { workout: { workoutPlanId: plan.id } }
  })
  await prisma.workout.deleteMany({
    where: { workoutPlanId: plan.id }
  })

  // ── WORKOUTS ─────────────────────────────────────────────────────

  // DÍA 1 — Upper A
  const upperA = await prisma.workout.create({
    data: { name: 'Día 1 — Upper A (Empuje + Tirón)', dayOfWeek: 1, workoutPlanId: plan.id }
  })
  for (const ex of [
    { exerciseId: 'ex-press-banca', sets: 4, reps: 6, restTime: 180, order: 1 },
    { exerciseId: 'ex-remo-barra', sets: 4, reps: 6, restTime: 180, order: 2 },
    { exerciseId: 'ex-press-inclinado', sets: 3, reps: 10, restTime: 120, order: 3 },
    { exerciseId: 'ex-dominadas', sets: 3, reps: 8, restTime: 120, order: 4 },
    { exerciseId: 'ex-press-militar', sets: 3, reps: 10, restTime: 90, order: 5 },
    { exerciseId: 'ex-curl-barra', sets: 3, reps: 10, restTime: 60, order: 6 },
    { exerciseId: 'ex-press-frances', sets: 3, reps: 10, restTime: 60, order: 7 },
  ]) {
    await prisma.workoutExercise.create({ data: { workoutId: upperA.id, ...ex } })
  }
  console.log('✅ Día 1 Upper A creado')

  // DÍA 2 — Lower A
  const lowerA = await prisma.workout.create({
    data: { name: 'Día 2 — Lower A (Cuádriceps)', dayOfWeek: 2, workoutPlanId: plan.id }
  })
  for (const ex of [
    { exerciseId: 'ex-sentadilla', sets: 4, reps: 6, restTime: 180, order: 1 },
    { exerciseId: 'ex-peso-muerto-rumano', sets: 3, reps: 10, restTime: 120, order: 2 },
    { exerciseId: 'ex-zancadas', sets: 3, reps: 10, restTime: 90, order: 3 },
    { exerciseId: 'ex-hip-thrust', sets: 3, reps: 12, restTime: 90, order: 4 },
    { exerciseId: 'ex-gemelos', sets: 4, reps: 15, restTime: 60, order: 5 },
    { exerciseId: 'ex-plancha', sets: 3, reps: 1, duration: 60, restTime: 60, order: 6 },
  ]) {
    await prisma.workoutExercise.create({ data: { workoutId: lowerA.id, ...ex } })
  }
  console.log('✅ Día 2 Lower A creado')

  // DÍA 3 — Upper B
  const upperB = await prisma.workout.create({
    data: { name: 'Día 3 — Upper B (Volumen)', dayOfWeek: 4, workoutPlanId: plan.id }
  })
  for (const ex of [
    { exerciseId: 'ex-peso-muerto', sets: 4, reps: 5, restTime: 180, order: 1 },
    { exerciseId: 'ex-fondos', sets: 4, reps: 8, restTime: 120, order: 2 },
    { exerciseId: 'ex-remo-mancuerna', sets: 4, reps: 10, restTime: 90, order: 3 },
    { exerciseId: 'ex-aperturas', sets: 3, reps: 12, restTime: 60, order: 4 },
    { exerciseId: 'ex-elevaciones-laterales', sets: 4, reps: 15, restTime: 60, order: 5 },
    { exerciseId: 'ex-curl-martillo', sets: 3, reps: 12, restTime: 60, order: 6 },
    { exerciseId: 'ex-fondos-triceps', sets: 3, reps: 12, restTime: 60, order: 7 },
    { exerciseId: 'ex-pajaros', sets: 3, reps: 15, restTime: 60, order: 8 },
  ]) {
    await prisma.workoutExercise.create({ data: { workoutId: upperB.id, ...ex } })
  }
  console.log('✅ Día 3 Upper B creado')

  // DÍA 4 — Lower B
  const lowerB = await prisma.workout.create({
    data: { name: 'Día 4 — Lower B (Isquiotibiales)', dayOfWeek: 5, workoutPlanId: plan.id }
  })
  for (const ex of [
    { exerciseId: 'ex-peso-muerto', sets: 4, reps: 5, restTime: 180, order: 1 },
    { exerciseId: 'ex-sentadilla-goblet', sets: 3, reps: 12, restTime: 90, order: 2 },
    { exerciseId: 'ex-hip-thrust', sets: 4, reps: 10, restTime: 90, order: 3 },
    { exerciseId: 'ex-zancadas', sets: 3, reps: 12, restTime: 90, order: 4 },
    { exerciseId: 'ex-gemelos', sets: 4, reps: 20, restTime: 60, order: 5 },
    { exerciseId: 'ex-rueda-ab', sets: 3, reps: 10, restTime: 60, order: 6 },
  ]) {
    await prisma.workoutExercise.create({ data: { workoutId: lowerB.id, ...ex } })
  }
  console.log('✅ Día 4 Lower B creado')

  console.log('🎉 Seeder completado correctamente')
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });