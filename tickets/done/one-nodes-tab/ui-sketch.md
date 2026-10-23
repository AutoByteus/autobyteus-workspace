# UI — one Nodes tab (clean version)

Status: **Superseded** at SR-006 by the Product Team's approved UI/UX package (/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md). Kept as history only.
The user asked for "markdown based" and then said: "Just make the UI clean. If you think the UI is clean,
then we can start working on it now."
Names and addresses are your real setup: the desktop node, Docker `8001` ("docker") and Docker `8003`.

Design rules for this page:
- **One row per node.** A row has: a status dot, the name, the address, an Agents switch, Open and a ⋯ menu.
- **Quiet when fine.** Extra text appears under a row only when something needs you, and then with exactly
  one button that fixes it.
- **Details on demand.** Expanding a row shows both directions and what the node offers.
- **Everything that changes another node is confirmed once,** in a short list.
- **Look and feel.** The page reuses the existing cards, buttons and switch of the Nodes page. The texts
  below are the intended wording; implementation may polish them, English and Chinese.

---

## 1. Manage Nodes

```
  ( Manage Nodes )   Memory Sync   Phone Setup   Docker Guide   NFS Guide

  This node
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ Embedded Node                                    http://127.0.0.1:29695  │
  │                                                                          │
  │ Remote collaboration                                          [●━━  On]  │
  │ Agents here and on the nodes you choose below can work together.         │
  │ Trusted private network only.                    How peers' runs work ▸  │
  └──────────────────────────────────────────────────────────────────────────┘

  Nodes                                                          [+ Add node]
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ ● docker      localhost:8001          Agents [●━━]     [Open]   ⋯    ▸   │
  │──────────────────────────────────────────────────────────────────────────│
  │ ● 8003        localhost:8003          Agents [━━○]     [Open]   ⋯    ▸   │
  └──────────────────────────────────────────────────────────────────────────┘
```

| Element | Meaning |
| --- | --- |
| `●` green / `○` grey / `◌` spinning | reachable / not reachable / checking |
| Agents switch | Whether agents on this node and on that node work together, in both directions. Off by default. |
| ⋯ menu | Rename, Remove |
| ▸ | Expands the row (section 3) |

- The Remote Collaboration tab is gone; its switch is in "This node".
- Your three entries for 8001 today are one row, "docker".

---

## 2. Rows that need you (one line, one button)

```
  │ ● 8003        localhost:8003          Agents [●━━]     [Open]   ⋯    ▸   │
  │   ⚠ Remote collaboration is off on 8003.                [Turn on on 8003] │
  │──────────────────────────────────────────────────────────────────────────│
  │ ● laptop      192.168.2.40:29695      Agents [●━━]     [Open]   ⋯    ▸   │
  │   ⚠ laptop doesn't know this node yet.          [Register this node there]│
  │──────────────────────────────────────────────────────────────────────────│
  │ ● docker      localhost:8001          Agents [●━━]     [Open]   ⋯    ▸   │
  │   ✗ A different node answers at this address.             [Change address]│
  │──────────────────────────────────────────────────────────────────────────│
  │ ○ old-box     192.168.2.77:29695      Agents [●━━]     [Open]   ⋯    ⟳   │
  │   Not reachable: nothing answers at that address and port.               │
  │──────────────────────────────────────────────────────────────────────────│
  │ ◌ 8003        localhost:8003          Agents [●━━]     [Open]   ⋯    ▸   │
```

When this node's own switch is off, the rows show no warnings and no node is asked anything. The Agents
switches are greyed out, and the card says:

```
  │ Remote collaboration                                          [━━○ Off]  │
  │ Off: no node is contacted for agents.                                    │
```

Turning a row's Agents switch on while this node's switch is off is still allowed. Its confirmation then
includes turning this node's switch on.

---

## 3. Expanded row

```
  │ ● docker      localhost:8001          Agents [●━━]     [Open]   ⋯    ▾   │
  │                                                                          │
  │   This node → docker     ✓                                               │
  │   docker → this node     ✓   via http://host.docker.internal:29695       │
  │                                                                          │
  │   Offers  3 Agents · 1 Agent Team                                        │
  │     Code Reviewer      Agent   Reviews diffs and reports findings        │
  │     Researcher         Agent   Searches the web and summarizes           │
  │     Writer             Agent                                             │
  │     Software Team      Team    Design, build and test a change           │
  │                                                     Checked 14:32   ⟳    │
```

- These are the same offer list and the same timing as 267: asked when the tab opens, when a node is added,
  when the switch turns on, and on ⟳. A slow node keeps checking for up to 20 s without blocking anything.
- A direction that doesn't work shows `✗` and its reason in plain words, for example "docker doesn't know
  this node yet".

---

## 4. Add node

```
  ┌ Add node ────────────────────────────────────────────────┐
  │ Address  [ http://localhost:8003                       ] │
  │ Name     [ 8003                                        ] │
  │ [ ] Let agents work with this node                       │
  │                                     [Cancel] [Add node]  │
  └──────────────────────────────────────────────────────────┘
```

- When the box is ticked, the confirmation in section 5 follows.
- If the node is already in the list: "ⓘ This is docker, already in your list."
- If the node doesn't answer now, it is still added: "ⓘ Added. 8003 isn't reachable now: nothing answers at that address and port." Its row shows ○ until it answers.

---

## 5. Confirmation (Agents switch on, or the box ticked)

```
  ┌ Let agents work with 8003? ──────────────────────────────┐
  │  • Register 8003 here as 8003                            │
  │  • Turn on remote collaboration on 8003                  │
  │  • Register this node on 8003 as Embedded Node           │
  │    (8003 finds this node's address once it is on)        │
  │                                                          │
  │  Trusted private network only.    [Cancel] [Turn on]     │
  └──────────────────────────────────────────────────────────┘
```

- Only the lines that apply are listed.
- Each line shows the name the node is registered under. If the other node already has a peer with that
  name, the name gets a number ("Embedded Node 2").
- The addresses are found automatically: each side tries the other node's own addresses and keeps the one
  that answers with the right node ID.
- A side whose collaboration is already on shows its address here, for example "(8003 reaches it at
  http://host.docker.internal:29695)". A side being turned on finds its address after it is on, and the
  expanded row then shows it.
  (Revision 3, pending your decision DEC-709; this is the recommended option.)

Turning the switch off:

```
  ┌ Stop agents working with docker? ────────────────────────┐
  │  • Remove docker from this node                          │
  │  • Remove this node from docker                          │
  │  docker stays in your list.     [Cancel] [Turn off]      │
  └──────────────────────────────────────────────────────────┘
```

- Turning a row off never turns off the other node's own switch.

---

## 6. ⋯ menu: Rename, Remove

- **Rename** edits the name in place. It is one name, also the name agents use, and allows 1–64 letters,
  digits, spaces, `_`, `.` or `-`.
- **Remove:**

```
  ┌ Remove docker? ──────────────────────────────────────────┐
  │  It leaves your list, and agents stop working with it.   │
  │  The node and its data are not touched.                  │
  │                                       [Cancel] [Remove]  │
  └──────────────────────────────────────────────────────────┘
```

---

## 7. Wrong address

The hint appears when a node running in Docker can't find an address for another node, and the first
address it tried is `localhost`/`127.0.0.1`. This happens in the confirmation or a step's result, or in
"Change address". It never appears in the add form: that address is your desktop's, where `127.0.0.1` is
right. "Use this" tries again with the suggested address first; it never changes the address your desktop
opens. Example: in a window opened on Docker 8001, "Change address" for the desktop node with
`http://127.0.0.1:29695`:

```
  │ ✗ docker can't reach http://127.0.0.1:29695.                    │
  │   docker runs in Docker, where 127.0.0.1 is the container itself.│
  │   Try http://host.docker.internal:29695  [Use this]  Docker Guide│
```

The other causes get one sentence each:

| Cause | Message |
| --- | --- |
| Refused | Nothing answers at that address and port. |
| Timed out | No answer within 20 s. |
| Name not found | `<host>` can't be found from `<node>`. |
| Not AutoByteus | Something answers there, but it isn't an AutoByteus node. |
| This node itself | That address is this node. |
| Different node | A different node answers there than the one registered. |
| Off there | Remote collaboration is off on `<node>`. |

"fetch failed" is never shown alone.

---

## 8. Window opened on Docker 8001

```
  This node
  │ docker                                             http://localhost:8001 │
  │ Remote collaboration                                          [●━━  On]  │

  Nodes
  │ ● Embedded Node  127.0.0.1:29695      Agents [●━━]     [Open]   ⋯    ▸   │
  │ ● 8003           localhost:8003       Agents [━━○]     [Open]   ⋯    ▸   │
```

- The address shown on a row is where your desktop opens the node.
- Where this node's agents reach it, when that is different, appears in the expanded row ("via …", section 3).
