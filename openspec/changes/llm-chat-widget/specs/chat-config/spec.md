## ADDED Requirements

### Requirement: Model list configuration
The system SHALL maintain a configurable list of available models. Each model entry MUST include an id (used in API calls) and a display label. The list MUST be defined in a single configuration source.

#### Scenario: Default model list
- **WHEN** no custom model list is provided
- **THEN** the system uses the default list: qwen3.6-plus, qwen3.5-plus, qwen3-max-2026-01-23, qwen3-coder-plus, qwen3-coder-next, glm-4.7, glm-5, kimi-k2.5, MiniMax-M2.5

#### Scenario: Add new model
- **WHEN** operator adds a new model entry to the configuration
- **THEN** the model appears in the frontend selector and is accepted by the proxy allowlist

### Requirement: Default model setting
The system SHALL define a default model identifier. The default MUST be "qwen3.6-plus". This default is used when no model has been explicitly selected by the user.

#### Scenario: Default model applied
- **WHEN** user opens chat for the first time without selecting a model
- **THEN** requests use "qwen3.6-plus"

### Requirement: Proxy endpoint configuration
The frontend MUST read the chat API proxy endpoint URL from Hugo build-time configuration (injected via environment variable). The URL MUST NOT be hardcoded.

#### Scenario: Proxy URL from env
- **WHEN** `CHAT_PROXY_URL` environment variable is set during Hugo build
- **THEN** the frontend uses that URL for API requests

#### Scenario: Fallback when proxy URL missing
- **WHEN** `CHAT_PROXY_URL` is not set
- **THEN** the chat widget displays a configuration error instead of allowing sends

### Requirement: Sensitive config isolation
All sensitive configuration (API keys) MUST reside exclusively in server-side environment variables (proxy runtime). Non-sensitive configuration (proxy URL, model list, default model) MAY be injected at Hugo build time.

#### Scenario: .env file contents
- **WHEN** operator inspects the .env file
- **THEN** it contains CHAT_PROXY_URL, CHAT_DEFAULT_MODEL, and model list — but NOT the DashScope API key (which lives in the proxy's environment)

### Requirement: Thinking mode parameter mapping
The configuration MUST define how the thinking mode toggle maps to API request parameters. For DashScope-compatible models, this means setting `enable_thinking: true` and optionally `thinking_budget` in the request body.

#### Scenario: Thinking mode parameter included
- **WHEN** thinking mode is enabled and user sends a message
- **THEN** the request body includes `enable_thinking: true` in the extra parameters
