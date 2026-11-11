# PROJECT ORANGE: Access Terminal

A browser-based, offline-capable access-code and countdown terminal for the FutureSmarts escape room.

## Files

- `index.html` — markup; open this to run the application
- `style.css` — PROJECT ORANGE theme
- `app.js` — countdown, code validation, persistence and facilitator controls

No dependencies or build step are required. On GitHub Pages, publish the repository root on the selected branch to host the app.

## Game sequence

- Room 1: **62841** (5 digits) → Room 2
- Room 2: **83046** (5 digits) → Room 3 Stage 1
- Room 3 Stage 1: facilitator marks crossword complete → Stage 2
- Room 3 Stage 2: **6654** (4 digits) → success screen

The timer starts at 30:00, is controlled by Start/Pause/Resume, and deducts 60 seconds immediately for an incorrect code. Time expires at 00:00; a correct final code stops the clock.

## Facilitator safeguards

- **Pause the timer before selecting or re-selecting a room on Home.** Room buttons are disabled while running.
- Home navigation is always available, but does not stop the countdown.
- Manual room switching keeps remaining time and wrong attempts; switching a previously started session asks for confirmation.
- Back, forward, reload and revisiting the page do not change the saved stage or reset the timer.
- Closing the browser while the timer is running does **not** pause time; elapsed wall-clock time is accounted for when reopening. **Pause first** if stopping for a technical issue.
- An interrupted session can be continued from the Home page using **Continue Current Session**.
- Reset prompts for confirmation once a session has started or a room was selected.
- End screens are terminal until reset.
- The app warns if browser storage cannot save progress or another tab changes the same session.

## Limitations

- Save state is local to the current browser/profile/device (via `localStorage`). Do not open multiple working tabs of the same session; the app warns about concurrent edits but cannot coordinate them.
- Clearing browser storage, using private/incognito mode, changing devices or resetting the browser can lose progress.
- Access codes are stored in client-side JavaScript and are visible to someone inspecting source. This is suitable for a facilitator-operated game, not for security-sensitive validation.
- There is no cloud leaderboard or cross-device sync.

## Offline backup

`PROJECT_ORANGE_Access_Terminal_Standalone.html` (provided separately) contains exactly the same CSS and JS embedded into a single file; it is convenient to keep on a USB drive.
