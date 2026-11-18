package org.autobyteus.mobile.shell

import org.autobyteus.mobile.connection.ConnectionDiagnosticMapper
import org.autobyteus.mobile.connection.ConnectionValidationResult
import org.autobyteus.mobile.connection.NodeStatusCheck
import org.autobyteus.mobile.connection.NodeUrlNormalizer
import org.autobyteus.mobile.connection.RemoteAccessStatus
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.junit.Assert.assertEquals
import org.junit.Test
import java.net.ConnectException
import java.util.concurrent.Executor
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class NodeReachabilityTest {
    private val online = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("http://192.168.1.25:29695"), displayName = "Desktop")
    private val offline = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("http://192.168.1.26:8001"), displayName = "Docker node 2")
    private val check = object : NodeStatusCheck {
        override fun validate(entry: SavedNodeEntry): ConnectionValidationResult =
            if (entry == online) ConnectionValidationResult.Reachable(entry, RemoteAccessStatus(true, true))
            else ConnectionValidationResult.Failed(ConnectionDiagnosticMapper.fromException(ConnectException("refused")))
    }

    @Test
    fun everyRowShowsCheckingThenItsAnswer() {
        val pool = Executors.newFixedThreadPool(2)
        val states = java.util.concurrent.ConcurrentHashMap<String, MutableList<NodeReachabilityState>>()
        NodeReachability(check, pool, Executor { it.run() }).start(listOf(online, offline)) { id, state ->
            states.getOrPut(id) { mutableListOf() }.add(state)
        }
        pool.shutdown()
        pool.awaitTermination(5, TimeUnit.SECONDS)
        assertEquals(listOf(NodeReachabilityState.Checking, NodeReachabilityState.Online), states[online.id])
        assertEquals(listOf(NodeReachabilityState.Checking, NodeReachabilityState.NotReachable), states[offline.id])
    }

    @Test
    fun closingTheListDropsLateAnswers() {
        val pool = Executors.newSingleThreadExecutor()
        val delivered = mutableListOf<Runnable>()
        val states = mutableListOf<NodeReachabilityState>()
        val reachability = NodeReachability(check, pool, Executor { delivered += it })
        reachability.start(listOf(online)) { _, state -> states += state }
        pool.shutdown()
        pool.awaitTermination(5, TimeUnit.SECONDS)
        reachability.cancel()
        delivered.forEach(Runnable::run)
        assertEquals(listOf(NodeReachabilityState.Checking), states)
    }
}
