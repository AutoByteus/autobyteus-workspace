import base from '../../../../../autobyteus-server-ts/vitest.config.js';
import {fileURLToPath} from 'node:url';
export default {...base,test:{...base.test,include:[fileURLToPath(new URL('source-inspection-post-fix.test.ts',import.meta.url))]}};
