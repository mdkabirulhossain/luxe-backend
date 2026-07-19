/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BadRequestException, ValidationPipe, ValidationError } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable CORS globally to handle preflight OPTIONS requests for Authorized clients
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable Validation Pipes Globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const formatErrors = (validationErrors: ValidationError[]): Array<{ field: string; errors: string[] }> => {
          const result: Array<{ field: string; errors: string[] }> = [];
          const traverse = (error: ValidationError, prefix = '') => {
            const field = prefix ? `${prefix}.${error.property}` : error.property;
            if (error.constraints) {
              result.push({
                field,
                errors: Object.values(error.constraints),
              });
            }
            if (error.children && error.children.length > 0) {
              error.children.forEach((child) => traverse(child, field));
            }
          };
          validationErrors.forEach((err) => traverse(err));
          return result;
        };

        return new BadRequestException({
          message: 'Validation failed',
          errors: formatErrors(errors),
        });
      },
    }),
  );

  // Configure Swagger Options
  const config = new DocumentBuilder()
    .setTitle('Luxe E-Commerce API')
    .setDescription('The Luxe E-Commerce backend API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name must match the @ApiBearerAuth() decorator name
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();