# career-ops — Command Center UI Plan (Salman Agha v1.0)

This document blueprints the transition of the **career-ops** CLI system into a premium, **browser-based dashboard**.

## 🎯 Goal
Provide **Salman Agha** with a high-fidelity "Control Tower" to manage his **Forward Deployed AI Engineer** and **AI Engineer** applications visually.

## 🏛️ Phase 1: Dashboard Core (COMPLETED ✅)
-   **Tech Stack**: Vite + React + Lucide Icons + Custom Glassmorphism CSS.
-   **Architecture**: Tabbed navigation (Dashboard, Evaluations, Settings).
-   **Primary Feature**: The **Interactive Kanban Board**.
    -   Displays cards for **Palantir**, **OpenAI**, and **Scale AI**.
    -   Color-coded match scores (A-Match and B-Match).
-   **User Status**: Persistent profile sync indicator ("Salman Agha ✓").

## 📈 Phase 2: Live Integration (NEXT STEPS 🛠️)
1.  **Dynamic Data Bridge**:
    -   Connect the React frontend to the local `/reports/*.md` and `/data/applications.md` files.
    -   Auto-populate the Kanban board when a new evaluation is created.
2.  **Strategic Report Viewer**:
    -   Create a full-screen, formatted reader for the **Palantir evaluation report**.
    -   Add tabs for: Match Analysis, Gaps, and Interview Prep.
3.  **PDF Generation Trigger**:
    -   Add a **"Export Custom CV"** button to each card.
    -   This will trigger the local `npm run pdf` command behind the scenes.

## 👔 Phase 3: Recruiter Outreach Power-Up
1.  **LinkedIn Assistant**:
    -   A visual text generator that drafts the "Perfect First Connection" for each role based on the report.
2.  **Interview Story Bank Hub**:
    -   A view to edit and browse your **STAR+R Master Stories** from `interview-prep/story-bank.md`.

## 🎨 Aesthetic Requirements
-   **Theme**: *Midnight Navy* (#0f172a) backdrop with *Indigo/Pink* (#6366f1/#ec4899) glowing accents.
-   **UX**: Smooth CSS transitions (cubic-bezier) on card hover to feel "physical" and premium.
-   **Typography**: **Outfit** for headers (Brand identity) and **Inter** for readability.
