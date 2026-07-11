/**
 * Simple object pools to cut GC / alloc churn on mobile.
 */
export function createPool(factory, initial = 0) {
  const free = []
  const all = []
  for (let i = 0; i < initial; i++) {
    const o = factory()
    free.push(o)
    all.push(o)
  }
  return {
    acquire() {
      const o = free.pop() || factory()
      if (!all.includes(o)) all.push(o)
      o.visible = true
      return o
    },
    release(o) {
      if (!o) return
      o.visible = false
      if (o.parent) o.parent.remove(o)
      free.push(o)
    },
    releaseAll() {
      for (const o of all) {
        o.visible = false
        if (o.parent) o.parent.remove(o)
        if (!free.includes(o)) free.push(o)
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
