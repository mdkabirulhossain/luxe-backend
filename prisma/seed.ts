/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import {
  PrismaClient,
  Role,
  OrderStatus,
  PaymentStatus,
  DiscountType,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

import { Pool } from 'pg';

// Manual .env loader to avoid dependency on the 'dotenv' module/types in typescript compilation
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf-8');
      envConfig.split(/\r?\n/).forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch (err) {
    console.warn('Could not manually read .env file, using default environments:', err);
  }
}

loadEnv();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting comprehensive database seed for Luxe E-Commerce...\n');

  // =========================================================================
  // 1. SEED USERS (Admin & Customers)
  // =========================================================================
  console.log('📦 [1/7] Seeding Users (Admin & Demo Customers)...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@yopmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
  const defaultCustomerPassword = await bcrypt.hash('CustomerPass123!', 10);

  // Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
      password: hashedAdminPassword,
      isEmailVerified: true,
      isActive: true,
    },
    create: {
      email: adminEmail,
      name: 'System Administrator',
      password: hashedAdminPassword,
      role: Role.ADMIN,
      phone: '+1 (555) 000-0001',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log(`  ✓ Admin user ready: ${adminUser.email}`);

  // Customer 1: Sophia Montgomery
  const customer1 = await prisma.user.upsert({
    where: { email: 'customer@yopmail.com' },
    update: {
      password: defaultCustomerPassword,
      isEmailVerified: true,
      isActive: true,
    },
    create: {
      email: 'customer@yopmail.com',
      name: 'Sophia Montgomery',
      password: defaultCustomerPassword,
      phone: '+1 (555) 234-5678',
      role: Role.CUSTOMER,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log(`  ✓ Demo customer 1 ready: ${customer1.email} (${customer1.name})`);

  // Customer 2: John Doe
  const customer2 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {
      password: defaultCustomerPassword,
      isEmailVerified: true,
      isActive: true,
    },
    create: {
      email: 'john.doe@example.com',
      name: 'John Doe',
      password: defaultCustomerPassword,
      phone: '+1 (555) 987-6543',
      role: Role.CUSTOMER,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log(`  ✓ Demo customer 2 ready: ${customer2.email} (${customer2.name})`);

  // =========================================================================
  // 2. SEED COUPONS
  // =========================================================================
  console.log('\n🎟️  [2/7] Seeding Promotional Coupons...');
  const couponsData = [
    {
      code: 'WELCOME10',
      description: '10% discount on entire cart for new customers',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      minOrderAmount: 50,
      maxDiscountAmount: 100,
      usageLimit: 1000,
      userLimit: 1,
      isActive: true,
    },
    {
      code: 'LUXE50',
      description: '$50 instant discount on orders over $250',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 50,
      minOrderAmount: 250,
      usageLimit: 500,
      userLimit: 1,
      isActive: true,
    },
    {
      code: 'VIP20',
      description: 'Exclusive 20% discount for Luxe VIP members',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      minOrderAmount: 150,
      maxDiscountAmount: 300,
      usageLimit: 200,
      userLimit: 2,
      isActive: true,
    },
  ];

  for (const coupon of couponsData) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: coupon,
      create: coupon,
    });
    console.log(`  ✓ Coupon: ${coupon.code} (${coupon.discountValue}${coupon.discountType === DiscountType.PERCENTAGE ? '%' : '$'} off)`);
  }

  // =========================================================================
  // 3. SEED CATEGORIES & SUBCATEGORIES
  // =========================================================================
  console.log('\n📂 [3/7] Seeding Categories & Subcategories...');

  // Parent: Men's Fashion
  const catMens = await prisma.category.upsert({
    where: { slug: 'mens-fashion' },
    update: { name: "Men's Fashion" },
    create: {
      name: "Men's Fashion",
      slug: 'mens-fashion',
      description: 'Sophisticated and modern luxury apparel tailored for gentlemen',
      image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80',
      isActive: true,
    },
  });

  const subCatMensJackets = await prisma.category.upsert({
    where: { slug: 'mens-jackets-outerwear' },
    update: { parentId: catMens.id },
    create: {
      name: 'Jackets & Outerwear',
      slug: 'mens-jackets-outerwear',
      description: 'Hand-stitched leather jackets, coats, and overcoats',
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
      parentId: catMens.id,
      isActive: true,
    },
  });

  const subCatMensSuits = await prisma.category.upsert({
    where: { slug: 'mens-suits-blazers' },
    update: { parentId: catMens.id },
    create: {
      name: 'Suits & Blazers',
      slug: 'mens-suits-blazers',
      description: 'Bespoke tailoring, slim-fit tuxedos, and Italian wool blazers',
      image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
      parentId: catMens.id,
      isActive: true,
    },
  });

  // Parent: Women's Luxury
  const catWomens = await prisma.category.upsert({
    where: { slug: 'womens-luxury' },
    update: { name: "Women's Luxury" },
    create: {
      name: "Women's Luxury",
      slug: 'womens-luxury',
      description: 'Haute couture dresses, chic silhouettes, and timeless designer essentials',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
      isActive: true,
    },
  });

  const subCatWomensDresses = await prisma.category.upsert({
    where: { slug: 'womens-dresses-gowns' },
    update: { parentId: catWomens.id },
    create: {
      name: 'Dresses & Gowns',
      slug: 'womens-dresses-gowns',
      description: 'Silk gowns, cocktail dresses, and red-carpet evening statements',
      image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80',
      parentId: catWomens.id,
      isActive: true,
    },
  });

  const subCatWomensBags = await prisma.category.upsert({
    where: { slug: 'womens-designer-handbags' },
    update: { parentId: catWomens.id },
    create: {
      name: 'Designer Handbags',
      slug: 'womens-designer-handbags',
      description: 'Iconic quilted calfskin totes, clutches, and crossbody bags',
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
      parentId: catWomens.id,
      isActive: true,
    },
  });

  // Parent: Timepieces & Watches
  const catWatches = await prisma.category.upsert({
    where: { slug: 'timepieces-watches' },
    update: { name: 'Timepieces & Watches' },
    create: {
      name: 'Timepieces & Watches',
      slug: 'timepieces-watches',
      description: 'Swiss-engineered chronographs and luxury automatic timepieces',
      image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
      isActive: true,
    },
  });

  const subCatChronographs = await prisma.category.upsert({
    where: { slug: 'watches-chronographs' },
    update: { parentId: catWatches.id },
    create: {
      name: 'Chronographs',
      slug: 'watches-chronographs',
      description: 'High-precision mechanical and tachymeter timepieces',
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
      parentId: catWatches.id,
      isActive: true,
    },
  });

  // Parent: Fine Accessories
  const catAccessories = await prisma.category.upsert({
    where: { slug: 'fine-accessories' },
    update: { name: 'Fine Accessories' },
    create: {
      name: 'Fine Accessories',
      slug: 'fine-accessories',
      description: 'Gold-accented eyewear, full-grain leather belts, and jewelry',
      image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
      isActive: true,
    },
  });

  const subCatSunglasses = await prisma.category.upsert({
    where: { slug: 'accessories-sunglasses' },
    update: { parentId: catAccessories.id },
    create: {
      name: 'Designer Sunglasses',
      slug: 'accessories-sunglasses',
      description: 'UV400 polarized aviators and gold-frame shades',
      image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
      parentId: catAccessories.id,
      isActive: true,
    },
  });

  const subCatBelts = await prisma.category.upsert({
    where: { slug: 'accessories-belts-wallets' },
    update: { parentId: catAccessories.id },
    create: {
      name: 'Belts & Small Leather Goods',
      slug: 'accessories-belts-wallets',
      description: 'Reversible full-grain leather belts and RFID cardholders',
      image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=800&q=80',
      parentId: catAccessories.id,
      isActive: true,
    },
  });

  console.log('  ✓ Main and sub-categories successfully created.');

  // =========================================================================
  // 4. SEED PRODUCTS (Aligned with Product Module & DTOs)
  // =========================================================================
  console.log('\n🛍️  [4/7] Seeding Curated Luxury Products...');

  const productsData = [
    {
      name: 'Classic Italian Leather Biker Jacket',
      sku: 'LX-MJK-001',
      slug: 'classic-italian-leather-biker-jacket',
      description:
        'Engineered from 100% genuine Italian full-grain lambskin with heavy-duty silver hardware, asymmetrical zipper closure, and quilted lining.',
      price: 349.99,
      originalPrice: 449.99,
      discount: 22,
      images: [
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&w=800&q=80',
      ],
      stock: 35,
      inStock: true,
      isActive: true,
      isBestSeller: true,
      isHot: true,
      isNew: false,
      colors: ['Midnight Black', 'Cognac Brown'],
      colorVariants: [
        {
          id: 'v-blk',
          name: 'Midnight Black',
          hex: '#111827',
          colorClass: 'bg-zinc-900',
          image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 'v-cog',
          name: 'Cognac Brown',
          hex: '#78350f',
          colorClass: 'bg-amber-900',
          image: 'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&w=800&q=80',
        },
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      rating: 4.8,
      reviewsCount: 14,
      categoryId: catMens.id,
      subCategoryId: subCatMensJackets.id,
    },
    {
      name: 'Tailored Wool Slim-Fit Tuxedo Blazer',
      sku: 'LX-MSU-002',
      slug: 'tailored-wool-slim-fit-tuxedo-blazer',
      description:
        'Crafted from Super 130s Merino wool with silk satin peak lapels. Designed for gala events, black-tie celebrations, and red carpet appearances.',
      price: 499.0,
      originalPrice: 599.0,
      discount: 17,
      images: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
      ],
      stock: 20,
      inStock: true,
      isActive: true,
      isBestSeller: true,
      isHot: false,
      isNew: true,
      colors: ['Navy Blue', 'Charcoal Grey', 'Jet Black'],
      colorVariants: [
        {
          id: 'v-navy',
          name: 'Navy Blue',
          hex: '#1e3a8a',
          colorClass: 'bg-blue-900',
          image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 'v-charcoal',
          name: 'Charcoal Grey',
          hex: '#374151',
          colorClass: 'bg-gray-700',
          image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
        },
      ],
      sizes: ['38R', '40R', '42R', '44R'],
      rating: 4.9,
      reviewsCount: 8,
      categoryId: catMens.id,
      subCategoryId: subCatMensSuits.id,
    },
    {
      name: 'Silk Velvet Evening Gala Dress',
      sku: 'LX-WDR-003',
      slug: 'silk-velvet-evening-gala-dress',
      description:
        'Sumptuous deep-pile silk velvet with a draped cowl neckline, side thigh-high slit, and floor-sweeping train.',
      price: 580.0,
      originalPrice: 720.0,
      discount: 19,
      images: [
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80',
      ],
      stock: 15,
      inStock: true,
      isActive: true,
      isBestSeller: true,
      isHot: true,
      isNew: false,
      colors: ['Emerald Green', 'Royal Burgundy'],
      colorVariants: [
        {
          id: 'v-emerald',
          name: 'Emerald Green',
          hex: '#064e3b',
          colorClass: 'bg-emerald-900',
          image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 'v-burgundy',
          name: 'Royal Burgundy',
          hex: '#831843',
          colorClass: 'bg-pink-900',
          image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80',
        },
      ],
      sizes: ['XS', 'S', 'M', 'L'],
      rating: 5.0,
      reviewsCount: 12,
      categoryId: catWomens.id,
      subCategoryId: subCatWomensDresses.id,
    },
    {
      name: 'Monogram Quilted Calfskin Shoulder Bag',
      sku: 'LX-WBG-004',
      slug: 'monogram-quilted-calfskin-shoulder-bag',
      description:
        'Chevron quilted calf leather featuring brushed 24k gold-plated monogram clasp, dual chain shoulder strap, and suede-lined compartments.',
      price: 850.0,
      originalPrice: 990.0,
      discount: 14,
      images: [
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80',
      ],
      stock: 18,
      inStock: true,
      isActive: true,
      isBestSeller: true,
      isHot: false,
      isNew: true,
      colors: ['Classic Black', 'Caramel Gold'],
      colorVariants: [
        {
          id: 'v-noir',
          name: 'Classic Black',
          hex: '#18181b',
          colorClass: 'bg-zinc-900',
          image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 'v-caramel',
          name: 'Caramel Gold',
          hex: '#d97706',
          colorClass: 'bg-amber-600',
          image: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80',
        },
      ],
      sizes: ['One Size'],
      rating: 4.9,
      reviewsCount: 22,
      categoryId: catWomens.id,
      subCategoryId: subCatWomensBags.id,
    },
    {
      name: 'AeroMaster Automatic Chronograph 42mm',
      sku: 'LX-WCH-005',
      slug: 'aeromaster-automatic-chronograph-42mm',
      description:
        'Swiss automatic movement with 48-hour power reserve, scratch-resistant sapphire crystal, 100m water resistance, and hand-stitched alligator strap.',
      price: 1250.0,
      originalPrice: 1450.0,
      discount: 14,
      images: [
        'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
      ],
      stock: 12,
      inStock: true,
      isActive: true,
      isBestSeller: true,
      isHot: true,
      isNew: false,
      colors: ['Silver Sunburst', 'Rose Gold'],
      colorVariants: [
        {
          id: 'v-silver',
          name: 'Silver Sunburst',
          hex: '#e2e8f0',
          colorClass: 'bg-slate-200',
          image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 'v-rosegold',
          name: 'Rose Gold',
          hex: '#fb7185',
          colorClass: 'bg-rose-400',
          image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
        },
      ],
      sizes: ['42mm'],
      rating: 4.95,
      reviewsCount: 19,
      categoryId: catWatches.id,
      subCategoryId: subCatChronographs.id,
    },
    {
      name: 'Heritage Aviator Gold-Tone Sunglasses',
      sku: 'LX-SNG-006',
      slug: 'heritage-aviator-gold-tone-sunglasses',
      description:
        'Handcrafted in Japan with lightweight aerospace-grade titanium frame, 18k gold plating, and Category 3 anti-reflective polarized green lenses.',
      price: 195.0,
      originalPrice: 240.0,
      discount: 19,
      images: [
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
      ],
      stock: 40,
      inStock: true,
      isActive: true,
      isBestSeller: false,
      isHot: false,
      isNew: true,
      colors: ['Gold / Green Lens', 'Silver / Polarized Grey'],
      colorVariants: [
        {
          id: 'v-gold-green',
          name: 'Gold / Green Lens',
          hex: '#eab308',
          colorClass: 'bg-yellow-500',
          image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
        },
      ],
      sizes: ['Standard'],
      rating: 4.7,
      reviewsCount: 9,
      categoryId: catAccessories.id,
      subCategoryId: subCatSunglasses.id,
    },
    {
      name: 'Reversible Full-Grain Leather Dress Belt',
      sku: 'LX-BLT-007',
      slug: 'reversible-full-grain-leather-dress-belt',
      description:
        'Dual-sided vegetable-tanned French calfskin leather with a rotating solid brass buckle in brushed palladium. Switch effortlessly between black and dark chestnut.',
      price: 140.0,
      originalPrice: 175.0,
      discount: 20,
      images: [
        'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=800&q=80',
      ],
      stock: 50,
      inStock: true,
      isActive: true,
      isBestSeller: false,
      isHot: false,
      isNew: true,
      colors: ['Black / Dark Brown'],
      sizes: ['32', '34', '36', '38', '40'],
      rating: 4.6,
      reviewsCount: 5,
      categoryId: catAccessories.id,
      subCategoryId: subCatBelts.id,
    },
  ];

  const seededProducts: any[] = [];
  for (const prodData of productsData) {
    const product = await prisma.product.upsert({
      where: { slug: prodData.slug },
      update: {
        ...prodData,
        colorVariants: prodData.colorVariants as any,
      },
      create: {
        ...prodData,
        colorVariants: prodData.colorVariants as any,
      },
    });
    seededProducts.push(product);
    console.log(`  ✓ Product: [${product.sku}] ${product.name} ($${product.price})`);
  }

  // =========================================================================
  // 5. SEED REVIEWS
  // =========================================================================
  console.log('\n⭐ [5/7] Seeding Product Customer Reviews...');
  const jacketProduct = seededProducts.find((p) => p.sku === 'LX-MJK-001');
  const bagProduct = seededProducts.find((p) => p.sku === 'LX-WBG-004');
  const watchProduct = seededProducts.find((p) => p.sku === 'LX-WCH-005');

  if (jacketProduct) {
    await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: customer1.id,
          productId: jacketProduct.id,
        },
      },
      update: {
        rating: 5,
        comment: 'Exceptional craftsmanship. The leather is soft, durable, and smells divine.',
      },
      create: {
        userId: customer1.id,
        productId: jacketProduct.id,
        rating: 5,
        comment: 'Exceptional craftsmanship. The leather is soft, durable, and smells divine.',
      },
    });

    await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: customer2.id,
          productId: jacketProduct.id,
        },
      },
      update: {
        rating: 4,
        comment: 'Great jacket, fits true to size. Sleeve length was perfect for tall stature.',
      },
      create: {
        userId: customer2.id,
        productId: jacketProduct.id,
        rating: 4,
        comment: 'Great jacket, fits true to size. Sleeve length was perfect for tall stature.',
      },
    });
    console.log(`  ✓ Reviews seeded for: ${jacketProduct.name}`);
  }

  if (bagProduct) {
    await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: customer1.id,
          productId: bagProduct.id,
        },
      },
      update: {
        rating: 5,
        comment: 'Absolute showstopper! The 24k gold hardware is gorgeous and the calfskin is pristine.',
      },
      create: {
        userId: customer1.id,
        productId: bagProduct.id,
        rating: 5,
        comment: 'Absolute showstopper! The 24k gold hardware is gorgeous and the calfskin is pristine.',
      },
    });
    console.log(`  ✓ Review seeded for: ${bagProduct.name}`);
  }

  // =========================================================================
  // 6. SEED ORDERS & PAYMENTS (Aligned with Order Module & DTOs)
  // =========================================================================
  console.log('\n📦 [6/7] Seeding Sample Orders & Payments (Order Module aligned)...');

  // Order 1: DELIVERED Order for Sophia Montgomery
  const order1ShippingAddress = {
    fullName: 'Sophia Montgomery',
    phone: '+1 (555) 234-5678',
    email: 'customer@yopmail.com',
    street: '742 Evergreen Terrace',
    city: 'Beverly Hills',
    state: 'California',
    country: 'United States',
    postalCode: '90210',
  };

  const aviatorProduct = seededProducts.find((p) => p.sku === 'LX-SNG-006');

  // Check if Order 1 already exists by user and specific total
  const existingOrder1 = await prisma.order.findFirst({
    where: {
      userId: customer1.id,
      status: OrderStatus.DELIVERED,
    },
    include: { items: true, payment: true },
  });

  if (!existingOrder1 && jacketProduct && aviatorProduct) {
    const item1Price = jacketProduct.price; // 349.99
    const item2Price = aviatorProduct.price; // 195.00
    const subtotal = item1Price + item2Price; // 544.99
    const discountAmount = 54.5; // 10% coupon discount
    const totalAmount = Number((subtotal - discountAmount).toFixed(2)); // 490.49

    const createdOrder1 = await prisma.order.create({
      data: {
        userId: customer1.id,
        status: OrderStatus.DELIVERED,
        couponCode: 'WELCOME10',
        discountAmount,
        totalAmount,
        shippingAddress: order1ShippingAddress,
        items: {
          create: [
            {
              productId: jacketProduct.id,
              quantity: 1,
              price: item1Price,
              selectedColor: 'Midnight Black',
              selectedSize: 'L',
            },
            {
              productId: aviatorProduct.id,
              quantity: 1,
              price: item2Price,
              selectedColor: 'Gold / Green Lens',
              selectedSize: 'Standard',
            },
          ],
        },
        payment: {
          create: {
            userId: customer1.id,
            amount: totalAmount,
            currency: 'usd',
            status: PaymentStatus.COMPLETED,
            paymentMethod: 'stripe',
            stripePaymentIntentId: 'pi_seed_delivered_001',
            receiptUrl: 'https://pay.stripe.com/receipts/seed_delivered_001',
          },
        },
      },
    });
    console.log(`  ✓ Order #1 created: ID ${createdOrder1.id} [DELIVERED] ($${totalAmount})`);
  } else {
    console.log('  ✓ Order #1 (DELIVERED) already exists or products not found, skipping creation.');
  }

  // Order 2: PROCESSING Order for Sophia Montgomery
  const existingOrder2 = await prisma.order.findFirst({
    where: {
      userId: customer1.id,
      status: OrderStatus.PROCESSING,
    },
  });

  if (!existingOrder2 && bagProduct) {
    const bagPrice = bagProduct.price; // 850.00
    const createdOrder2 = await prisma.order.create({
      data: {
        userId: customer1.id,
        status: OrderStatus.PROCESSING,
        discountAmount: 0,
        totalAmount: bagPrice,
        shippingAddress: order1ShippingAddress,
        items: {
          create: [
            {
              productId: bagProduct.id,
              quantity: 1,
              price: bagPrice,
              selectedColor: 'Classic Black',
              selectedSize: 'One Size',
            },
          ],
        },
        payment: {
          create: {
            userId: customer1.id,
            amount: bagPrice,
            currency: 'usd',
            status: PaymentStatus.COMPLETED,
            paymentMethod: 'stripe',
            stripePaymentIntentId: 'pi_seed_processing_002',
          },
        },
      },
    });
    console.log(`  ✓ Order #2 created: ID ${createdOrder2.id} [PROCESSING] ($${bagPrice})`);
  } else {
    console.log('  ✓ Order #2 (PROCESSING) already exists, skipping creation.');
  }

  // Order 3: PENDING Order for John Doe
  const existingOrder3 = await prisma.order.findFirst({
    where: {
      userId: customer2.id,
      status: OrderStatus.PENDING,
    },
  });

  const tuxedoProduct = seededProducts.find((p) => p.sku === 'LX-MSU-002');
  if (!existingOrder3 && tuxedoProduct) {
    const tuxPrice = tuxedoProduct.price; // 499.00
    const order3ShippingAddress = {
      fullName: 'John Doe',
      phone: '+1 (555) 987-6543',
      email: 'john.doe@example.com',
      street: '456 Madison Avenue',
      city: 'New York',
      state: 'NY',
      country: 'United States',
      postalCode: '10022',
    };

    const createdOrder3 = await prisma.order.create({
      data: {
        userId: customer2.id,
        status: OrderStatus.PENDING,
        discountAmount: 0,
        totalAmount: tuxPrice,
        shippingAddress: order3ShippingAddress,
        items: {
          create: [
            {
              productId: tuxedoProduct.id,
              quantity: 1,
              price: tuxPrice,
              selectedColor: 'Navy Blue',
              selectedSize: '40R',
            },
          ],
        },
        payment: {
          create: {
            userId: customer2.id,
            amount: tuxPrice,
            currency: 'usd',
            status: PaymentStatus.PENDING,
            paymentMethod: 'COD',
          },
        },
      },
    });
    console.log(`  ✓ Order #3 created: ID ${createdOrder3.id} [PENDING - COD] ($${tuxPrice})`);
  } else {
    console.log('  ✓ Order #3 (PENDING) already exists, skipping creation.');
  }

  // =========================================================================
  // 7. SEED CART & WISHLIST FOR DEMO CUSTOMER
  // =========================================================================
  console.log('\n🛒 [7/7] Seeding Demo Cart & Wishlist...');
  if (watchProduct) {
    const userCart = await prisma.cart.upsert({
      where: { userId: customer1.id },
      update: {},
      create: { userId: customer1.id },
    });

    await prisma.cartItem.upsert({
      where: {
        cartId_productId_selectedColor_selectedSize: {
          cartId: userCart.id,
          productId: watchProduct.id,
          selectedColor: 'Rose Gold',
          selectedSize: '42mm',
        },
      },
      update: { quantity: 1 },
      create: {
        cartId: userCart.id,
        productId: watchProduct.id,
        quantity: 1,
        selectedColor: 'Rose Gold',
        selectedSize: '42mm',
      },
    });
    console.log(`  ✓ Cart item seeded: ${watchProduct.name} (Rose Gold, 42mm)`);
  }

  const dressProduct = seededProducts.find((p) => p.sku === 'LX-WDR-003');
  if (dressProduct) {
    const userWishlist = await prisma.wishlist.upsert({
      where: { userId: customer1.id },
      update: {},
      create: { userId: customer1.id },
    });

    await prisma.wishlistItem.upsert({
      where: {
        wishlistId_productId: {
          wishlistId: userWishlist.id,
          productId: dressProduct.id,
        },
      },
      update: {},
      create: {
        wishlistId: userWishlist.id,
        productId: dressProduct.id,
      },
    });
    console.log(`  ✓ Wishlist item seeded: ${dressProduct.name}`);
  }

  console.log('\n🎉 ==========================================');
  console.log('✨ All Luxe seed data successfully populated!');
  console.log('============================================\n');
  console.log('🔑 Credentials Summary:');
  console.log(`  Admin:    ${adminEmail} / ${adminPassword}`);
  console.log(`  Customer: customer@yopmail.com / CustomerPass123!`);
  console.log(`  Customer: john.doe@example.com / CustomerPass123!\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
