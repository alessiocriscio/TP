# TripPulse - Project TODO

## Core Infrastructure
- [x] Database schema (Users, TripRequests, Offers, SavedTrips, Preferences, PriceSnapshots)
- [x] i18n system with IT/EN/ES/DE/FR translations
- [x] Design system (colors, typography, theme)
- [x] PWA manifest + service worker + offline support

## Backend
- [x] tRPC router: search_airports (typeahead, global IATA)
- [x] tRPC router: search_offers (LLM-powered, ranked 5-10 options)
- [x] tRPC router: refresh_offers (re-query cached offers)
- [x] tRPC router: trips CRUD (save, list, delete)
- [x] tRPC router: preferences (language, currency, budget split)
- [x] LLM integration for chat intake (AI SDK + Forge API)
- [x] Flight Data API integration (real prices via Data API, mock fallback)
- [x] Rate limiting + caching per trip request
- [x] Admin/debug page (protected, API errors/logs)

## Frontend - 6 Screens
- [x] Screen 1: Landing / Start (language select, profile, "Start planning" CTA)
- [x] Screen 2: Chat Intake (chat-like flow, branching logic)
- [x] Screen 3: Results List (5-10 options, Refresh button, Deal score)
- [x] Screen 4: Offer Detail (flight info, hotel/activities estimate, Book CTA)
- [x] Screen 5: Saved Trips (login required or guest hint)
- [x] Screen 6: Settings (language, currency, budget split, legal)

## UX & Mobile
- [x] Mobile-first responsive design
- [x] Bottom navigation bar
- [x] Full-screen app-like layout
- [x] Fast transitions with framer-motion
- [x] "Add to Home Screen" guidance (iOS + Android, shown once)
- [x] Offline-friendly: app shell loads offline, cached search results
- [x] Graceful offline screen when no cached data

## Auth & User
- [x] Google OAuth login (via Manus OAuth)
- [x] Guest mode fully usable
- [x] Save trips requires login

## Legal
- [x] Privacy Policy (draft)
- [x] Terms of Service (draft)
- [x] Affiliate disclosure (draft)

## Budget System
- [x] Flights-only budget option
- [x] Total-trip budget (flights + hotel + activities)
- [x] Editable split rule with default percentages
- [x] Clear budget breakdown display

## Tests
- [x] Vitest: auth.me, auth.logout
- [x] Vitest: airports.search (valid, IATA, gibberish, too short)
- [x] Vitest: trips.create, trips.get
- [x] Vitest: offers.search (structure, sort order)
- [x] Vitest: saved.list, saved.save (auth required)
- [x] Vitest: i18n translations (all keys, no empty values)

## Bug Fixes & Improvements
- [x] Fix: predefined buttons (City Break, Beach, etc.) open keyboard but don't send message
- [x] Rebuild ChatIntake: quick-reply buttons should send the text directly as a chat message
- [x] Improve AI chat flow: AI suggests destinations and guides the user step-by-step
- [x] Quick-reply buttons appear contextually based on AI conversation state
- [x] Fix: chat input bar obscured by bottom nav / browser UI on mobile (CSS/layout only)
- [ ] Fix: chat input bar hidden behind bottom nav on desktop + mobile (CSS/layout only)
