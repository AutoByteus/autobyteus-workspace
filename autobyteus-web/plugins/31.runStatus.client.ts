import { installViewRunStatusBridge } from '~/services/runStatus/viewRunStatusBridge'

/** Team and Org views read their delegated and peer runs' statuses by run ID (autobyteus-461 SR-083). */
export default defineNuxtPlugin(() => { installViewRunStatusBridge() })
