# Released run-package shapes (frozen)

Verbatim copies, as of `origin/personal@f2924a2b0`, of the Team tree v2 / Org tree v1 contracts,
the v2-era shared execution records and **strict** schemas, Team and Org task-records v1 (types,
schemas, stores), the Org state-package v1 validator and the Org execution index v1. Only import
paths were remapped.

Why they exist: current execution trees are read tolerantly (unknown fields ignored, no version
field), and the task-records runtime code is deleted. Released app-data migrations
(`20260814`, `20260819`, `20260824`, `20260901`, and the records read in `20260905`) use strict
validators as classifiers ("already current" versus "old shape") and read records files, so they
depend on these frozen copies to keep their released behavior on skip-version installs.

Current runtime code must never import this module.
