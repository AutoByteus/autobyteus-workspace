export type ApplicationTemplateOptions = {
    targetDirectory: string;
    applicationId: string;
    applicationName: string;
    packageName?: string | null;
    force?: boolean | null;
};
export type ApplicationTemplateResult = {
    projectRoot: string;
    applicationId: string;
    applicationName: string;
    packageName: string;
};
export declare const materializeApplicationTemplate: (options: ApplicationTemplateOptions) => Promise<ApplicationTemplateResult>;
//# sourceMappingURL=template-materializer.d.ts.map