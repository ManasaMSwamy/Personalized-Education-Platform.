<img width="1920" height="1080" alt="Screenshot (7)" src="https://github.com/user-attachments/assets/4b6baea4-2c4c-4d8b-83ce-aee254ac2661" />
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# EduSlide AI

A React + Vite AI-powered presentation app for generating and interacting with study materials, presentations, certificates, and adaptive learning features.

## Features

- AI-powered slide and presentation creation
- PDF assistant and chatbot support
- Emotion-driven learning dashboard
- YouTube and knowledge pulse integration
- Certificate generation and course reporting

## Tech Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS
- Express server for backend routes
- Gemini / OpenAI APIs for AI services
- PDF and PPTX generation libraries

## Setup

### Prerequisites

- Node.js 18+ installed

### Install

1. Install dependencies:
   `npm install`

2. Create or update `.env.local` with your API keys and environment variables.

3. Run the development server:
   `npm run dev`

4. Open the app at:
   `http://localhost:3000`

## Environment Variables

Copy `.env.example` to `.env.local` and set any required values, for example:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

## Available Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — build production assets
- `npm run preview` — preview the production build locally
- `npm run clean` — remove the `dist` folder
- `npm run lint` — run TypeScript type checks

## Project Structure

- `src/` — application source files
- `src/components/` — React components and UI pages
- `src/services/` — API and AI service wrappers
- `server/` — backend route handlers
- `public/` — static assets (if present)

## Notes

- Ensure `.env.local` is not committed with secret keys.
- The app may require additional API configuration depending on your AI provider.

---

Made for AI-powered learning and presentation generation.
