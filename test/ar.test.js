import { describe, expect, test } from 'vitest'

import { DeskAR } from '../src/ar.js'

describe('DeskAR permission handling', () => {
  test('detects permission-denied camera errors', () => {
    expect(DeskAR.isPermissionDeniedError({ name: 'NotAllowedError' })).toBe(true)
    expect(
      DeskAR.isPermissionDeniedError({
        name: 'SecurityError',
        message: 'Permission denied by user',
      }),
    ).toBe(true)
    expect(
      DeskAR.isPermissionDeniedError({
        name: 'SecurityError',
        message: 'NotSupportedError',
      }),
    ).toBe(false)
    expect(DeskAR.isPermissionDeniedError({ name: 'NotFoundError' })).toBe(false)
  })
})
