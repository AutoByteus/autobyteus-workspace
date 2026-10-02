import base from '../../../../../autobyteus-server-ts/vitest.config.js';
import {fileURLToPath} from 'node:url';
export default {...base,test:{...base.test,include:[fileURLToPath(new URL('retry-policy-probe.test.ts',import.meta.url))]}};
