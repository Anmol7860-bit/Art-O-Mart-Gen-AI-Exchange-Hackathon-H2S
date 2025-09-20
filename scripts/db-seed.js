#!/usr/bin/env node

/**
 * Database Seed Script
 * 
 * This script populates the database with comprehensive test/mock data:
 * - Creates realistic user profiles (customers, artisans, admins)
 * - Generates product categories and artisan profiles
 * - Creates diverse product catalog with proper relationships
 * - Adds sample orders, reviews, and other transactional data
 * - Ensures referential integrity and realistic data distribution
 * 
 * Usage: npm run db:seed
 * Environment: Requires SUPABASE_URL and SUPABASE_SERVICE_KEY (admin access)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// Validate environment
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error(chalk.red('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required'));
  console.error(chalk.gray('💡 Service key is required for seeding data (admin operations)'));
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Utility function to generate random data
 */
const random = {
  choice: (arr) => arr[Math.floor(Math.random() * arr.length)],
  number: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  price: (min = 10, max = 500) => Math.round((Math.random() * (max - min) + min) * 100) / 100,
  boolean: (probability = 0.5) => Math.random() < probability,
  date: (daysAgo = 365) => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    return date.toISOString();
  }
};

/**
 * Sample data definitions
 */
const sampleData = {
  categories: [
    { name: 'Pottery & Ceramics', slug: 'pottery-ceramics', description: 'Handcrafted pottery, vases, bowls, and ceramic art pieces' },
    { name: 'Textiles & Fabrics', slug: 'textiles-fabrics', description: 'Traditional weaving, embroidery, quilts, and fabric art' },
    { name: 'Jewelry & Accessories', slug: 'jewelry-accessories', description: 'Handmade jewelry, beaded work, and fashion accessories' },
    { name: 'Wood & Bamboo Crafts', slug: 'wood-bamboo', description: 'Carved wooden items, bamboo crafts, and furniture' },
    { name: 'Metal & Stone Work', slug: 'metal-stone', description: 'Metalwork, stone carving, and sculptural pieces' },
    { name: 'Paintings & Artwork', slug: 'paintings-artwork', description: 'Traditional and contemporary paintings and visual art' },
    { name: 'Leather & Hide Work', slug: 'leather-hide', description: 'Leather goods, bags, and traditional hide work' },
    { name: 'Glass & Crystal', slug: 'glass-crystal', description: 'Blown glass, crystal work, and decorative glass items' }
  ],

  firstNames: ['Aarav', 'Ananya', 'Arjun', 'Diya', 'Ishaan', 'Kavya', 'Rohan', 'Siya', 'Vihaan', 'Zara', 'Maya', 'Kiran', 'Raj', 'Priya', 'Dev', 'Rhea'],
  lastNames: ['Sharma', 'Patel', 'Singh', 'Kumar', 'Agarwal', 'Gupta', 'Joshi', 'Mehta', 'Shah', 'Reddy', 'Iyer', 'Nair', 'Bansal', 'Malhotra', 'Chopra', 'Verma'],

  cities: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal', 'Visakhapatnam', 'Patna'],

  specializations: {
    'pottery-ceramics': ['Traditional Pottery', 'Ceramic Tiles', 'Decorative Vases', 'Dinnerware', 'Sculptural Ceramics'],
    'textiles-fabrics': ['Block Printing', 'Hand Weaving', 'Embroidery', 'Quilting', 'Tie-Dye', 'Silk Work'],
    'jewelry-accessories': ['Silver Jewelry', 'Beaded Work', 'Traditional Ornaments', 'Fashion Jewelry', 'Gemstone Setting'],
    'wood-bamboo': ['Wood Carving', 'Bamboo Crafts', 'Furniture Making', 'Decorative Items', 'Utility Items'],
    'metal-stone': ['Metalwork', 'Stone Carving', 'Brass Work', 'Copper Crafts', 'Sculptural Work'],
    'paintings-artwork': ['Watercolor', 'Oil Painting', 'Folk Art', 'Modern Art', 'Portrait Work'],
    'leather-hide': ['Leather Bags', 'Footwear', 'Accessories', 'Traditional Work', 'Modern Designs'],
    'glass-crystal': ['Blown Glass', 'Stained Glass', 'Crystal Work', 'Decorative Glass', 'Functional Glass']
  },

  productAdjectives: ['Beautiful', 'Elegant', 'Traditional', 'Handcrafted', 'Artistic', 'Unique', 'Vintage', 'Modern', 'Classic', 'Exquisite'],
  productNouns: ['Collection', 'Design', 'Creation', 'Masterpiece', 'Work', 'Piece', 'Art', 'Craft']
};

/**
 * Create sample user profiles
 */
async function seedUsers() {
  console.log(chalk.blue('👥 Creating user profiles...'));

  const users = [];

  // Create admin user
  users.push({
    id: 'admin-user-' + Date.now(),
    email: 'admin@artomart.com',
    full_name: 'Admin User',
    role: 'admin',
    phone_number: '+919876543210',
    created_at: random.date(30)
  });

  // Create artisan users
  for (let i = 0; i < 8; i++) {
    const firstName = random.choice(sampleData.firstNames);
    const lastName = random.choice(sampleData.lastNames);
    users.push({
      id: `artisan-${i}-${Date.now()}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      full_name: `${firstName} ${lastName}`,
      role: 'artisan',
      phone_number: `+91${random.number(7000000000, 9999999999)}`,
      created_at: random.date(180)
    });
  }

  // Create customer users
  for (let i = 0; i < 15; i++) {
    const firstName = random.choice(sampleData.firstNames);
    const lastName = random.choice(sampleData.lastNames);
    users.push({
      id: `customer-${i}-${Date.now()}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`,
      full_name: `${firstName} ${lastName}`,
      role: 'customer',
      phone_number: random.boolean(0.7) ? `+91${random.number(7000000000, 9999999999)}` : null,
      created_at: random.date(365)
    });
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .insert(users)
    .select();

  if (error) {
    console.log(chalk.red('❌ Failed to create users:'), error.message);
    return [];
  }

  console.log(chalk.green(`✅ Created ${users.length} user profiles`));
  return data;
}

/**
 * Create categories
 */
async function seedCategories() {
  console.log(chalk.blue('📂 Creating categories...'));

  const { data, error } = await supabase
    .from('categories')
    .insert(sampleData.categories)
    .select();

  if (error) {
    console.log(chalk.red('❌ Failed to create categories:'), error.message);
    return [];
  }

  console.log(chalk.green(`✅ Created ${sampleData.categories.length} categories`));
  return data;
}

/**
 * Create artisan profiles
 */
async function seedArtisans(users, categories) {
  console.log(chalk.blue('🎨 Creating artisan profiles...'));

  const artisanUsers = users.filter(user => user.role === 'artisan');
  const artisanProfiles = artisanUsers.map(user => {
    const category = random.choice(categories);
    const specializations = sampleData.specializations[category.slug] || ['General Crafts'];
    
    return {
      id: user.id,
      business_name: `${user.full_name.split(' ')[0]}'s ${random.choice(['Studio', 'Workshop', 'Crafts', 'Art Gallery', 'Collection'])}`,
      bio: `Passionate artisan specializing in ${random.choice(specializations).toLowerCase()}. With years of experience in traditional craftsmanship, I create unique pieces that blend heritage with modern aesthetics.`,
      location: random.choice(sampleData.cities),
      specializations: random.boolean(0.6) 
        ? [random.choice(specializations), random.choice(specializations)]
        : [random.choice(specializations)],
      years_of_experience: random.number(2, 25),
      website: random.boolean(0.4) ? `https://www.${user.full_name.toLowerCase().replace(' ', '')}-arts.com` : null,
      social_media: random.boolean(0.7) ? {
        instagram: `@${user.full_name.toLowerCase().replace(' ', '')}_arts`,
        facebook: `${user.full_name} Arts`
      } : null,
      verification_status: random.choice(['verified', 'verified', 'pending']),
      created_at: user.created_at
    };
  });

  const { data, error } = await supabase
    .from('artisan_profiles')
    .insert(artisanProfiles)
    .select();

  if (error) {
    console.log(chalk.red('❌ Failed to create artisan profiles:'), error.message);
    return [];
  }

  console.log(chalk.green(`✅ Created ${artisanProfiles.length} artisan profiles`));
  return data;
}

/**
 * Create products
 */
async function seedProducts(categories, artisans) {
  console.log(chalk.blue('🛍️  Creating products...'));

  const products = [];

  // Create 3-8 products per artisan
  for (const artisan of artisans) {
    const productCount = random.number(3, 8);
    
    for (let i = 0; i < productCount; i++) {
      const category = random.choice(categories);
      const specializations = sampleData.specializations[category.slug] || ['Handcrafted Item'];
      const specialization = random.choice(specializations);
      
      const adjective = random.choice(sampleData.productAdjectives);
      const noun = random.choice(sampleData.productNouns);
      
      products.push({
        name: `${adjective} ${specialization} ${noun}`,
        description: `This ${specialization.toLowerCase()} is a testament to traditional craftsmanship. Meticulously handcrafted with attention to detail, it represents the finest quality artisanal work. Each piece is unique and carries the cultural heritage of our artisan community.`,
        price: random.price(25, 800),
        original_price: random.boolean(0.3) ? random.price(800, 1200) : null,
        category_id: category.id,
        artisan_id: artisan.id,
        stock_quantity: random.number(1, 25),
        status: random.choice(['active', 'active', 'active', 'inactive']),
        materials: [random.choice(['Cotton', 'Silk', 'Wood', 'Clay', 'Metal', 'Stone', 'Glass', 'Leather'])],
        dimensions: {
          length: random.number(5, 50),
          width: random.number(5, 50),
          height: random.number(2, 30),
          unit: 'cm'
        },
        weight: random.number(100, 2000), // grams
        care_instructions: 'Handle with care. Clean with soft, dry cloth. Avoid direct sunlight and moisture.',
        customization_available: random.boolean(0.4),
        processing_time: random.number(3, 14),
        created_at: random.date(120)
      });
    }
  }

  // Process in batches to avoid payload limits
  const batchSize = 50;
  const batches = [];
  
  for (let i = 0; i < products.length; i += batchSize) {
    batches.push(products.slice(i, i + batchSize));
  }

  let allProducts = [];
  for (const batch of batches) {
    const { data, error } = await supabase
      .from('products')
      .insert(batch)
      .select();

    if (error) {
      console.log(chalk.red('❌ Failed to create product batch:'), error.message);
      continue;
    }

    allProducts = [...allProducts, ...data];
  }

  console.log(chalk.green(`✅ Created ${allProducts.length} products`));
  return allProducts;
}

/**
 * Create orders and order items
 */
async function seedOrders(users, products) {
  console.log(chalk.blue('📦 Creating orders...'));

  const customerUsers = users.filter(user => user.role === 'customer');
  const activeProducts = products.filter(product => product.status === 'active');

  const orders = [];
  const orderItems = [];

  // Create 1-3 orders per customer
  for (const customer of customerUsers) {
    const orderCount = random.number(0, 3); // Some customers may not have orders
    
    for (let i = 0; i < orderCount; i++) {
      const orderId = `order-${customer.id}-${i}-${Date.now()}`;
      const itemCount = random.number(1, 4);
      const orderProducts = [];
      let totalAmount = 0;

      // Select random products for this order
      for (let j = 0; j < itemCount; j++) {
        const product = random.choice(activeProducts);
        if (!orderProducts.some(p => p.id === product.id)) { // Avoid duplicates
          const quantity = random.number(1, 3);
          const price = product.price;
          
          orderProducts.push({
            id: product.id,
            quantity,
            price
          });
          
          totalAmount += price * quantity;
        }
      }

      const orderDate = random.date(90);
      
      orders.push({
        id: orderId,
        customer_id: customer.id,
        total: Math.round(totalAmount * 100) / 100,
        status: random.choice(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'delivered', 'delivered']),
        shipping_address: {
          street: `${random.number(1, 999)} Main Street`,
          city: random.choice(sampleData.cities),
          state: 'State',
          postal_code: `${random.number(100000, 999999)}`,
          country: 'India'
        },
        delivery_date: random.boolean(0.3) ? random.date(30) : null,
        created_at: orderDate,
        updated_at: orderDate
      });

      // Create order items
      orderProducts.forEach(product => {
        orderItems.push({
          order_id: orderId,
          product_id: product.id,
          quantity: product.quantity,
          price: product.price
        });
      });
    }
  }

  // Insert orders
  const { data: createdOrders, error: ordersError } = await supabase
    .from('orders')
    .insert(orders)
    .select();

  if (ordersError) {
    console.log(chalk.red('❌ Failed to create orders:'), ordersError.message);
    return { orders: [], orderItems: [] };
  }

  // Insert order items in batches
  const batchSize = 100;
  let allOrderItems = [];
  
  for (let i = 0; i < orderItems.length; i += batchSize) {
    const batch = orderItems.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('order_items')
      .insert(batch)
      .select();

    if (error) {
      console.log(chalk.red('❌ Failed to create order items batch:'), error.message);
      continue;
    }

    allOrderItems = [...allOrderItems, ...data];
  }

  console.log(chalk.green(`✅ Created ${createdOrders.length} orders with ${allOrderItems.length} order items`));
  return { orders: createdOrders, orderItems: allOrderItems };
}

/**
 * Create product reviews
 */
async function seedReviews(users, products) {
  console.log(chalk.blue('⭐ Creating product reviews...'));

  const customerUsers = users.filter(user => user.role === 'customer');
  const activeProducts = products.filter(product => product.status === 'active');

  const reviews = [];
  const reviewTexts = [
    'Absolutely beautiful craftsmanship! The attention to detail is remarkable.',
    'Great quality product. Exactly as described and shipped quickly.',
    'Love this piece! It adds such character to my home.',
    'Excellent work by the artisan. Highly recommend!',
    'Good quality but took longer than expected to arrive.',
    'Beautiful handwork. You can see the care put into making this.',
    'Perfect addition to my collection. Very satisfied with the purchase.',
    'Amazing craftsmanship! Will definitely buy again.',
    'Good product overall, minor imperfections but acceptable for handmade.',
    'Exceeded my expectations! The artisan is very talented.'
  ];

  // Create reviews for 40-60% of products
  const productsToReview = activeProducts.filter(() => random.boolean(0.5));

  for (const product of productsToReview) {
    const reviewCount = random.number(1, 4);
    
    for (let i = 0; i < reviewCount; i++) {
      const customer = random.choice(customerUsers);
      
      reviews.push({
        product_id: product.id,
        user_id: customer.id,
        rating: random.choice([3, 4, 4, 4, 5, 5, 5]), // Bias towards higher ratings
        comment: random.choice(reviewTexts),
        created_at: random.date(60)
      });
    }
  }

  const { data, error } = await supabase
    .from('product_reviews')
    .insert(reviews)
    .select();

  if (error) {
    console.log(chalk.red('❌ Failed to create reviews:'), error.message);
    return [];
  }

  console.log(chalk.green(`✅ Created ${reviews.length} product reviews`));
  return data;
}

/**
 * Create some wishlists and cart items
 */
async function seedWishlistsAndCarts(users, products) {
  console.log(chalk.blue('💝 Creating wishlists and cart items...'));

  const customerUsers = users.filter(user => user.role === 'customer');
  const activeProducts = products.filter(product => product.status === 'active');

  const wishlists = [];
  const cartItems = [];

  for (const customer of customerUsers) {
    // Add some wishlist items (30% chance per product, max 8 items)
    const wishlistProducts = activeProducts
      .filter(() => random.boolean(0.08))
      .slice(0, 8);

    wishlistProducts.forEach(product => {
      wishlists.push({
        user_id: customer.id,
        product_id: product.id,
        created_at: random.date(30)
      });
    });

    // Add some cart items (20% chance per customer, 1-3 items)
    if (random.boolean(0.2)) {
      const cartCount = random.number(1, 3);
      const cartProducts = activeProducts
        .filter(() => random.boolean(0.05))
        .slice(0, cartCount);

      cartProducts.forEach(product => {
        cartItems.push({
          user_id: customer.id,
          product_id: product.id,
          quantity: random.number(1, 2),
          created_at: random.date(7)
        });
      });
    }
  }

  // Insert wishlists
  let createdWishlists = [];
  if (wishlists.length > 0) {
    const { data, error } = await supabase
      .from('wishlists')
      .insert(wishlists)
      .select();

    if (error) {
      console.log(chalk.red('❌ Failed to create wishlists:'), error.message);
    } else {
      createdWishlists = data;
    }
  }

  // Insert cart items
  let createdCartItems = [];
  if (cartItems.length > 0) {
    const { data, error } = await supabase
      .from('carts')
      .insert(cartItems)
      .select();

    if (error) {
      console.log(chalk.red('❌ Failed to create cart items:'), error.message);
    } else {
      createdCartItems = data;
    }
  }

  console.log(chalk.green(`✅ Created ${createdWishlists.length} wishlist items and ${createdCartItems.length} cart items`));
  return { wishlists: createdWishlists, cartItems: createdCartItems };
}

/**
 * Main execution function
 */
async function main() {
  console.log(chalk.bold.blue('🌱 Art-O-Mart Database Seeding\n'));
  console.log(chalk.gray(`Database URL: ${process.env.SUPABASE_URL}`));
  console.log(chalk.gray(`Timestamp: ${new Date().toISOString()}\n`));

  try {
    // Test connection
    const { data: healthCheck, error: healthError } = await supabase.rpc('health_check');
    if (healthError) {
      throw new Error(`Health check failed: ${healthError.message}`);
    }
    console.log(chalk.green('✅ Database connection confirmed\n'));

    // Check if data already exists
    const { count: existingUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (existingUsers > 5) {
      console.log(chalk.yellow('⚠️  Database already contains user data.'));
      console.log(chalk.gray('💡 Run with --force flag to seed anyway (not implemented in this version)'));
      console.log(chalk.gray('💡 Or run `npm run db:reset` first to clear existing data'));
      return;
    }

    // Start seeding process
    const users = await seedUsers();
    if (users.length === 0) return;

    const categories = await seedCategories();
    if (categories.length === 0) return;

    const artisans = await seedArtisans(users, categories);
    if (artisans.length === 0) return;

    const products = await seedProducts(categories, artisans);
    if (products.length === 0) return;

    const { orders } = await seedOrders(users, products);
    
    await seedReviews(users, products);
    
    await seedWishlistsAndCarts(users, products);

    // Final summary
    console.log('\n' + chalk.bold.green('🎉 Database seeding completed successfully!'));
    console.log(chalk.green(`📊 Summary:`));
    console.log(chalk.green(`   • Users: ${users.length} (${users.filter(u => u.role === 'customer').length} customers, ${users.filter(u => u.role === 'artisan').length} artisans)`));
    console.log(chalk.green(`   • Categories: ${categories.length}`));
    console.log(chalk.green(`   • Artisans: ${artisans.length}`));
    console.log(chalk.green(`   • Products: ${products.length}`));
    console.log(chalk.green(`   • Orders: ${orders.length}`));

  } catch (error) {
    console.error(chalk.red('\n💥 Seeding failed:'), error.message);
    process.exit(1);
  }
}

// Execute main function
main();