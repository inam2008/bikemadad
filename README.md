# Roadside Buddy

Objective

Create a highly responsive, human-centered UI/UX application designed for quick motorcycle roadside assistance. The app must feel warm, intuitive, and modern, completely avoiding generic or robotic AI aesthetic templates. Fully support both Light and Dark modes across all user roles.

1. Role Selection & Dedicated Entry Point

 * Initial Screen: Before displaying any registration or login fields, present a clean, visually distinct role selection screen asking: "How are you using this app?"

   * Option 1: "I Need Assistance" (Customer)

   * Option 2: "I Am a Mechanic" (Mechanic)

 * Separated Workflows: Splitting the flow at the very beginning ensures a customized, low-friction experience tailored to each user type.

2. Authentication & Verification Flows

 * Customer Flow:

   * Sign-Up / Login: Simple registration requiring Full Name and Phone Number.

   * Verification: Authenticate via SMS or WhatsApp OTP.

   * Persistence: Save session state permanently so customers remain logged in unless explicitly logging out.

 * Mechanic Flow:

   * Sign-Up / Verification: One-time detailed registration requiring Full Name, Phone Number, CNIC / National ID Number, and a Photo/ID Upload.

   * Verification: Authenticate via SMS or WhatsApp OTP.

   * Persistence: Permanent single session after initial verification.

3. Location & Continuous Tracking Services

 * Automatically request and detect GPS location upon entering either customer or mechanic dashboards.

 * Live Mechanic Tracking: Continuously stream the mechanic's active GPS location so the customer can track the mechanic's real-time movement toward them on an interactive map.

4. Interface Specifications

Customer Interface

Clean, operational dashboard following the provided reference UI.

 * Service Selection ("What are the problems?"): Display clear visual icons for common issues: Tyre Puncture, Oil Change, Brake Failure, Engine Issue, and Other.

 * Vehicle & Service Details: Include targeted request fields for:

   * Bike Model

   * Bike Registration Number

   * Nearby Landmark

 * Sidebar Menu (Hamburger Icon / 3 Lines): Include a top-level sidebar menu containing a dedicated "Mechanical Parts Rate List" option. Tapping this option reveals a comprehensive price catalog for common motorcycle spare parts and components.

Mechanic Dashboard

Clean, operational dashboard following the provided reference UI.

 * Operational layout providing rapid access to incoming job requests and customer locations.

 * Prominent status toggle for Online / Offline availability.

Global Features

 * Seamless Dark/Light Mode toggle accessible across both Customer and Mechanic interfaces.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bikemadad.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/747f382c-1930-4131-b73f-ea8efa1180f6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
