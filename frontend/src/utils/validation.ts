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

const HOSTNAME_EXAMPLE = '例: web-prod-01 または db01.example.internal'

/**
 * ホスト名の形式（RFC 1123 ラベル規則）。任意項目なので空は許容。
 * 不正な場合は「どこが」「なぜ」いけないのかを具体的に返す（UX 目的。最終防衛線は Backend `@Hostname`）。
 */
export function hostname(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  if (HOSTNAME_RE.test(value)) return undefined

  const invalidChar = /[^a-zA-Z0-9.-]/.exec(value)?.[0]
  if (invalidChar != null) {
    const shown = invalidChar === ' ' ? 'スペース' : `「${invalidChar}」`
    return `ホスト名に使えない文字 ${shown} が含まれています。使えるのは英数字・ハイフン(-)・ドット(.)のみです。${HOSTNAME_EXAMPLE}`
  }
  if (/^[.-]|[.-]$/.test(value)) {
    return `ホスト名の先頭・末尾にハイフン(-)やドット(.)は使えません。${HOSTNAME_EXAMPLE}`
  }
  if (value.includes('..')) {
    return `ホスト名でドット(.)を連続させることはできません。${HOSTNAME_EXAMPLE}`
  }
  const labels = value.split('.')
  if (labels.some((label) => label.startsWith('-') || label.endsWith('-'))) {
    return `ホスト名のドット区切りの各部分は、先頭・末尾にハイフン(-)を置けません。${HOSTNAME_EXAMPLE}`
  }
  if (labels.some((label) => label.length > 63)) {
    return 'ホスト名のドット区切りの各部分は 63 文字以内で入力してください。'
  }
  return `ホスト名の形式が正しくありません。${HOSTNAME_EXAMPLE}`
}

const IPV4_RE = /^((25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(25[0-5]|2[0-4]\d|[01]?\d?\d)$/
const IPV6_RE =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4}:){1,7}:|:(:[0-9a-fA-F]{1,4}){1,7}|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5})$/

const IP_EXAMPLE = '例: 192.168.1.10（IPv4）/ 2001:db8::1（IPv6）'

/**
 * IPv4 / IPv6。任意項目なので空は許容（Backend `@IpAddress` と同じ方針）。
 * 不正な場合は入力の見た目から意図を推測し、具体的な理由を返す（UX 目的）。
 */
export function ipAddress(value: string | null | undefined): string | undefined {
  if (!value || value.trim() === '') return undefined
  const v = value.trim()
  if (IPV4_RE.test(v) || IPV6_RE.test(v)) return undefined

  if (v.includes(':')) {
    return 'IPv6 アドレスの形式が正しくありません。例: 2001:db8::1'
  }
  if (/^[\d.]+$/.test(v)) {
    const octets = v.split('.')
    if (octets.length !== 4) {
      return `IPv4 は数字を4組ドット(.)で区切ります（現在 ${octets.length} 組）。例: 192.168.1.10`
    }
    const bad = octets.find((o) => !/^\d{1,3}$/.test(o) || Number(o) > 255)
    if (bad != null) {
      const reason = bad === '' ? '空の組があります' : `「${bad}」が 0〜255 の範囲外です`
      return `IPv4 の各組は 0〜255 の数字です（${reason}）。例: 192.168.1.10`
    }
  }
  return `IP アドレスの形式が正しくありません。${IP_EXAMPLE}`
}

/** すべての値が undefined なら有効。 */
export function hasErrors<T>(errors: Errors<T>): boolean {
  return Object.values(errors).some((v) => v != null)
}
