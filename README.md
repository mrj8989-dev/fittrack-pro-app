# FitTrack Pro 🏋️

> Plataforma SaaS fullstack de gestión de entrenamientos personales

![Estado](https://img.shields.io/badge/estado-en%20desarrollo-yellow)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20NestJS%20%7C%20PostgreSQL-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 📋 Descripción

FitTrack Pro es una plataforma SaaS fullstack para gestión de entrenamientos personales. Registra sesiones en tiempo real, sigue récords personales, controla tu evolución física con revisiones corporales y visualiza tu progreso con gráficas. Diseñada para uso real, no como demo.

## ⚡ Arranque rápido (uso diario)

```bash
# Terminal 1 — Base de datos
docker-compose up -d postgres

# Terminal 2 — Backend
cd backend && npm run start:dev

# Terminal 3 — Frontend
cd frontend && npm run dev

# Terminal 4 — Prisma Studio (opcional)
cd backend && node_modules/.bin/prisma studio
```

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Landing | http://localhost:5173/landing |
| Backend | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs |
| Prisma Studio | http://localhost:5555 |

## 🚀 Stack Tecnológico

**Frontend**
- React 19 + TypeScript
- Tailwind CSS
- React Query (TanStack)
- React Hook Form + Zod
- Recharts

**Backend**
- NestJS + TypeScript
- PostgreSQL + Prisma ORM v5
- JWT Authentication + Guards
- Swagger / OpenAPI
- Multer (gestión de fotos)

**DevOps**
- Docker + docker-compose
- GitHub Actions CI/CD
- Deploy en Railway (próximamente)

## ✅ Features implementadas

**Backend**
- [x] Autenticación completa: registro, login, JWT
- [x] Roles de usuario: ADMIN, TRAINER, CLIENT
- [x] Planes de suscripción: FREE, PRO, PREMIUM
- [x] Validación automática de DTOs con class-validator
- [x] Documentación Swagger en `/api/docs`
- [x] JWT Guard — rutas protegidas por token
- [x] CRUD completo de ejercicios con filtros por músculo y equipamiento
- [x] Módulo de planes de entrenamiento
- [x] Módulo de workouts con gestión de ejercicios (series, reps, descanso)
- [x] Registro de sesiones de entrenamiento en tiempo real
- [x] Registro de series con peso y repeticiones
- [x] Historial de sesiones ordenado por fecha
- [x] Progreso por ejercicio a lo largo del tiempo
- [x] Récords personales por ejercicio
- [x] Revisiones corporales con fotos (frontal, espalda, lateral)
- [x] Tracking de peso, medidas y % grasa corporal
- [x] Intervalo de revisiones parametrizable (7-28 días)
- [x] Recordatorio de próxima revisión con cuenta atrás
- [x] Seeder con 24 ejercicios reales con vídeos de referencia
- [x] Rutina Upper/Lower de hipertrofia real (4 días)
- [x] Subida real de fotos en revisiones corporales (servidas vía `/uploads`)
- [x] Sistema de roles con `@Roles` + `RolesGuard`
- [x] Gestión de clientes por entrenador (asignar/desasignar por email)
- [x] Entrenador puede crear y editar planes/días/ejercicios de sus clientes
- [x] Reordenar ejercicios de un día (drag & drop) con endpoint dedicado
- [x] Entrenador puede consultar el historial de sesiones y récords reales de sus clientes
- [x] Chat entrenador ↔ cliente (mensajes con sondeo periódico, no leídos)
- [x] Foto de perfil (subida propia, disponible para los 3 roles)

**Frontend**
- [x] Landing page con hero, features y preview del dashboard
- [x] Login con imagen de fondo y efecto cristal (glassmorphism)
- [x] Sidebar responsive con navegación completa
- [x] Modo oscuro / claro con toggle
- [x] Sistema de color accent personalizable (Verde, Azul, Morado, Cian, Naranja)
- [x] Contexto de autenticación con JWT
- [x] Rutas protegidas
- [x] Dashboard con métricas reales, gráficas de volumen y peso corporal
- [x] Récords personales con barras de progreso
- [x] Página de entrenamiento con selección de workout
- [x] Registro de series en tiempo real con peso y reps
- [x] Cronómetro de descanso parametrizable por ejercicio
- [x] Barra de progreso de sesión
- [x] Pantalla de sesión completada
- [x] Enlace a vídeo de referencia por ejercicio
- [x] Página de progreso con gráficas por ejercicio
- [x] Récords personales agrupados por grupo muscular
- [x] Página de revisiones corporales con historial
- [x] Gráfica de evolución de peso
- [x] Lightbox para ver fotos de revisiones
- [x] Página de ajustes con selector de color accent
- [x] Toggle modo oscuro/claro desde ajustes
- [x] Panel de entrenador: gestión de clientes, planes con drag & drop, historial/récords y chat
- [x] Página de catálogo de ejercicios (filtros, vídeo, gestión para trainer/admin)
- [x] Chat con avatares, agrupado de mensajes consecutivos y separadores de fecha (estilo WhatsApp)
- [x] Foto de perfil en Ajustes, Sidebar, lista de clientes y chat
- [x] Badge de mensajes sin leer en el Sidebar

## 🔜 Próximamente

- [ ] Panel de ADMIN: gestión de clientes y sus suscripciones (FREE vs PRO — PRO incluye entrenador asignado y revisiones corporales)
- [ ] Panel de ADMIN: gestión de entrenadores y qué cliente lleva cada uno
- [ ] Página **"Mis planes"** (`/planes`) — el cliente ve el plan de entrenamiento que tiene asignado (solo rol CLIENT)
- [ ] Página de **récords** rediseñada centrada en el progreso máximo del propio cliente (solo CLIENT — no tiene sentido para TRAINER/ADMIN)
- [ ] Revisar navegación por rol: cada rol debe ver solo lo suyo. El panel de entrenador debe limitarse a gestionar clientes y ejercicios — sin acceso a Entrenar, Progreso, Revisiones, Récords ni Mis planes (eso es personal de cada CLIENT)
- [ ] CI/CD con GitHub Actions
- [ ] Deploy en producción

## 🌱 Seeder

```bash
cd backend
npm run seed
```

El seeder usa `upsert` — seguro ejecutarlo múltiples veces. Para añadir ejercicios o planes, edita `prisma/seed.ts` y vuelve a ejecutarlo.

**Datos incluidos:**
- 24 ejercicios con descripción técnica y vídeo de referencia en español
- Plan Upper/Lower de hipertrofia de 4 días para casa (barra + mancuernas)
- Usuario: `jaime@fittrack.com` / `123456`

## 🛠️ Instalación desde cero

### Requisitos
- Node.js 20+
- Docker Desktop

```bash
# Clonar el repositorio
git clone https://github.com/TU_USUARIO/fittrack-pro.git
cd fittrack-pro

# Levantar PostgreSQL
docker-compose up -d postgres

# Backend
cd backend
npm install
npx prisma migrate dev
npm run seed
npm run start:dev

# Frontend (nueva terminal)
cd frontend
npm install
npm run dev
```

## 📁 Estructura del proyecto

fittrack-pro/
├── frontend/                  # React + TypeScript + Tailwind
│   └── src/
│       ├── context/           # Auth y Theme contexts
│       ├── components/layout/ # Sidebar y Layout responsive
│       ├── pages/             # Landing, Login, Dashboard, Workout...
│       ├── hooks/             # Custom hooks (useQuery + useMutation)
│       └── lib/               # Axios config con interceptores JWT
├── backend/                   # NestJS + Prisma + PostgreSQL
│   ├── src/
│   │   ├── auth/              # JWT + Guards + Decoradores
│   │   ├── users/             # Gestión de usuarios
│   │   ├── exercises/         # CRUD ejercicios con filtros
│   │   ├── workout-plans/     # Planes de entrenamiento
│   │   ├── workouts/          # Workouts con ejercicios
│   │   ├── workout-sessions/  # Sesiones, series y récords
│   │   ├── body-revisions/    # Revisiones corporales con fotos
│   │   ├── messages/          # Chat entrenador-cliente
│   │   └── prisma/            # Servicio de base de datos
│   ├── prisma/
│   │   ├── schema.prisma      # Esquema de base de datos
│   │   ├── seed.ts            # Seeder con datos reales
│   │   └── migrations/        # Historial de migraciones
│   └── public/uploads/        # Fotos de revisiones corporales y avatares de perfil
├── docker-compose.yml
└── README.md


**Jaime Herrero Hernández** — Full Stack Developer  
[LinkedIn](https://www.linkedin.com/in/jaime-herrero-hernandez) · [GitHub](https://github.com/mrj8989-dev)