## ADDED Requirements

### Requirement: API proxy endpoint
The system SHALL provide an API proxy endpoint that accepts chat completion requests from the frontend and forwards them to DashScope API. The proxy MUST NOT expose the API key to the client.

#### Scenario: Successful proxy request
- **WHEN** frontend sends a POST request with messages and model name to the proxy
- **THEN** the proxy forwards the request to DashScope with the API key injected server-side and streams the response back

#### Scenario: Missing required fields
- **WHEN** frontend sends a request missing `messages` or `model` field
- **THEN** the proxy returns HTTP 400 with a JSON error body

### Requirement: Streaming support
The proxy MUST support SSE (Server-Sent Events) streaming by passing `stream: true` to DashScope and forwarding each chunk to the client as-is.

#### Scenario: Streamed response forwarding
- **WHEN** DashScope returns a chunked SSE response
- **THEN** the proxy forwards each chunk to the client in real time without buffering the full response

### Requirement: CORS headers
The proxy MUST include appropriate CORS headers allowing requests from the blog's origin domain.

#### Scenario: Preflight request
- **WHEN** browser sends an OPTIONS preflight request
- **THEN** proxy responds with 200 and correct Access-Control-Allow-Origin, Access-Control-Allow-Headers, Access-Control-Allow-Methods

#### Scenario: Cross-origin POST
- **WHEN** browser sends a POST from the blog domain
- **THEN** response includes Access-Control-Allow-Origin matching the blog origin

### Requirement: Rate limiting
The proxy SHALL implement basic rate limiting to prevent abuse. The limit MUST be configurable. Default: 30 requests per minute per IP.

#### Scenario: Within rate limit
- **WHEN** a client sends requests below the limit
- **THEN** all requests are processed normally

#### Scenario: Rate limit exceeded
- **WHEN** a client exceeds 30 requests in one minute
- **THEN** proxy returns HTTP 429 with a Retry-After header

### Requirement: API key security
The API key MUST be stored as an environment variable in the proxy runtime (e.g., Cloudflare Worker secret). It MUST NOT appear in frontend code, HTML source, or any client-accessible resource.

#### Scenario: Key not in response
- **WHEN** proxy forwards a response to the client
- **THEN** the API key does not appear anywhere in response headers or body

### Requirement: Model allowlist
The proxy SHALL validate that the requested model is in a configured allowlist. Requests for non-allowed models MUST be rejected.

#### Scenario: Allowed model
- **WHEN** request specifies model "qwen3.6-plus"
- **THEN** proxy forwards the request

#### Scenario: Disallowed model
- **WHEN** request specifies an unrecognized model name
- **THEN** proxy returns HTTP 400 with error "model not allowed"
