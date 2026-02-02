#!/bin/bash
cd /home/kavia/workspace/code-generation/commercepro-platform-208447-208456/ecommerce_backend
npm run lint
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

