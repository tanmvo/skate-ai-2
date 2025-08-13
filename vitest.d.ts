/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare global {
  namespace Vi {
    interface Assertion<T = any>
      extends TestingLibraryMatchers<T, void> {}
  }
}