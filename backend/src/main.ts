import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Detrás del proxy de la plataforma: la IP real del cliente viene en X-Forwarded-For
  // (la usa el límite de peticiones; sin esto, todos compartirían la IP del proxy).
  app.set('trust proxy', 1);

  // Cabeceras de seguridad. CSP desactivada: la API devuelve JSON y Swagger UI usa scripts en línea.
  // Cross-origin en recursos: el frontend (otro dominio) carga las fotos de /uploads.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Habilita validación automática con los DTOs
  app.useGlobalPipes(new ValidationPipe({ 
  whitelist: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  }));

  // Habilita CORS para el frontend
  app.enableCors({ origin: 'http://localhost:5173' });

  // Configura Swagger
  const config = new DocumentBuilder()
    .setTitle('FitTrack Pro API')
    .setDescription('API REST para la plataforma FitTrack Pro')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);
  console.log(`🚀 Backend corriendo en http://localhost:3000`);
  console.log(`📚 Swagger docs en http://localhost:3000/api/docs`);
}
bootstrap();