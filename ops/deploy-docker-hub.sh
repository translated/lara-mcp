#!/bin/bash
set -e

# Validate environment variables
if [ -z "$DOCKERHUB_USERNAME" ]; then
  echo "Error: DOCKERHUB_USERNAME is not set"
  exit 1
fi

if [ -z "$DOCKERHUB_TOKEN" ]; then
  echo "Error: DOCKERHUB_TOKEN is not set"
  exit 1
fi

export REGISTRY_NAMESPACE="translatednet"

echo "Logging in to Docker Hub..."
echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin

# Set repository name
REPO="${REGISTRY_NAMESPACE}/lara-mcp"

# Initialize tags array
TAGS=()

# Always add SHA tag
SHA=$(git rev-parse --short HEAD)
TAGS+=("$REPO:$SHA")

# Always add latest tag
TAGS+=("$REPO:latest")

# Check if we're on a tag
if [[ "$GITHUB_REF" == refs/tags/* ]]; then
  VERSION=${GITHUB_REF#refs/tags/}
  TAGS+=("$REPO:$VERSION")
fi

# Check if we're on a branch other than main
if [[ "$GITHUB_REF" == refs/heads/* && "$GITHUB_REF" != "refs/heads/main" ]]; then
  BRANCH=${GITHUB_REF#refs/heads/}
  TAGS+=("$REPO:$BRANCH")
fi

echo "Building Docker image..."
docker build -t temp-image .

# Tag and push the image with all our tags
for TAG in "${TAGS[@]}"; do
  echo "Tagging and pushing: $TAG"
  docker tag temp-image "$TAG"
  docker push "$TAG"
done

echo "Docker build and push completed successfully!" 