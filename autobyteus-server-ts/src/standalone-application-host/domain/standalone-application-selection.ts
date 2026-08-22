import type { ApplicationBundle } from "../../application-bundles/domain/models.js";

export type StandaloneApplicationSelection = Readonly<{
  packageId: "standalone";
  packageRoot: string;
  localApplicationId: string;
  applicationId: string;
  applicationRoot: string;
  uiRoot: string;
  entryHtmlPath: string;
  bundle: ApplicationBundle;
}>;
