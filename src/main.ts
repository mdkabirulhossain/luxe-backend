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

  // Enable CORS globally to handle preflight OPTIONS requests for Authorized clients & Swagger
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Swagger UI, Postman, server-to-server)
      if (!origin) return callback(null, true);
      // Allow all origins (localhost:3000, localhost:5000, 127.0.0.1, etc.)
      return callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With', 'Origin'],
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

  const port = process.env.PORT || 5000;

  // Configure Swagger Options
  const config = new DocumentBuilder()
    .setTitle('Luxe E-Commerce API')
    .setDescription('The Luxe E-Commerce backend API description')
    .setVersion('1.0')
    .addServer(`http://localhost:${port}`, 'Local Development Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT-auth', // This name must match the @ApiBearerAuth() decorator name
    )
    .build();

  const customSwaggerJs = `
    (function() {
      const STORAGE_KEY = 'luxe_swagger_jwt_token';

      function applySavedToken() {
        try {
          const savedToken = localStorage.getItem(STORAGE_KEY);
          if (savedToken && window.ui && typeof window.ui.preauthorizeApiKey === 'function') {
            window.ui.preauthorizeApiKey('JWT-auth', savedToken);
          }
        } catch (e) {
          console.error('Failed to restore Swagger authorization token:', e);
        }
      }

      function attachListeners() {
        document.addEventListener('click', function(event) {
          const target = event.target;
          if (!target) return;

          // Save token when Authorize submit button is clicked
          if (target.classList && (target.classList.contains('auth') || target.classList.contains('authorize'))) {
            setTimeout(function() {
              const authInput = document.querySelector('.auth-container input[type="text"], .auth-container input[type="password"], .modal-ux input');
              if (authInput && authInput.value) {
                const tokenVal = authInput.value.trim();
                if (tokenVal) {
                  localStorage.setItem(STORAGE_KEY, tokenVal);
                }
              }
            }, 150);
          }

          // Clear token when Logout button is clicked
          if (target.textContent && target.textContent.trim().toLowerCase() === 'logout') {
            localStorage.removeItem(STORAGE_KEY);
          }
        });

        document.addEventListener('input', function(event) {
          const target = event.target;
          if (target && target.tagName === 'INPUT' && target.closest('.auth-container, .modal-ux')) {
            const val = target.value.trim();
            if (val) {
              localStorage.setItem(STORAGE_KEY, val);
            }
          }
        });
      }

      const interval = setInterval(function() {
        if (window.ui && typeof window.ui.preauthorizeApiKey === 'function') {
          clearInterval(interval);
          applySavedToken();
          attachListeners();
        }
      }, 100);
    })();
  `;

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customJsStr: customSwaggerJs,
  });

  await app.listen(port);
}

bootstrap();