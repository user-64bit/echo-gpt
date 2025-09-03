# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Echo GPT is a Chrome extension that enhances the ChatGPT experience by adding bookmarking and pinned conversation features. It's built with React, TypeScript, and TailwindCSS using Vite and Chrome Extension Manifest V3.

## Development Commands

### Primary Commands
- `bun run dev` or `npm run dev` - Start development server with hot reload
- `bun run build` or `npm run build` - Build extension for production (compiles TypeScript then runs Vite build)
- `bun run watch` or `npm run watch` - Build and watch for changes during development

### Utility Commands
- `npm run fmt` - Format code using Prettier
- `npm run zip` - Build extension and create ZIP file for distribution
- `bun install` or `npm install` - Install dependencies

### Package Manager
This project uses Bun as the primary package manager (evidenced by `bun.lockb`), but npm commands work as alternatives.

## Architecture

### Chrome Extension Structure
The extension follows Chrome Extension Manifest V3 architecture with these key components:

- **Content Script** (`src/contentScript/index.ts`) - Main functionality that injects bookmark features into ChatGPT pages
- **Background Script** (`src/background/index.ts`) - Service worker (currently minimal)
- **Popup** (`src/popup/`) - Extension popup interface
- **Side Panel** (`src/sidepanel/`) - Chrome extension side panel
- **Options** (`src/options/`) - Extension options page
- **DevTools** (`src/devtools/`) - DevTools integration

### Core Functionality
The main feature is implemented in the content script which:

1. **Bookmark System**: Adds bookmark buttons to ChatGPT conversation pages, stores bookmarks in Chrome storage
2. **Sidebar Interface**: Creates a slide-out sidebar showing all bookmarks with pin/unpin functionality
3. **Storage**: Uses `chrome.storage.sync` to persist bookmarks across devices
4. **URL Targeting**: Only activates on `https://chatgpt.com/*` pages

### Key Data Structures
```typescript
interface Bookmark {
  id: number
  title: string
  url: string
  createdAt: string
  pinned: boolean
}
```

### Build Configuration
- **Vite Config**: Uses `@crxjs/vite-plugin` for Chrome extension building
- **Manifest**: Dynamically generated from `src/manifest.ts`
- **Output**: Builds to `build/` directory
- **Permissions**: Requires `sidePanel`, `storage`, and `tabs` permissions

## File Structure Patterns
- React components use `.tsx` extension
- TypeScript files use `.ts` extension  
- Each component folder contains an `index.tsx` and component file
- Manifest is defined in TypeScript (`src/manifest.ts`) and compiled during build
- TailwindCSS classes are used extensively for styling

## Testing and Quality
No test framework is currently configured. The project uses:
- TypeScript for type checking (`tsc` in build command)
- Prettier for code formatting
- ESNext target with strict TypeScript settings

## Extension Installation
1. Build the extension: `bun run build`
2. Load unpacked extension from `build/` directory in Chrome developer mode