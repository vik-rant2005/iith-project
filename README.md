# 🏥 ClinIQ — Clinical FHIR Converter

<div align="center">

![ClinIQ Banner](https://img.shields.io/badge/ClinIQ-Clinical%20FHIR%20Converter-0ea5e9?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0xIDE1aC0ydi02aDJ2NnptMC04aC0yVjdoMnYyeiIvPjwvc3ZnPg==)

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)
[![Hacktoberfest](https://img.shields.io/badge/Hacktoberfest-2024-FF6D00?style=flat-square&logo=hacktoberfest)](https://hacktoberfest.com)

**Convert hospital clinical PDFs into ABDM/NHCX-compliant FHIR R4 bundles for India's Ayushman Bharat Digital Mission.**

[📖 Documentation](#) · [🐛 Report Bug](../../issues) · [✨ Request Feature](../../issues)

</div>

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Running with Ollama (Local AI)](#-running-with-ollama-local-ai)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [Hacktoberfest](#-hacktoberfest)
- [Deployment](#-deployment)
- [License](#-license)

---

## 🏥 About the Project

**ClinIQ** is an open-source clinical document converter that transforms hospital PDF records into structured **FHIR R4** bundles compliant with India's **Ayushman Bharat Digital Mission (ABDM)** and **NHCX** standards.

It leverages local AI models via **Ollama** (no cloud required) combined with **PDF.js** and **Tesseract.js** OCR to intelligently extract and map clinical data — making interoperability accessible for healthcare providers across India.

### ✨ Key Features

- 📄 **PDF Ingestion** — Upload and parse clinical documents with PDF.js
- 🔍 **OCR Support** — Extract text from scanned documents via Tesseract.js
- 🤖 **Local AI Extraction** — Powered by Ollama (no data leaves your machine)
- 🏗️ **FHIR R4 Output** — Generates ABDM/NHCX-compliant bundles
- 🌙 **Dark Mode** — Full theme support via next-themes
- ⚡ **Blazing Fast** — Built on Vite with SWC compilation

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript |
| **Build Tool** | Vite 5 + SWC |
| **Styling** | Tailwind CSS + shadcn/ui |
| **AI Extraction** | Ollama (local LLM) |
| **PDF Parsing** | PDF.js |
| **OCR** | Tesseract.js |
| **Forms** | React Hook Form + Zod |
| **State** | TanStack Query |
| **Testing** | Vitest + Testing Library |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- **Node.js** >= 18.x → [Install via nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** >= 9.x
- **Ollama** → [ollama.com](https://ollama.com) *(for AI extraction)*

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/cliniq.git

# 2. Navigate into the project
cd cliniq

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

Open your browser at **http://localhost:8080** 🎉

### Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run preview    # Preview production build
npm run test       # Run tests (Vitest)
npm run test:watch # Watch mode testing
npm run lint       # Lint with ESLint
```

---

## 🤖 Running with Ollama (Local AI)

ClinIQ uses **Ollama** to run AI models locally — your clinical data never leaves your machine.

### Step 1 — Install Ollama

```bash
# Linux / macOS
curl -fsSL https://ollama.com/install.sh | sh

# Windows — download from
# https://ollama.com/download
```

### Step 2 — Pull a Model

```bash
# Recommended (fast, good quality ~2GB)
ollama pull llama3.2

# Higher accuracy for medical/JSON tasks (~5GB)
ollama pull llama3.1

# Lightweight option for low RAM systems
ollama pull phi3
```

### Step 3 — Start Ollama Server

```bash
ollama serve
```

> The API will be available at `http://localhost:11434`

### Step 4 — Verify Installation

```bash
# Check server is running
curl http://localhost:11434/api/tags

# See all installed models
ollama list

# See currently loaded models
ollama ps
```

### Step 5 — Run the App

In a **separate terminal**, start the dev server:

```bash
npm run dev
```

Both terminals must stay open — Ollama in one, the app in the other.

### Troubleshooting Ollama

| Issue | Fix |
|-------|-----|
| `address already in use` | Ollama is already running — just run `npm run dev` |
| `AI extraction failed` | Check `ollama ps` and ensure a model is loaded |
| CORS errors | Start Ollama with `OLLAMA_ORIGINS=* ollama serve` |
| Model not found | Run `ollama list` and verify the model name matches config |

```bash
# Stop a running model (free RAM)
ollama stop llama3.2

# Stop the Ollama server
pkill ollama          # Linux/macOS
taskkill /IM ollama.exe /F   # Windows
```

---

## 📁 Project Structure

```
cliniq/
├── src/
│   ├── components/       # Reusable UI components (shadcn/ui)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and helpers
│   ├── pages/            # Route-level page components
│   ├── services/         # API calls, Ollama integration, FHIR mapping
│   ├── test/             # Test setup and utilities
│   └── main.tsx          # App entry point
├── public/               # Static assets
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 🤝 Contributing

Contributions are what make the open-source community amazing. Any contributions you make are **greatly appreciated**!

### How to Contribute

```bash
# 1. Fork the repository
# 2. Create your feature branch
git checkout -b feature/amazing-feature

# 3. Commit your changes
git commit -m "feat: add amazing feature"

# 4. Push to the branch
git push origin feature/amazing-feature

# 5. Open a Pull Request
```

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use For |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation changes |
| `style:` | Code style / formatting |
| `refactor:` | Code refactoring |
| `test:` | Adding or updating tests |
| `chore:` | Build / tooling changes |

---

## 🎃 Hacktoberfest

**ClinIQ is participating in Hacktoberfest!**

We welcome contributions of all sizes. Look for issues tagged:

- `hacktoberfest` — all eligible issues
- `good first issue` — great for first-time contributors
- `help wanted` — issues we'd love community help on

> ⭐ Don't forget to star the repo if you find it useful!

---

## ☁️ Deployment

```bash
# Build for production
npm run build

# Preview the production build locally
npm run preview
```

The `dist/` folder can be deployed to any static hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">

Made with ❤️ for India's Digital Health Mission

**[⬆ Back to Top](#-cliniq--clinical-fhir-converter)**

</div>
