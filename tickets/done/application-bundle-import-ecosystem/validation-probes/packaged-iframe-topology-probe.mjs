import { pathToFileURL } from 'node:url'

const packagedHostUrl = pathToFileURL('/Applications/AutoByteus/renderer/index.html').toString()
const currentRelativeBundleEntry = '/rest/application-bundles/built-in%3Aapplications%3Asocratic-math-teacher/assets/ui/index.html'
const resolvedRelativeIframeUrl = new URL(currentRelativeBundleEntry, packagedHostUrl).toString()
const backendIframeUrl = 'http://127.0.0.1:29695/rest/application-bundles/built-in%3Aapplications%3Asocratic-math-teacher/assets/ui/index.html'

const report = {
  packagedHostUrl,
  packagedHostOrigin: new URL(packagedHostUrl).origin,
  currentRelativeBundleEntry,
  resolvedRelativeIframeUrl,
  resolvedRelativeIframeOrigin: new URL(resolvedRelativeIframeUrl).origin,
  backendIframeUrl,
  backendIframeOrigin: new URL(backendIframeUrl).origin,
  sameOriginIfBackendAbsolute: new URL(packagedHostUrl).origin === new URL(backendIframeUrl).origin,
}

console.log(JSON.stringify(report, null, 2))
