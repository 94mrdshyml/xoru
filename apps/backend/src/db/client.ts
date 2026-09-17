import { neon, NeonQueryFunction } from '@neondatabase/serverless'

/**
 * Executes database operations within a Neon atomic transaction block,
 * sending `SELECT set_config('app.current_tenant_id', tenantId, true)` and target queries
 * in a single atomic HTTP request payload for 100% RLS safety.
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

  // Wrap query in sql.transaction so set_config and query are sent in 1 single HTTP request
  const tenantSql = (async (strings: TemplateStringsArray, ...values: any[]) => {
    const results = await sql.transaction((txn) => [
      txn`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`,
      txn(strings, ...values),
    ])
    return results[1]
  }) as unknown as NeonQueryFunction<false, false>

  return callback(tenantSql)
}
