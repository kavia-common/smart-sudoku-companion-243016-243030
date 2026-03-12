#!/bin/bash
cd /home/kavia/workspace/code-generation/smart-sudoku-companion-243016-243030/sudoku_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

