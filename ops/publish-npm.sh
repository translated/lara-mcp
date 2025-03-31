#!/bin/bash
set -e

# Validate environment variables
if [ -z "$NPM_TOKEN" ]; then
  echo "Error: NPM_TOKEN is not set"
  echo "Please run: export NPM_TOKEN=your_npm_token"
  exit 1
fi

# Check if logged in to npm
if ! npm whoami &> /dev/null; then
  echo "Logging in to npm..."
  # Create .npmrc file with auth token
  echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# Build the package
echo "Building package..."
pnpm run build

# Publish to npm
echo "Publishing to npm..."
pnpm publish --no-git-checks --access public

echo "Package published successfully!" 