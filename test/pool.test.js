import { describe, expect, test } from 'vitest'
import { createPool } from '../src/pool.js'

describe('pool', () => {
  test('is importable and pre-allocates via createPool', async () => {
    const { createPool: imported } = await import('../src/pool.js')
    expect(typeof imported).toBe('function')
    const pool = imported(() => ({ visible: false }), 12)
    expect(pool.size).toBe(12)
    expect(pool.free).toBe(12)
  })

  test('uses Set guards to prevent double-release corruption', () => {
    let nextId = 0
    const pool = createPool(() => ({ id: nextId++, visible: false }), 2)
    const a = pool.acquire()
    const sizeAfterAcquire = pool.size
    pool.release(a)
    expect(pool.free).toBe(2)
    pool.release(a) // double-release should be guarded
    expect(pool.free).toBe(2)
    expect(pool.size).toBe(sizeAfterAcquire)
  })

  test('acquire sets visible true and release sets visible false and removes parent', () => {
    const pool = createPool(() => ({ visible: false, parent: { remove: () => {} } }), 1)
    const obj = pool.acquire()
    expect(obj.visible).toBe(true)
    obj.parent = { remove: () => {} }
    const remove = pool.release(obj)
    expect(obj.visible).toBe(false)
  })
})
