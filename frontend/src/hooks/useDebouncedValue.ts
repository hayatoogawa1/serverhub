import { useEffect, useState } from 'react'

/** `value` の変化を `delayMs` 後に反映する（サジェスト等の入力連動リクエスト抑制用）。 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
