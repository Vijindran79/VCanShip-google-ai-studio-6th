<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1-yZZYxhtgZRmQXxbjUKQWCrXDVGu_Qmz

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Spec Kit (Specify) Integration

This project has been configured with **Spec Kit (Specify)**, a spec-driven development toolkit from GitHub.

### What is Specify?

Specify is a tool that helps teams practice spec-driven development by providing templates and workflows for AI-assisted coding.

### Setup

Specify has been initialized in this repository with the following configuration:
- **AI Assistant**: GitHub Copilot
- **Script Type**: POSIX Shell (sh)
- **Project**: VCanShip-google-ai-studio-6th

### Usage

#### Check Specify Installation
```bash
# Check if all required tools are available
./.specify/specify.sh check
```

#### View Project Status
```bash
# Display Specify configuration status
./.specify/specify.sh status
```

#### Direct Specify Commands
```bash
# Run Specify commands directly using uvx
uvx --from git+https://github.com/github/spec-kit.git specify check
uvx --from git+https://github.com/github/spec-kit.git specify --help
```

### Files

- `.specify/` - Specify configuration directory
  - `config.json` - Main configuration file
  - `specify.sh` - Helper script for common operations
  - `README.md` - Specify documentation
