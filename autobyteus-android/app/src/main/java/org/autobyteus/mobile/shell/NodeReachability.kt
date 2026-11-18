package org.autobyteus.mobile.shell

import org.autobyteus.mobile.connection.ConnectionValidationResult
import org.autobyteus.mobile.connection.NodeStatusCheck
import org.autobyteus.mobile.connection.SavedNodeEntry
import java.util.concurrent.Executor
import java.util.concurrent.ExecutorService
import java.util.concurrent.Future

enum class NodeReachabilityState { Checking, Online, NotReachable }

/**
 * The node list's reachability: every saved entry is checked at once when the list opens; each row shows
 * "Checking…" until its node answers. Closing the list cancels the checks, and late answers are dropped.
 */
class NodeReachability(
    private val statusCheck: NodeStatusCheck,
    private val background: ExecutorService,
    private val mainThread: Executor,
) {
    private var generation = 0
    private val running = mutableListOf<Future<*>>()

    fun start(entries: List<SavedNodeEntry>, onState: (entryId: String, state: NodeReachabilityState) -> Unit) {
        cancel()
        val current = generation
        entries.forEach { entry ->
            onState(entry.id, NodeReachabilityState.Checking)
            running += background.submit {
                val state = when (statusCheck.validate(entry)) {
                    is ConnectionValidationResult.Reachable -> NodeReachabilityState.Online
                    is ConnectionValidationResult.Failed -> NodeReachabilityState.NotReachable
                }
                mainThread.execute { if (current == generation) onState(entry.id, state) }
            }
        }
    }

    fun cancel() {
        generation += 1
        running.forEach { it.cancel(true) }
        running.clear()
    }
}
