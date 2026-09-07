/** 認証済みユーザー（Backend `UserResponse`、02-api §3.1）。role は持たない（MVP は単一権限）。 */
export interface User {
  id: number
  email: string
  displayName: string
}

export interface LoginInput {
  email: string
  password: string
}
