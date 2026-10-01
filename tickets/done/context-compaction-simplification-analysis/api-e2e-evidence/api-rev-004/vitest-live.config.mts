import base from '../../../../../autobyteus-server-ts/vitest.config.js';
import {fileURLToPath} from 'node:url';
export default {...base,test:{...base.test,setupFiles:[...base.test!.setupFiles as string[],fileURLToPath(new URL('live-setup.ts',import.meta.url))]}};
