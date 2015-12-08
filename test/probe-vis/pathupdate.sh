#!/usr/bin/env bash
base="path-"
ext=".json"
name=$base$1$ext

curl -X PUT -H "Content-type: application/perfsonar+json" -d @$name http://dev.crest.iu.edu:8889/paths/564219c6e779897fa66157d7
