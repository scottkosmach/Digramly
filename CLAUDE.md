**ALWAYS use the Claude in Chrome MCP tools instead. Full workflow:**
1. **Start the dev server** via Bash (run in background):
   ```bash
   npm run dev:web &
   ```
2. **Get Chrome tabs** — call `tabs_context_mcp` (with `createIfEmpty: true` if no group exists).
   - If no tabs exist, call `tabs_create_mcp` to create one.
3. **Navigate** — use `navigate` to go to `http://localhost:3000`.
4. **Wait for page load** — use `computer` with `action: "wait"` (2-3 seconds) after navigation.
5. **Take screenshot** — use `computer` with `action: "screenshot"`. This is the ONLY way to capture screenshots.
6. **Interact & verify** — use `find`, `read_page`, `form_input`, `computer` (click/type/scroll) as needed.
7. The app requires Supabase auth — if redirected to `/login`, ask the user to sign in.
8. **Never tell the user to verify manually** — always take a screenshot and share proof.
**If the Chrome extension is not connected**, call `switch_browser` and ask the user to click "Connect" in their Chrome browser.
