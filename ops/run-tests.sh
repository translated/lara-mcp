#!/bin/bash
set -e

# Install dependencies
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# Run tests
echo "Running tests..."
pnpm test
echo "Tests successfully passed"
