import { NextResponse } from 'next/server'

/**
 * Health check endpoint to diagnose environment variables and connectivity
 */
export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    envVars: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? '✅ Set'
        : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? '✅ Set'
        : '❌ Missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? '✅ Set'
        : '❌ Missing',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
        ? '✅ Set'
        : '❌ Missing',
    },
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...'
      : 'Not set',
  }

  // Test Supabase connectivity
  let supabaseStatus = 'Not tested'
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
        }
      )
      supabaseStatus = response.ok
        ? '✅ Connected'
        : `❌ HTTP ${response.status}`
    } catch (error) {
      supabaseStatus = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  } else {
    supabaseStatus = '❌ Cannot test - URL not set'
  }

  return NextResponse.json({
    ...diagnostics,
    supabaseConnectivity: supabaseStatus,
  })
}
