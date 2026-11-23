# Vij Industries Employee Chat

This document summarizes the employee-chat feature added to Sim City.

## What was added

- **Employee chat screen:** `EmployeeChatView.tsx` provides the chat experience inside the company area, including group selection, messages, member details, and composing/sending messages.
- **Chat navigation and layout:** `CompanySectionNav.tsx`, `ChatMessageList.tsx`, `ChatMessageCard.tsx`, `ChatMemberSidebar.tsx`, `ChatComposer.tsx`, and `ChatVibeBar.tsx` split the interface into reusable pieces. Company navigation and the app sidebar/top bar were updated to make the chat reachable and fit it into the existing layout.
- **Chat data model:** `chatTypes.ts` defines message, group, member, and chat-state types. `chatGroups.ts` defines employee groups, while `chatMembership.ts` determines who belongs in each conversation.
- **Message generation:** `chatEngine.ts` coordinates chat activity. Supporting modules provide message templates and generation (`chatMessageBank.ts`, `chatMessageFactory.ts`), employee archetypes and tones (`chatArchetypes.ts`, `chatTones.ts`), system messages (`chatSystemMessages.ts`), group phases and conversation slots (`chatPhase.ts`, `chatSlots.ts`), and seeded conversation history (`chatSeedHistory.ts`).
- **Natural variation and relevance:** `chatSignals.ts` derives conversation cues from the simulation, and `chatAntiRepeat.ts` helps avoid repetitive generated messages. Separate banks (`chatBankAnxious.ts`, `chatBankFormal.ts`, `chatBankSystem.ts`) support distinct employee and system voices.
- **Simulation lifecycle:** `advanceCityDay.ts` advances chat activity with the city day, and `chatRetention.ts` handles chat-history retention.
- **Persistence and compatibility:** `storage.ts`, `useCityPersistence.ts`, `cityMigration.ts`, `types.ts`, and `constants.ts` were updated to save and load chat state and support existing city saves. `seeder.ts` seeds the feature for new simulations.
- **Project integration:** `App.tsx`, `CompaniesView.tsx`, `Sidebar.tsx`, `TopBar.tsx`, and `changelog.md` were updated to integrate and describe the feature. `package.json` and `package-lock.json` reflect the dependency changes made with the implementation.

## Files added

`ChatComposer.tsx`, `ChatMemberSidebar.tsx`, `ChatMessageCard.tsx`, `ChatMessageList.tsx`, `ChatVibeBar.tsx`, `CompanySectionNav.tsx`, `EmployeeChatView.tsx`, `chatAntiRepeat.ts`, `chatArchetypes.ts`, `chatBankAnxious.ts`, `chatBankFormal.ts`, `chatBankSystem.ts`, `chatEngine.ts`, `chatGroups.ts`, `chatMembership.ts`, `chatMessageBank.ts`, `chatMessageFactory.ts`, `chatPhase.ts`, `chatRetention.ts`, `chatSeedHistory.ts`, `chatSignals.ts`, `chatSlots.ts`, `chatSystemMessages.ts`, and `chatTones.ts`.

## Files updated

`App.tsx`, `CompaniesView.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `advanceCityDay.ts`, `changelog.md`, `cityMigration.ts`, `constants.ts`, `package.json`, `package-lock.json`, `seeder.ts`, `storage.ts`, `types.ts`, and `useCityPersistence.ts`.
