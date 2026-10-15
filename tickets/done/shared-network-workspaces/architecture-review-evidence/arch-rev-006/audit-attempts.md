# ARCH006 audit attempts

Initial local audit stopped at raw Docker HostConfig equality: API004 before Dns=null, after Dns=[]. Inspected both snapshots and run-two-reboots.py: this sole empty-DNS normalization was already explicitly recorded by API004. Corrected reviewer assertion to require exactly that difference and equality of all remaining fields; did not alter inherited evidence or count a failed product check. All earlier assertions completed. No product suite/VM was run.
