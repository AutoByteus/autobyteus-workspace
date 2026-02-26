export type WeComAccountMode = "APP" | "LEGACY";

export type WeComAccountRecord = {
  accountId: string;
  label: string;
  mode: WeComAccountMode;
};

export class WeComAccountRegistry {
  private readonly accountsById: Map<string, WeComAccountRecord>;

  constructor(accounts: WeComAccountRecord[]) {
    this.accountsById = new Map(accounts.map((account) => [account.accountId, account]));
  }

  listAccounts(): WeComAccountRecord[] {
    return Array.from(this.accountsById.values());
  }

  resolveAccount(accountId: string): WeComAccountRecord | null {
    return this.accountsById.get(accountId) ?? null;
  }

  isConfiguredAccount(accountId: string): boolean {
    return this.accountsById.has(accountId);
  }
}
