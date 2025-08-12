#!/usr/bin/env node

/**
 * Database initialization script
 * 
 * Usage:
 *   node scripts/init-db.js
 *   
 * This script will:
 * 1. Check database connection
 * 2. Run migrations (create tables)
 * 3. Seed initial data
 */

require('dotenv').config({ path: '.env.local' })

const { db, runMigrations, seedDatabase, checkDatabaseConnection } = require('../lib/db')

async function initializeDatabase() {
  console.log('🚀 Initializing Contract Stresser Database...\n')

  try {
    // Step 1: Check database connection
    console.log('📡 Checking database connection...')
    const isConnected = await checkDatabaseConnection()
    
    if (!isConnected) {
      console.error('❌ Database connection failed!')
      console.error('Make sure PostgreSQL is running and environment variables are set correctly.')
      console.error('Check your .env.local file and ensure the database exists.')
      process.exit(1)
    }
    
    console.log('✅ Database connection successful!\n')

    // Step 2: Run migrations
    console.log('📋 Running database migrations...')
    await runMigrations()
    console.log('✅ Migrations completed!\n')

    // Step 3: Seed database
    console.log('🌱 Seeding database with initial data...')
    await seedDatabase()
    console.log('✅ Database seeding completed!\n')

    console.log('🎉 Database initialization successful!')
    console.log('\nYour Contract Stresser database is ready to use!')
    console.log('\nNext steps:')
    console.log('1. Start the development server: npm run dev')
    console.log('2. Start Anvil local blockchain: npm run anvil')
    console.log('3. Deploy contracts: npm run forge:deploy')

  } catch (error) {
    console.error('❌ Database initialization failed:')
    console.error(error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:')
      console.error('- Make sure PostgreSQL is installed and running')
      console.error('- Check your database credentials in .env.local')
      console.error('- Create the database if it doesn\'t exist:')
      console.error('  createdb contract_stresser')
    }
    
    process.exit(1)
  } finally {
    await db.end()
  }
}

// Run the initialization
if (require.main === module) {
  initializeDatabase()
}

module.exports = { initializeDatabase }