import { neon, NeonQueryFunction } from '@neondatabase/serverless'

/**
 * Executes database operations within a Neon transaction block
 * setting SET LOCAL app.current_tenant_id = '<tenant_id>' for RLS safety.
 */
export async function withTenantDb<T>(
  databaseUrl: string,
  tenantId: string,
  callback: (sql: NeonQueryFunction<false, false>) => Promise<T>
): Promise<T> {
  if (!tenantId) {
    throw new Error('Tenant ID is required for database operations.')
  }

  const sql = neon(databaseUrl)

  // Set local RLS tenant variable using set_config to support query parameters ($1)
  await sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
  return callback(sql)
}

