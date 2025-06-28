#!/bin/bash

echo "Building Inkfinity for production..."

# Install dependencies
npm install

# Build the React app
npm run build

echo "Build completed successfully!" 