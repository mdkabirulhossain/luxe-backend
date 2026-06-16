/* eslint-disable prettier/prettier */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

// Manual .env loader to avoid dependency on the 'dotenv' module/types in typescript compilation
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf-8');
      envConfig.split(/\r?\n/).forEach((line) => {
        // Match line of format KEY=VALUE (ignoring comments)
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          
          // Remove wrapping quotes if present
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
          }
          
          process.env[key] = value;
        }
      });
    }
  } catch (err) {
    console.warn('Could not manually read .env file, using default environments:', err);
  }
}

// Load env variables
loadEnv();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@luxe.com';
  const password = process.env.ADMIN_PASSWORD || 'AdminPass123!';

  console.log(`Checking for existing Admin account: "${email}"...`);

  // Check if an admin user already exists anywhere in the database
  const adminExists = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (adminExists) {
    console.log(`An Admin already exists in the database (ID: ${adminExists.id}, Email: ${adminExists.email}).`);
    console.log('Skipping seed to prevent overwriting.');
    return;
  }

  // Check if a user with the specified admin email already exists (even if currently a CUSTOMER)
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email },
  });

  const hashedPassword = await bcrypt.hash(password, 10);

  if (existingUserByEmail) {
    console.log(`User with email "${email}" already exists with role "${existingUserByEmail.role}". Promoting to ADMIN...`);
    await prisma.user.update({
      where: { id: existingUserByEmail.id },
      data: {
        role: 'ADMIN',
        password: hashedPassword, // Reset/set password to seed password
        isEmailVerified: true,
        isActive: true,
      },
    });
    console.log('User promoted to ADMIN successfully.');
  } else {
    console.log(`No Admin user found. Creating new Admin user: "${email}"...`);
    const newAdmin = await prisma.user.create({
      data: {
        email,
        name: 'Administrator',
        password: hashedPassword,
        role: 'ADMIN',
        isEmailVerified: true,
        isActive: true,
      },
    });
    console.log(`Admin user created successfully (ID: ${newAdmin.id}).`);
  }
}

main()
  .catch((e) => {
    console.error('Error during Admin seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
