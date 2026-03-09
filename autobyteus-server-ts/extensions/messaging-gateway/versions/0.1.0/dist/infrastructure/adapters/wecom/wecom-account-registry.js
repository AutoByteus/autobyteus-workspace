export class WeComAccountRegistry {
    accountsById;
    constructor(accounts) {
        this.accountsById = new Map(accounts.map((account) => [account.accountId, account]));
    }
    listAccounts() {
        return Array.from(this.accountsById.values());
    }
    resolveAccount(accountId) {
        return this.accountsById.get(accountId) ?? null;
    }
    isConfiguredAccount(accountId) {
        return this.accountsById.has(accountId);
    }
}
//# sourceMappingURL=wecom-account-registry.js.map