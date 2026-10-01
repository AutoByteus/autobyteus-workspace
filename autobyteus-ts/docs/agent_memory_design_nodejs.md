# AutoByteus Agent Memory Design (Node.js)

The canonical TypeScript/Node.js memory architecture is maintained in
[Agent Memory Design](./agent_memory_design.md). Use that document for direct
compression, input recovery, snapshot publication/restore, frozen historical
migration and provider-native metadata boundaries. This entry point intentionally
does not duplicate the contract.

The former structured-JSON child-agent/category/lineage design is not the current
runtime. Existing historical files are preserved; see the canonical document for
the distinction between normal runtime reads and historical startup conversion.
