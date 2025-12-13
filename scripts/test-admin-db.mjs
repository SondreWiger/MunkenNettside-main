#!/usr/bin/env node
import pg from 'pg'
import assert from 'assert'

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) {
    console.error('Set DATABASE_URL in environment to run this test')
    process.exit(1)
  }

  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()

  try {
    // Check users table has admin_uuid column
    const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name IN ('admin_uuid','admin_verified','admin_uuid_created_at')`)
    const cols = res.rows.map(r => r.column_name)
    console.log('Found columns:', cols)
    assert(cols.includes('admin_uuid') && cols.includes('admin_verified'), 'Expected admin columns to exist')

    // Insert a dummy user row (requires that a matching auth.users exists or we use temporary id)
    const testId = '00000000-0000-0000-0000-000000000000'
    // Upsert into users - id must reference auth.users - this may fail in some setups; we'll just check insert into admin_verifications

    // Insert a test admin verification row
    const insert = await client.query(`INSERT INTO public.admin_verifications (user_id, code, expires_at) VALUES ($1, $2, NOW() + interval '10 minutes') RETURNING id`, [testId, '123456'])
    console.log('Inserted admin_verification id:', insert.rows[0].id)
    // Clean up
    await client.query(`DELETE FROM public.admin_verifications WHERE id = $1`, [insert.rows[0].id])

    console.log('Admin DB smoke test passed')
  } catch (err) {
    console.error('Admin DB smoke test failed', err)
    process.exit(2)
  } finally {
    await client.end()
  }
}

main()
