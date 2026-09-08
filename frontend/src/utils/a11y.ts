/**
 * アクセシビリティ補助（Phase 10 #6）。
 */

/**
 * フォーム内で最初の不正な入力（`aria-invalid="true"`）へフォーカスを移す。
 *
 * バリデーション失敗時に呼ぶ。MUI TextField は `error` prop が真のとき入力へ
 * `aria-invalid="true"` と、ヘルパーテキスト（エラー文言）への `aria-describedby` を
 * 自動で付けるため、フォーカスを移すだけでスクリーンリーダーがエラー内容を読み上げる。
 * 対応する `clientErrors` が state に反映された後（`useEffect` など）に呼ぶこと。
 */
export function focusFirstInvalid(form: HTMLElement | null): void {
  form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}
