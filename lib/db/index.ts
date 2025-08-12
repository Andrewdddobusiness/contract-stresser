import { Pool, PoolClient } from 'pg'

// Database connection configuration
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'contract_stresser',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}

// Create connection pool
let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    pool = new Pool(dbConfig)
    
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
      process.exit(-1)
    })

    pool.on('connect', () => {
      console.log('Connected to database')
    })
  }
  
  return pool
}

// Database interface
export const db = {
  async query(text: string, params?: any[]) {
    const pool = getPool()
    const start = Date.now()
    
    try {
      const res = await pool.query(text, params)
      const duration = Date.now() - start
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Executed query', { text, duration, rows: res.rowCount })
      }
      
      return res
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    }
  },

  async getClient(): Promise<PoolClient> {
    const pool = getPool()
    return pool.connect()
  },

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient()
    
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  async end() {
    if (pool) {
      await pool.end()
      pool = null
    }
  }
}

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.query('SELECT 1')
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// Migration runner
export async function runMigrations() {
  try {
    // Check if migrations table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Add initial schema migration if not exists
    const migrationCheck = await db.query(`
      SELECT * FROM migrations WHERE name = 'initial_schema'
    `)

    if (migrationCheck.rows.length === 0) {
      console.log('Running initial schema migration...')
      
      // Read and execute schema.sql
      const fs = await import('fs/promises')
      const path = await import('path')
      
      const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql')
      const schemaSql = await fs.readFile(schemaPath, 'utf-8')
      
      await db.query(schemaSql)
      
      // Mark migration as completed
      await db.query(`
        INSERT INTO migrations (name) VALUES ('initial_schema')
      `)
      
      console.log('Initial schema migration completed')
    }
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

// Seed data function
export async function seedDatabase() {
  try {
    // Check if contract templates are seeded
    const templatesCheck = await db.query(`
      SELECT COUNT(*) as count FROM contract_templates WHERE user_id IS NULL
    `)

    if (parseInt(templatesCheck.rows[0].count) === 0) {
      console.log('Seeding built-in contract templates...')
      
      // Seed built-in contract templates
      const templates = [
        {
          type: 'ERC20',
          name: 'Standard ERC20 Token',
          description: 'A standard ERC20 fungible token with mint, burn, and pause capabilities',
          version: '1.0.0',
          bytecode: '0x608060405234801561001057600080fd5b50...',
          abi: JSON.stringify([]),
          constructor_schema: JSON.stringify([
            {
              name: 'name',
              type: 'string',
              description: 'Token name',
              required: true,
              defaultValue: 'Test Token'
            },
            {
              name: 'symbol',
              type: 'string', 
              description: 'Token symbol',
              required: true,
              defaultValue: 'TEST'
            }
          ]),
          gas_estimate: '2500000',
          features: JSON.stringify(['mintable', 'burnable', 'pausable']),
          documentation: 'Standard ERC20 token implementation'
        }
        // Add more templates as needed
      ]

      for (const template of templates) {
        await db.query(`
          INSERT INTO contract_templates (
            contract_type, name, description, version, bytecode, abi,
            constructor_schema, gas_estimate, features, documentation, is_public
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          template.type,
          template.name,
          template.description,
          template.version,
          template.bytecode,
          template.abi,
          template.constructor_schema,
          template.gas_estimate,
          template.features,
          template.documentation,
          true
        ])
      }

      console.log('Contract templates seeded successfully')
    }
  } catch (error) {
    console.error('Database seeding failed:', error)
    throw error
  }
}

export default db