# Frontend Refinement & Chat Widget Redesign

## Requirements Summary

Refine the existing warm white/glass blog aesthetic (PaperMod + custom hero/cards) while overhauling the chat widget with four major improvements: visual redesign, markdown rendering, welcome screen, and animations.

## Acceptance Criteria

1. Chat widget visually matches the blog's glassmorphism aesthetic (frosted glass panel, warm tones, consistent border radius/shadows)
2. Assistant messages render markdown: bold, italic, links, inline code, code blocks with syntax highlighting
3. Chat opens with a welcome screen showing greeting + 3-4 suggested prompts; clicking a prompt sends it immediately
4. Open/close panel uses smooth CSS transitions (scale + fade); streaming messages have polished typing indicator
5. Dark mode fully supported for all new chat styles
6. Mobile responsive: chat goes full-screen on small viewports (existing behavior preserved)
7. No regressions to existing hero, card, or navigation styles

## Implementation Steps

### Phase 1: Chat Visual Redesign

**File: `assets/css/extended/chat-widget.css`** — Full rewrite

- **Chat bubble button**: Replace flat circle with glassmorphism pill. Use `backdrop-filter: blur()`, warm gradient background (`linear-gradient(135deg, #0f172a, #334155)`), soft shadow matching `.blog-hero__action--primary`. Add subtle pulse animation on first load to draw attention.
- **Chat panel**: Increase `border-radius` to `20px`, add `backdrop-filter: blur(24px)`, warm frosted glass background (`rgba(255,255,255,0.82)` light / `rgba(15,23,42,0.88)` dark). Rounded corners matching blog's `28px` aesthetic. Deeper layered shadows like hero cards.
- **Chat header**: Frosted glass bar, model select styled as pill dropdown, think toggle as modern switch. Warm accent color for title.
- **Message bubbles**:
  - User: warm dark gradient (matching hero primary action), rounded `16px` with `4px` corner cut
  - Assistant: frosted glass card style (`rgba(255,255,255,0.6)` light / `rgba(30,41,59,0.6)` dark), subtle border, `16px` radius
  - Error: soft warm red (`#fef2f2` light / `rgba(127,29,29,0.15)` dark)
- **Input area**: Rounded textarea with glass background, send button as gradient circle-arrow, matches search form styling
- **Thinking block**: Refined collapsible with animated chevron (replace text `▶` with SVG), dimmed background

### Phase 2: Markdown Rendering in Chat

**File: `layouts/partials/chat-widget.html`** — JS changes

- Add a lightweight markdown parser (inline ~50 lines, no dependency):
  - Bold `**text**` → `<strong>`
  - Italic `*text*` → `<em>`
  - Inline `` `code` `` → `<code>` with styled background
  - Fenced ``` ``` ``` code blocks → `<pre><code>` with language class
  - Links `[text](url)` → `<a>` tags
  - Line breaks preserved
- Style code blocks in CSS:
  - Dark background with monospace font
  - Copy button (top-right corner)
  - Horizontal scroll for long lines
  - Language label badge
- Replace `formatAssistantHtml()` with new `renderMarkdown()` function
- Keep existing link auto-detection as fallback for bare URLs

### Phase 3: Chat Welcome Screen

**File: `layouts/partials/chat-widget.html`** — HTML + JS

- Add welcome container inside `.chat-messages` that shows when `messages.length === 0`
- Welcome layout:
  - Greeting: "Hi! I'm the blog AI assistant. Ask me anything about the articles here."
  - 3-4 suggested prompt chips (styled like `.blog-hero__quicklink` pills)
  - Example prompts: "What topics does this blog cover?", "Summarize the latest post", "Tell me about the author"
- Prompt chips read from Hugo data config (`data/chat.yaml` → `suggestedPrompts` array) for easy editing
- Clicking a chip populates input and triggers `sendMessage()`
- Welcome hides permanently once first user message is sent

### Phase 4: Chat Animations

**File: `assets/css/extended/chat-widget.css`** + **`layouts/partials/chat-widget.html`**

- **Panel open/close**: Replace `display:none/flex` toggle with CSS transitions:
  - Use `transform: scale(0.95) translateY(10px)` + `opacity: 0` for hidden state
  - Transition to `scale(1) translateY(0)` + `opacity: 1` for open
  - `pointer-events: none` when closed (instead of `display: none`)
  - Smooth 280ms cubic-bezier easing
- **Bubble click feedback**: Scale bounce animation on click
- **Message entrance**: New messages slide in from bottom with fade (CSS `@keyframes`, `animation: msgSlideIn 0.3s ease`)
- **Streaming indicator**: Replace bouncing dots with a smooth gradient shimmer/pulse that's more refined
- **Thinking block expand/collapse**: Animate height with `max-height` transition instead of display toggle

### Phase 5: Frontend Polish (Non-Chat)

**File: `assets/css/extended/custom.css`** — Minor refinements

- Refine card hover transitions (slightly faster, smoother easing curve)
- Ensure consistent `border-radius` across all components (cards `28px`, buttons `16px`, chips `999px`)
- Smooth scroll-behavior for page navigation
- Minor spacing normalization for footer/pagination area

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Markdown parser introduces XSS | Sanitize HTML output, only allow safe tags (strong, em, code, pre, a, br) |
| CSS transitions cause layout shift on mobile | Test full-screen mobile mode; use transform/opacity only (GPU-composited) |
| Welcome screen adds payload size | Keep it minimal HTML + CSS; suggested prompts from Hugo build-time data |
| Backdrop-filter not supported in older browsers | Provide solid-color fallback for `backdrop-filter` |

## Verification Steps

1. Open chat → welcome screen visible with prompt chips
2. Click a prompt → message sent, assistant replies with streaming
3. Assistant reply contains bold, code, links → all rendered correctly
4. Toggle dark mode → chat panel, messages, code blocks all adapt
5. Resize to mobile → chat goes full screen, all features work
6. Close/reopen chat → smooth animation, conversation history preserved
7. Check existing hero, cards, navigation → no visual regressions

## File Change Summary

| File | Change Type |
|------|------------|
| `assets/css/extended/chat-widget.css` | Major rewrite (visual redesign + animations) |
| `assets/css/extended/custom.css` | Minor polish additions |
| `layouts/partials/chat-widget.html` | Add markdown renderer, welcome screen, animation JS |
| `data/chat.yaml` | Add `suggestedPrompts` config (if not exists) |
