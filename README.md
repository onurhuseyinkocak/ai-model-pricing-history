# AI model pricing history

Daily snapshots of LLM API prices from the model makers' own APIs (OpenAI, Anthropic, Google Gemini, xAI, DeepSeek, Mistral, Cohere, Moonshot, Qwen, Z.ai) plus two hosts, Perplexity and Groq (which also serve other companies' models): input/output/cache prices per 1M tokens, context limits, long-context tiers, batch/flex/priority prices, deprecation dates, a change log, and computed costs for typical tasks.

Snapshots started on **2026-11-21**, so the history is short and grows by one snapshot a day.

Browse the same data: https://vibecodingturkey.com/models (calculator: https://vibecodingturkey.com/models/calculator)

## Files

| File | Contents |
| --- | --- |
| `data/latest.json` | Latest snapshot, one model per line. Includes extra capability flags and `task_costs_usd`. |
| `data/latest.csv` | The same snapshot as flat CSV (no `extra` flags). |
| `data/task-costs.csv` | Cost in USD of three typical workloads per priced model. |
| `data/price-changes.csv` | Append-only log: `date,model_id,field,old,new`, plus `added` / `removed` models. |

The full history of every snapshot is the git history of `data/latest.*`:

```sh
git log --follow -p -- data/latest.csv
```

## Schema

Prices are USD per 1M tokens (`*_per_mtok`); an empty value means the source does not list it (unknown, not free).

- `model_id`: `provider/model`, where `provider` is LiteLLM's provider key (`openai`, `anthropic`, `gemini`, `xai`, `deepseek`, `mistral`, `cohere` / `cohere_chat`, `moonshot`, `dashscope` = Alibaba Qwen, `zai`, `perplexity`, `groq`). Cloud platforms such as Bedrock, Azure and Vertex are excluded. Perplexity and Groq rows include models made by other companies (e.g. `perplexity/anthropic/...`, `groq/openai/gpt-oss-120b`).
- `name`, `page`: set for the models that have a page on vibecodingturkey.com.
- `max_input`, `max_output`: token limits. `tier_threshold` + `tier_*`: long-context price that applies when the prompt exceeds the threshold.
- `batch_*`, `flex_*`, `priority_*`, `ultrafast_*`: alternative service tiers.
- `supports_*`: 1/0 capability flags; `deprecation_date`, `successor_model`, `source_url` (the provider documentation or pricing page LiteLLM cites, when listed; empty for some rows).

Task costs (`task_costs_usd` / `task-costs.csv`):

| key | input tokens | output tokens | note |
| --- | --- | --- | --- |
| `chat` | 10,000 | 1,000 | one request |
| `codebase` | 100,000 | 2,000 | one request; long-context tier applies when exceeded |
| `monthly` | 750,000 | 250,000 | a month's aggregate; no per-request tier |

## Example

```python
import pandas as pd
df = pd.read_csv("https://raw.githubusercontent.com/onurhuseyinkocak/ai-model-pricing-history/main/data/latest.csv")
print(df[df.provider == "anthropic"][["model_id", "input_per_mtok", "output_per_mtok"]])
```

## Updates

A GitHub Action runs daily at 04:41 UTC, reads https://vibecodingturkey.com/models/data/latest.json and commits only when a new snapshot exists. Upstream data is refreshed once a day, so prices can lag a provider change by up to a day. Always confirm on the provider's pricing page before relying on a number.

## Sources and licence

- **Source data: LiteLLM `model_prices_and_context_window.json`** (https://github.com/BerriAI/litellm), MIT License, Copyright (c) 2023 Berri AI. The licence text is in [`LICENSE-LITELLM`](LICENSE-LITELLM). Fields are normalised (per-token prices converted to per-1M-token prices, the model makers' own APIs plus Perplexity and Groq; cloud platforms excluded).
- The source fields inside `data/` (prices, limits, flags) remain under LiteLLM's MIT License.
- **Our additions** (the daily snapshot history, the change log, the computed task costs, model names and page links) are licensed under [CC BY 4.0](LICENSE). Attribution: "AI model pricing history, vibecodingturkey.com".
- The code in `scripts/` and `.github/` is MIT licensed ([`LICENSE-CODE`](LICENSE-CODE)).
