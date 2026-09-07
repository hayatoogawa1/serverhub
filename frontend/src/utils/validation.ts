/**
 * 軽量なフォームバリデーション（UX 目的のみ。最終防衛線は Backend、06-ui §6）。
 * react-hook-form 等は導入せず、MUI 制御コンポーネント + このヘルパーで足りる範囲に留める。
 */

export type Errors<T> = Partial<Record<keyof T, string>>

/** 必須（trim 後に空でない）。 */
export function required(value: string | null | undefined, label: string): string | undefined {
  return value != null && value.trim() !== '' ? undefined : `${label}は必須です。`
}

/** 最大文字数。 */
export function maxLength(
  value: string | null | undefined,
  max: number,
  label: string,
): string | undefined {
  return (value?.length ?? 0) <= max ? undefined : `${label}は${max}文字以内で入力してください。`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function email(value: string | null | undefined): string | undefined {
  return value && EMAIL_RE.test(value) ? undefined : 'メールアドレスの形式が正しくありません。'
}

/** RFC 1123 ラベル（英数字・ハイフン、ドット区切り可）。Backend の `@Hostname` と同じパターン。 */
const HOSTNAME_RE =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

export function hostname(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  return HOSTNAME_RE.test(value) ? undefined : 'ホスト名の形式が正しくありません。'
}

const IPV4_RE = /^((25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(25[0-5]|2[0-4]\d|[01]?\d?\d)$/
const IPV6_RE =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4}:){1,7}:|:(:[0-9a-fA-F]{1,4}){1,7}|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5})$/

/** IPv4 / IPv6。任意項目なので空は許容（Backend `@IpAddress` と同じ方針）。 */
export function ipAddress(value: string | null | undefined): string | undefined {
  if (!value || value.trim() === '') return undefined
  return IPV4_RE.test(value) || IPV6_RE.test(value)
    ? undefined
    : 'IP アドレスの形式が正しくありません。'
}

/** すべての値が undefined なら有効。 */
export function hasErrors<T>(errors: Errors<T>): boolean {
  return Object.values(errors).some((v) => v != null)
}
