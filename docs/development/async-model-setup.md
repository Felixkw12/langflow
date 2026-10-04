# Async model setup

Model setup can read provider policy, credentials, and connection variables from
the database before constructing a provider client. Async execution must await
those reads on its own event loop. Calling the synchronous credential bridge
from that loop waits on a worker future and prevents other tasks from running,
including tasks that would return database connections to the pool.

## Construction flow

`aget_llm()` validates the selection, awaits policy, checks the submitted provider
and model, resolves the canonical provider, awaits its owner-scoped API key and
connection settings, then calls `_build_llm()`. The synchronous `get_llm()` follows
the same steps with synchronous resolution functions. `_build_llm()` performs no
database reads; both entry points use its provider-specific constructor logic.

Policy is checked before secret access. Known providers get their client class
and parameter names from the registry, rather than trusting saved metadata.
Request-scoped environment-fallback settings remain active during each lookup.
For credential and connection-variable reads, missing or empty values can use an
allowed fallback; database or authorization errors propagate instead of silently
changing the credential or endpoint.

An Agent passes the model returned by `get_agent_requirements()` into
`create_agent_runnable()`. A second construction there would enter the synchronous
lookup path again. For a built-in selection, a retry repeats preparation and resolves credentials,
settings, and remediation overrides anew. Connected model objects retain their
existing pass-through behavior.

## What moved from existing code

| Extracted function | Existing behavior it contains |
| --- | --- |
| `_select_llm()` | Selection shape checks and connected-model passthrough from `get_llm()` |
| `_require_llm_provider()` | Provider/model policy checks and registry normalization from `get_llm()` |
| `_validate_llm_api_key()` | Missing-key errors and optional-provider placeholder from `get_llm()` |
| `_build_llm()` | Provider parameter mappings, reasoning/token settings, connection arguments, retry overrides, and final endpoint protection from `get_llm()` |
| `_language_model_options_from_models()` | Catalog filtering and formatting from `get_language_model_options()` |
| `_model_override_selection()` / `_fallback_model_override()` | Selection-copy and provider-change rules from `apply_model_overrides()` |
| `_model_remediation_context()` | Provider/model identity inspection from `_selected_model_remediation_context()` |
| `_executor_from_runnable()` / `_runnable_from_model()` | Existing executor and prompt/tool construction separated from model lookup |

The async entry points, awaited runtime calls, and per-attempt model handoff are
new. `_APIKeySource` is a new representation of the old literal-versus-variable
rules; it lets sync and async key resolution share the same interpretation.

## Component dispatch and cancellation

`@delegates_to("async_method")` is an existing metadata marker, now also used for
model setup. It does not wrap or execute a method. `async_call_method()` awaits a
verified async counterpart, awaits an unmarked coroutine override, or runs a
synchronous override in `asyncio.to_thread()`. The thread inherits request context.

Function-owner and receiver checks prevent copied decorator attributes or a
borrowed bound method from bypassing a customization. Native lookup cancellation
unwinds the active session scope. Cancelling thread fallback cannot forcibly stop
an already running synchronous extension.

Provider-specific live model discovery remains a synchronous compatibility API
and runs in a worker thread; policy and database inputs use native awaits.

## Shipped component sources

The generated component catalog and starter flow JSON embed Python source.
Refresh their code and hashes with runtime changes. Existing saved flows require
the ordinary component-update action; an image upgrade does not replace embedded
custom Python automatically.
