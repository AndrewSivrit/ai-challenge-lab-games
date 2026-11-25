# AI Challenge Lab — Challenge 001 Games

Five AI models were given the same task: build a browser 2D platformer with original chiptune music. This repository contains their preserved final game files and the shared prompt.

## Games

| Folder | Recorded model | Recorded provider route |
| --- | --- | --- |
| [games/gpt](games/gpt/) | `openai/gpt-6-sol` | `openai/flex` |
| [games/deepseek](games/deepseek/) | `deepseek/deepseek-v4.1-flash-1017` | `deepinfra/fp8` |
| [games/claude](games/claude/) | `anthropic/claude-sonnet-5.5` | `amazon-bedrock` |
| [games/gemini](games/gemini/) | `google/gemini-3.8-flash` | `google-vertex/global` |
| [games/grok](games/grok/) | `x-ai/grok-4.7` | `xai/zdr` |

## Run a game

Use a disposable VM for the AI-generated games, with 2 virtual CPUs, 2 GiB RAM and a 4 GiB disk limit. Copy this repository into the VM; use no host folders, credentials or privileged access. After provisioning Python 3 and a desktop browser, disconnect the VM's external network. Run the server and browser inside the VM.

From the repository root, start Python's built-in static server:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory challenge-001/games
```

Open one of these addresses in the VM browser:

- GPT: http://127.0.0.1:8000/gpt/
- DeepSeek: http://127.0.0.1:8000/deepseek/
- Claude: http://127.0.0.1:8000/claude/
- Gemini: http://127.0.0.1:8000/gemini/
- Grok: http://127.0.0.1:8000/grok/

Click the game's start control before expecting audio. The task specifies arrow keys or A/D to move and Space to jump; individual implementations may differ. No API keys or model calls are needed to play. Stop the server with Ctrl+C and shut down the VM after the session.

## Exact prompt and shared harness instructions

- [Full task sent to every model](prompts/challenge-001-v2.md), also available as [plain text](prompts/challenge-001-v2.txt).
- [Shared system instruction](prompts/system-coding-v3.txt).
- [Shared tool schemas](prompts/tools-coding-v3.json).

The recorded input mode was `verbatim-markdown`: the full task document, including its Experimental Protocol section, was sent as the user task. The two task files preserve identical bytes from all five saved runs. The system instruction and schemas match the hashes recorded in every run configuration. These initial inputs alone do not reproduce the complete interactive tool history.

## Provenance and limitations

[provenance.json](provenance.json) records model IDs, routes, generation settings, limits, run IDs and SHA-256 hashes of every game file. Game files are copied without manual edits; model-generated self-tests are retained. The package excludes runner credentials and private runtime logs.

These are final saved artifacts, not a claim that every game satisfies every requirement. Saved automated evaluations report UNKNOWN artifact status and multiple UNKNOWN checks. Runtime completion is separate from game quality. No winner or manual score is asserted here. This is a single-run entertainment comparison, not a statistical benchmark.

## Integrity

From the repository root, verify all release files with:

```sh
sha256sum --check SHA256SUMS
```
