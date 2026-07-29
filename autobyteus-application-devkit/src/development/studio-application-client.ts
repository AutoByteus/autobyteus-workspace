import path from 'node:path';

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

export class StudioApplicationClient {
  private readonly origin: string;

  constructor(baseUrl: string) {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Studio URL must use HTTP or HTTPS.');
    }
    this.origin = parsed.origin;
  }

  private async graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(`${this.origin}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    const payload = await response.json() as GraphqlResponse<T>;
    if (!response.ok || payload.errors?.length || !payload.data) {
      throw new Error(
        payload.errors?.map((error) => error.message ?? 'Unknown GraphQL error').join('; ')
        ?? `Studio GraphQL request failed with HTTP ${response.status}.`,
      );
    }
    return payload.data;
  }

  private async findPackageId(packageRoot: string): Promise<string | null> {
    const list = await this.graphql<{
      applicationPackages: Array<{ packageId: string }>;
    }>('query DevkitApplicationPackages { applicationPackages { packageId } }');
    for (const candidate of list.applicationPackages) {
      const details = await this.graphql<{
        applicationPackageDetails: { rootPath: string } | null;
      }>(
        'query DevkitApplicationPackageDetails($packageId: String!) { '
        + 'applicationPackageDetails(packageId: $packageId) { rootPath } }',
        { packageId: candidate.packageId },
      );
      if (
        details.applicationPackageDetails
        && path.resolve(details.applicationPackageDetails.rootPath) === path.resolve(packageRoot)
      ) {
        return candidate.packageId;
      }
    }
    return null;
  }

  async ensureLocalPackage(packageRoot: string, localApplicationId: string): Promise<{
    packageId: string;
    applicationId: string;
  }> {
    let packageId = await this.findPackageId(packageRoot);
    if (!packageId) {
      await this.graphql(
        'mutation DevkitImportApplicationPackage($input: ImportApplicationPackageInput!) { '
        + 'importApplicationPackage(input: $input) { packageId } }',
        { input: { sourceKind: 'LOCAL_PATH', source: path.resolve(packageRoot) } },
      );
      packageId = await this.findPackageId(packageRoot);
    }
    if (!packageId) throw new Error('Studio did not retain the imported local application package.');
    const applications = await this.graphql<{
      listApplications: Array<{
        id: string;
        localApplicationId: string;
        packageId: string;
      }>;
    }>('query DevkitApplications { listApplications { id localApplicationId packageId } }');
    const application = applications.listApplications.find(
      (candidate) =>
        candidate.packageId === packageId
        && candidate.localApplicationId === localApplicationId,
    );
    if (!application) {
      throw new Error(
        `Studio package '${packageId}' does not contain application '${localApplicationId}'.`,
      );
    }
    return { packageId, applicationId: application.id };
  }

  async reloadApplication(applicationId: string): Promise<void> {
    const response = await fetch(
      `${this.origin}/rest/applications/${encodeURIComponent(applicationId)}/backend/reload`,
      { method: 'POST', headers: { accept: 'application/json' } },
    );
    if (!response.ok) {
      throw new Error(`Studio application reload failed with HTTP ${response.status}.`);
    }
  }
}
