/**
 * Simple object pools to cut GC / alloc churn on mobile.
 */
export function createPool(factory, initial = 0) {
  const free = []
  const all = []
  const freeSet = new Set()
  const allSet = new Set()
  for (let i = 0; i < initial; i++) {
    const o = factory()
    free.push(o)
    all.push(o)
    freeSet.add(o)
    allSet.add(o)
  }
  return {
    acquire() {
      const o = free.pop() || factory()
      freeSet.delete(o)
      if (!allSet.has(o)) {
        allSet.add(o)
        all.push(o)
      }
      o.visible = true
      return o
    },
    release(o) {
      if (!o) return
      // Double-release would push the same object twice and corrupt the
      // free list — guard on membership instead of an O(n) scan.
      if (freeSet.has(o)) return
      freeSet.add(o)
      o.visible = false
      if (o.parent) o.parent.remove(o)
      free.push(o)
    },
    releaseAll() {
      free.length = 0
      for (const o of all) {
        o.visible = false
        if (o.parent) o.parent.remove(o)
        freeSet.add(o)
        free.push(o)
      }
    },
    get size() {
      return all.length
    },
    get free() {
      return free.length
    },
  }
}
