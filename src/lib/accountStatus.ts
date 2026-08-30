export type AccountStatus = {
  isBanned: boolean;
  deletedAt: Date | null;
};

export function isAccountDisabled(account: AccountStatus) {
  return account.isBanned || account.deletedAt !== null;
}
