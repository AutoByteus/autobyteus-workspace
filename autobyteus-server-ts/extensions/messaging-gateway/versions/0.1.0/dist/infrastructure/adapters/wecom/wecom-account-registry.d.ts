export type WeComAccountMode = "APP" | "LEGACY";
export type WeComAccountRecord = {
    accountId: string;
    label: string;
    mode: WeComAccountMode;
};
export declare class WeComAccountRegistry {
    private readonly accountsById;
    constructor(accounts: WeComAccountRecord[]);
    listAccounts(): WeComAccountRecord[];
    resolveAccount(accountId: string): WeComAccountRecord | null;
    isConfiguredAccount(accountId: string): boolean;
}
//# sourceMappingURL=wecom-account-registry.d.ts.map