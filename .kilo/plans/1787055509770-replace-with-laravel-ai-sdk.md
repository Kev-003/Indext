# Plan: Replace hand-rolled AI layer with Laravel AI SDK

## Status: COMPLETED

## Confirmed facts
- `laravel/ai` is installed in `composer.json` (`^0.10.3`).
- `agent_conversations` / `agent_conversation_messages` migrations extend `Laravel\Ai\Migrations\AiMigration` — these ARE the package's own tables. Schema was NOT altered.
- `.env` has `LLM_PROVIDER=gemini`, `GEMINI_API_KEY` set, `GEMINI_MODEL=gemini-3.5-flash`.
- `config/ai.php` already configures the `gemini` provider with the correct key/env bindings.
- `DECISIONS.md` already records: "Component Tool-Calling Schema" and "Semantic Routing and Guardrails".

## Completed deletions
- `app/Services/LLM/LLMProvider.php`
- `app/Services/LLM/LLMProviderRouter.php`
- `app/Services/LLM/LLMStreamChunk.php`
- `app/Services/LLM/LLMResponse.php`
- `app/Services/LLM/SystemPromptBuilder.php`
- `app/Services/LLM/ToolRegistry.php`
- `app/Services/LLM/ToolDefinition.php`
- `app/Services/LLM/GeminiProvider.php`
- `app/Services/LLM/DeepSeekProvider.php`
- `app/Services/LLM/OpenAIProvider.php`
- `app/Services/BrandChatStore.php`
- `app/Services/LLM/Tools/BrandTools.php`

Kept:
- `app/Services/LLM/PromptGuardrailService.php`
- `app/Services/LLM/SemanticIntentFilter.php`

## Completed builds / modifications

### 1. `app/Ai/Agents/BrandingAgent.php`
- Implements `Agent`, `Conversational`, `HasTools`
- Uses `Promptable` and `RemembersConversations` traits
- `instructions()` ports the old `SystemPromptBuilder` logic, parameterized by `Brand` and optional `user->llm_methodology`
- `tools()` returns 24 SDK Tool instances
- `provider()` / `model()` default to `gemini` / `gemini-3.5-flash`

### 2. `app/Ai/Tools/` (24 classes)
All tools from `ToolRegistry::getToolDefinitions()` ported to SDK `Tool` contract:
- `InvokeMindMap`, `InvokePalettePicker`, `InvokeGeometricConstructor`, `InvokeReviewView`, `InvokeGuidelinePreview`
- `InvokeClientInterviewWizard`, `InvokeVisualPillarExtractor`, `InvokeBrandStrategyOverview`
- `InvokeKeywordMindMap`, `InvokeSemanticObjectMapper`, `InvokeDesignConceptExplorer`
- `InvokeTypographyPairingSelector`, `InvokeColorHierarchyBuilder`, `InvokeLogoCompositionBuilder`
- `InvokeDirectionComparator`, `InvokeFeedbackCollector`, `InvokeResonanceConfirmator`
- `InvokeBrandGuidelineDocument`, `InvokeLogoUsageGuide`, `InvokeColorSystemDocument`
- `InvokeAssetPatternLibrary`, `InvokeTypographyHierarchyDoc`, `InvokeDevHandoffPackage`
- `InvokeMoodboardComposer`

Each returns `Rendered: <tool_name>` from `handle()`.

### 3. `app/Http/Controllers/Api/ChatController.php`
- Replaced `LLMProvider` / manual SSE accumulation with SDK streaming
- Instantiates `BrandingAgent::make($brand)`, calls `forUser($user)` or `continue($conversation->agent_conversation_id, $user)`
- Streams via `$agent->stream($prompt)` and maps SDK `StreamEvent` objects to the existing SSE format (`event: text`, `event: tool_call`, `event: done`, `event: error`)
- Removed `SystemPromptBuilder`, `ToolRegistry`, `BrandChatStore`, `LLMProvider` dependencies
- Kept `PromptGuardrailService` and `SemanticIntentFilter` gating before agent invocation
- Controller still pre-creates the app-level SDK conversation + initial user message via raw `DB::table()` inserts so the conversation has a message before the first agent turn

### 4. `app/Http/Controllers/BrandController.php`
- `store()`: replaced `BrandChatStore` with raw `DB::table()` inserts matching the SDK schema (`agent_conversations`, `agent_conversation_messages`)
- `destroy()`: replaced `BrandChatStore::deleteConversation()` with raw `DB::table()` deletes on `agent_conversation_messages` then `agent_conversations`

### 5. `app/Http/Controllers/WorkspaceController.php`
- Replaced `BrandChatStore->getLatestConversationMessages()` with direct `DB::table('agent_conversation_messages')` query preserving `{id, role, content, tool_calls, created_at}` shape

### 6. `app/Providers/AppServiceProvider.php`
- Removed singleton bindings for `LLMProvider`, `ToolRegistry`, `SystemPromptBuilder`, `BrandChatStore`

### 7. `resources/js/hooks/use-chat-stream.ts`
- Added handling for `parsed.message` (error events from server)
- Kept existing `content`, `id`+`name`+`arguments`, `conversation_id` parsing — the controller maps SDK events to this legacy shape, so the frontend contract is unchanged

### 8. `tests/Feature/ChatPersistenceTest.php`
- Replaced `LLMProvider` mock with `BrandingAgent::fake(['Hello! I am your AI brand director.'])`
- Kept `SemanticIntentFilter` and `PromptGuardrailService` mocks
- Updated assertions to query `agent_conversation_messages` directly
- **Important**: Added `consumeStream()` helper that calls `$response->baseResponse->sendContent()` because Laravel's test suite does NOT auto-execute `StreamedResponse` callbacks — without this, the `RememberConversation` middleware never runs and messages are not persisted in tests

## Verification results
- `php artisan test`: **110/110 passed** (392 assertions)
- `npm run types:check`: **passed**
- Confirmed tool-call SSE shape still reaches `DynamicRenderer` unchanged (`{id, name, arguments}`)
- Confirmed `PromptGuardrailService` / `SemanticIntentFilter` still reject prompts the same way
- Confirmed follow-up messages reuse the same `agent_conversation_id` when `conversation_id` is provided

## Critical implementation note
Laravel's `TestResponse` does **not** automatically execute `StreamedResponse` callbacks. Any test hitting a streamed endpoint must explicitly consume the stream:

```php
private function consumeStream($response): void
{
    if (isset($response->baseResponse) && method_exists($response->baseResponse, 'sendContent')) {
        $response->baseResponse->sendContent();
    }
}
```

This is required for the `RememberConversation` middleware to fire and persist messages during tests. In production, the browser consumes the stream naturally.
