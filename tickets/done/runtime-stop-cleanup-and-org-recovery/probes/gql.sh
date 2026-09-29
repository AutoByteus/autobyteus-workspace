#!/bin/bash
# usage: gql.sh '<json body>'
curl -s -m 120 http://127.0.0.1:29695/graphql -H 'content-type: application/json' -d "$1"
