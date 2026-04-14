## ADDED Requirements

### Requirement: Floating chat bubble
The system SHALL display a floating chat bubble icon fixed at the bottom-right corner of every page. The bubble MUST be visible on all screen sizes and not obstruct main content.

#### Scenario: Bubble visible on page load
- **WHEN** any page loads
- **THEN** a circular chat bubble icon is visible at the bottom-right corner

#### Scenario: Bubble does not obstruct content
- **WHEN** user scrolls any page
- **THEN** the bubble remains fixed at bottom-right and does not overlap primary content text

### Requirement: Chat panel expand and collapse
The system SHALL allow users to click the bubble to expand a chat panel, and click a close button or the bubble again to collapse it. Panel state MUST persist during navigation within the same browser tab.

#### Scenario: Expand chat panel
- **WHEN** user clicks the chat bubble
- **THEN** a chat panel slides up/opens above the bubble showing the conversation area

#### Scenario: Collapse chat panel
- **WHEN** user clicks the close button or the bubble while panel is open
- **THEN** the chat panel closes and only the bubble remains visible

### Requirement: Send and receive messages
The system SHALL allow users to type a message in the input area and send it. The system MUST display the user's message immediately and stream the model's reply in real time (typing effect).

#### Scenario: Send a message
- **WHEN** user types text and presses Enter or clicks the send button
- **THEN** the user message appears in the chat history and a loading indicator shows while waiting for reply

#### Scenario: Receive streamed reply
- **WHEN** the model begins responding
- **THEN** tokens appear incrementally in the assistant message bubble (typing effect via SSE)

#### Scenario: Empty message prevented
- **WHEN** user attempts to send an empty or whitespace-only message
- **THEN** the system does not send the request

### Requirement: Conversation history persistence
The system SHALL persist conversation history in browser localStorage. History MUST survive page refresh and cross-page navigation. Users MUST be able to clear history.

#### Scenario: History survives refresh
- **WHEN** user refreshes the page
- **THEN** previous conversation messages are restored in the chat panel

#### Scenario: Clear history
- **WHEN** user clicks the "clear conversation" button
- **THEN** all messages are removed from display and localStorage

### Requirement: Thinking mode toggle
The system SHALL provide a "思考模式" (thinking mode) toggle switch in the chat panel header. The toggle MUST default to OFF. When ON, the request payload MUST include the thinking/reasoning parameter supported by the model.

#### Scenario: Toggle default state
- **WHEN** chat panel opens for the first time
- **THEN** the thinking mode toggle is OFF

#### Scenario: Enable thinking mode
- **WHEN** user turns ON the thinking mode toggle
- **THEN** subsequent requests include the thinking/reasoning parameter and the model's thinking process is displayed in a collapsible block

#### Scenario: Disable thinking mode
- **WHEN** user turns OFF the thinking mode toggle
- **THEN** subsequent requests do not include the thinking parameter

### Requirement: Model selector
The system SHALL display a model selector dropdown in the chat panel header. The selector MUST show the currently active model and list all available models. Changing the model MUST take effect on the next message sent.

#### Scenario: Default model selected
- **WHEN** chat panel opens for the first time
- **THEN** the model selector shows "qwen3.6-plus" as the active model

#### Scenario: Switch model
- **WHEN** user selects a different model from the dropdown
- **THEN** the next message uses the newly selected model

### Requirement: Error display
The system SHALL display user-friendly error messages when API calls fail (network error, rate limit, server error). The error MUST appear in the chat area, not as a browser alert.

#### Scenario: Network error
- **WHEN** the API request fails due to network issues
- **THEN** an error message appears in the chat area indicating connection failure

#### Scenario: API error response
- **WHEN** the API returns a non-2xx status
- **THEN** an error message appears showing a human-readable description

### Requirement: Responsive layout
The system SHALL adapt the chat panel size for mobile and desktop viewports. On mobile, the panel MUST expand to near-full-screen. On desktop, the panel MUST be a fixed-width side panel.

#### Scenario: Desktop layout
- **WHEN** viewport width >= 768px
- **THEN** chat panel is a fixed-width (380px) floating panel at bottom-right

#### Scenario: Mobile layout
- **WHEN** viewport width < 768px
- **THEN** chat panel expands to full width and near-full height
