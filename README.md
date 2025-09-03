# Echo GPT

A Chrome extension that enhances your ChatGPT experience by adding bookmark and pinned conversations feature.

[Demo](https://drive.google.com/file/d/1EmjtNlIfResxVNbjZccqmUYiSPvIQESu/view?usp=sharing)

## Features

- Bookmark your favorite ChatGPT conversations
- Pin your favorite ChatGPT conversations
- Easily access your bookmarked conversations through a sidebar
- Works directly on the ChatGPT web interface

## Installation

1. Clone this repository
2. Install dependencies: `bun install`
3. Build the extension: `bun run build`
4. Load the unpacked extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `build` directory

## Development

- Start development server: `bun run dev`
- Watch for changes: `bun run watch`
- Format code: `npm run fmt`
- Build and create ZIP: `npm run zip`

## Technologies

- React
- TypeScript
- Vite
- TailwindCSS
- Chrome Extension Manifest V3

## License

[MIT](LICENSE)
