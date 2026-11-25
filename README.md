# AI Challenge Lab — Games

AI-generated games from the AI Challenge Lab video series, organized by challenge. Each challenge folder contains the preserved game source, shared prompt, recorded model information and launch instructions.

## Challenges

| Challenge | Task | Participants |
| --- | --- | --- |
| [Challenge 001](challenge-001/) | Browser 2D platformer with original chiptune audio | GPT, DeepSeek, Claude, Gemini, Grok |

## Play Challenge 001

Follow the [VM setup and launch instructions](challenge-001/README.md#run-a-game). From this repository's root, inside the VM:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory challenge-001/games
```

Open `http://127.0.0.1:8000/` in the VM browser and choose a model's folder. No API keys or model calls are needed.

## Prompts and provenance

- [Exact Challenge 001 task](challenge-001/prompts/challenge-001-v2.md)
- [Plain-text task download](challenge-001/prompts/challenge-001-v2.txt)
- [Shared system instruction](challenge-001/prompts/system-coding-v3.txt)
- [Tool schemas](challenge-001/prompts/tools-coding-v3.json)
- [Recorded versions and artifact hashes](challenge-001/provenance.json)

Game files are published without manual corrections. Final artifacts can contain bugs or incomplete requirements; this repository does not assert a winner or successful completion of every requirement.

## Repository layout

```text
challenge-001/
  games/
    gpt/
    deepseek/
    claude/
    gemini/
    grok/
  prompts/
  provenance.json
  README.md
```

Future challenges will use sibling folders such as `challenge-002/`.

## Integrity

```sh
sha256sum --check SHA256SUMS
```
