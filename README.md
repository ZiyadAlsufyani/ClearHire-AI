# ClearHire AI — Autonomous Enterprise Onboarding Agent

An **Autonomous Enterprise** web application built with **Next.js (App Router, TypeScript)**, **Tailwind CSS**, **shadcn/ui**, and **Google Gemini Function Calling (`@google/genai`)**.

ClearHire AI receives messy, unstructured hiring requests (or photos of handwritten interview notes), cross-references them against company HR & IT policies, and autonomously generates structured onboarding artifacts:
1. **Official Employment Offer Contract** (Rendered Markdown + 1-Click PDF Export)
2. **IT & Zero-Trust IAM Provisioning Ticket** (Visual Asset Cards + Structured JSON Payload)
3. **Real-Time Agentic State Visualizer** & **Human-in-the-Loop Governance Override Gate**

---

## Architecture & Gemini Function Calling Tools (`app/api/agent/route.ts`)

The backend API configures the `@google/genai` client with three explicit `FunctionDeclaration` tools:
- `verify_hr_policy(role, salary, custom_requests)` -> Returns `{ is_approved: boolean, policy_warnings: string[], matched_band, ... }`
- `generate_offer_letter(candidate_name, role, salary, start_date)` -> Returns a complete KSA Labor Law compliant Markdown employment contract.
- `create_it_ticket(role, hardware_requests)` -> Returns a structured JSON payload for IT hardware and Zero-Trust IAM provisioning.

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your Gemini API Key (Optional — also configurable in the UI navbar):**
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(You can also paste your API key directly in the top navigation bar via the **"Gemini API Key"** button, or test immediately using the built-in deterministic tool-calling engine.)*

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

