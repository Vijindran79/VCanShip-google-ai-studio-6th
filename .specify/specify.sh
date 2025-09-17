#!/bin/bash

# Specify Project Helper Script
# This script provides common Specify operations

set -e

echo "🔧 Specify Helper Script for VCanShip-google-ai-studio-6th"
echo "=================================================="

case "${1:-}" in
  "check")
    echo "Checking Specify tools..."
    uv tool run --from git+https://github.com/github/spec-kit.git specify check
    ;;
  "status")
    echo "Project Status:"
    echo "- Specify: ✅ Installed"
    echo "- AI Assistant: GitHub Copilot"
    echo "- Script Type: POSIX Shell (sh)"
    echo "- Project: VCanShip-google-ai-studio-6th"
    ;;
  "help"|*)
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  check   - Check Specify tools installation"
    echo "  status  - Show project status"
    echo "  help    - Show this help message"
    ;;
esac