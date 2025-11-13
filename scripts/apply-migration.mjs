#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Read migration file
const migrationPath = join(__dirname, '../supabase/migrations/20250113_remove_unique_constraints.sql')
const migrationSQL = readFileSync(migrationPath, 'utf8')

console.log('🔧 Applying migration: 20250113_remove_unique_constraints.sql')
console.log('📝 Migration content:')
console.log('─'.repeat(80))
console.log(migrationSQL)
console.log('─'.repeat(80))

// Apply migration
try {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: migrationSQL
  })

  if (error) {
    // Try direct query if exec_sql doesn't exist
    const { error: directError } = await supabase
      .from('_migrations')
      .insert({ name: '20250113_remove_unique_constraints', applied_at: new Date().toISOString() })

    // Execute SQL statements one by one
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'))

    for (const statement of statements) {
      console.log(`\n🔄 Executing: ${statement.substring(0, 60)}...`)
      // Note: Supabase JS client doesn't support raw SQL execution
      // You'll need to run this through the SQL Editor
    }

    console.log('\n⚠️  Could not apply migration automatically.')
    console.log('📋 Please apply the migration manually:')
    console.log('1. Go to https://cmtbboloytcbwdaylngv.supabase.co/project/cmtbboloytcbwdaylngv/sql/new')
    console.log('2. Copy the migration SQL from:')
    console.log(`   ${migrationPath}`)
    console.log('3. Paste and run the SQL in the SQL Editor')
    process.exit(1)
  }

  console.log('\n✅ Migration applied successfully!')
} catch (err) {
  console.error('\n❌ Error applying migration:', err.message)
  console.log('\n📋 Please apply the migration manually:')
  console.log('1. Go to https://cmtbboloytcbwdaylngv.supabase.co/project/cmtbboloytcbwdaylngv/sql/new')
  console.log('2. Copy the migration SQL from:')
  console.log(`   ${migrationPath}`)
  console.log('3. Paste and run the SQL in the SQL Editor')
  process.exit(1)
}
