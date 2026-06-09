import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
const app = await NestFactory.create(AppModule);

// Enable Validation Pipes Globally
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
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