# Challenge 001 V2 — Browser 2D Platformer with Chiptune Audio

## Fixed English Task Prompt

Build a complete, polished and playable 2D platformer game that runs in a modern desktop browser.

Act as an autonomous game developer. Use the provided tools to create and edit files, run checks, inspect errors, test gameplay and improve the game without human assistance.

Your goal is to deliver a complete game, not merely a technical demonstration.

You have creative freedom over the game's theme, characters, visual design, level layouts, animations and original soundtrack.

## 1. Technical Requirements

- Use HTML5 Canvas, CSS and vanilla JavaScript.
- Do not use external libraries, game engines, frameworks, CDNs, downloads or internet access.
- The entry point must be `index.html`.
- Store all game files and assets inside the project workspace.
- The game must launch using the provided local HTTP server.
- The game must run in a modern desktop browser.
- Do not require installation, accounts or external services.
- The game must remain playable without network connectivity.

You may organize the game into multiple JavaScript, CSS and HTML files.

## 2. Core Gameplay Requirements

The game MUST implement all the following mechanics.

### 2.1 Player Movement

- Move left and right using the arrow keys or A/D.
- Jump using Space.
- Implement gravity.
- Implement collision detection with solid platforms.
- Prevent the player from falling through solid platforms.
- Controls should feel responsive and predictable.

### 2.2 Levels

- Create at least three distinct, playable levels.
- Each level must have a different layout.
- Each level must contain platforms, obstacles and a reachable goal.
- Level progression must work correctly.
- Completing a level must unlock the next level.
- Completing the final level must display a victory screen.
- Every level must be possible to complete using normal gameplay.

### 2.3 Coins and Score

- Include collectible coins or equivalent collectible objects.
- Collecting an item must increase the player's score.
- Collected items must disappear from the level.
- Display the current score during gameplay.

### 2.4 Enemies and Hazards

- Include at least one moving enemy or moving hazard in every level.
- Enemies or hazards must interact with the player.
- Collisions with dangerous objects must have visible gameplay consequences.
- Avoid unavoidable damage and unfair obstacle placement.

### 2.5 Lives and Game Over

- The player starts with three lives.
- Taking damage must reduce the number of lives.
- Display the remaining lives.
- Losing all lives must trigger a game-over screen.
- The player must be able to restart the game.
- Restarting must correctly reset relevant game state.

### 2.6 Game Screens

Include:

- Title screen.
- Start Game button.
- Gameplay screen.
- Game-over screen.
- Final victory screen.

After starting, the game must be fully playable using the keyboard.

## 3. Mandatory Original 8-Bit Music

The game MUST include original retro 8-bit-style background music.

Music is a required part of the game, not an optional enhancement.

### 3.1 Music Composition

Compose an original chiptune soundtrack suitable for a retro platformer.

The soundtrack must include:

- A recognizable melody.
- Rhythmic accompaniment.
- Bass accompaniment.
- A repeating musical structure.
- A seamless or musically natural loop.

Use the Web Audio API to generate audio programmatically.

You may use oscillators, synthesized waveforms, envelopes, noise generators and other built-in Web Audio features.

Prefer sounds characteristic of classic 8-bit games, including square waves, pulse-like sounds, triangle waves and noise-based percussion.

The music should be pleasant to listen to during repeated gameplay.

### 3.2 Music Playback

- Background music must play during active gameplay.
- Music must start only after an appropriate user interaction, respecting browser autoplay restrictions.
- Music must loop during gameplay.
- Repeated starts and restarts must not create overlapping music loops.
- Music playback must be managed correctly when switching between levels and game states.
- The game must not accumulate uncontrolled audio nodes or playback timers.
- The game must remain playable if Web Audio is unavailable.

### 3.3 Originality

All music must be original.

Do not reproduce recognizable melodies from existing commercial games, films or copyrighted compositions.

Do not download or embed existing music.

Do not depend on external audio files or audio libraries.

## 4. Mandatory Retro Sound Effects

Implement distinct synthesized sound effects for the following events:

1. Player jumping.
2. Collecting a coin.
3. Taking damage.
4. Losing a life or reaching game over.
5. Completing a level.
6. Winning the game.

Sound effects must be recognizable and appropriate to the event.

Use the Web Audio API to synthesize them.

Sound effects should complement the music without becoming excessively loud or distracting.

Avoid clipping and uncomfortable volume levels.

## 5. Audio Controls

The game MUST include a visible music ON/OFF toggle.

Requirements:

- The player can enable or disable background music.
- Muting must not interfere with gameplay.
- Unmuting must not create duplicate music playback.
- The current music state must be visually understandable.
- Audio behavior must remain correct after restarting the game.

You may optionally add separate sound-effect volume controls, but they are not required.

## 6. Visual Design and Presentation

The game should have a coherent and polished visual identity.

You are free to choose:

- Theme and setting.
- Character design.
- Color palette.
- Pixel-art or other visual style.
- Backgrounds.
- Animations.
- Environmental decorations.
- Interface design.

Aim for:

- Readable gameplay.
- Clear distinction between platforms, hazards and collectibles.
- Visually understandable player movement.
- Consistent styling.
- Attractive title and victory screens.
- Smooth animation.

Visual polish must not come at the expense of gameplay functionality.

## 7. Gameplay Quality

The game should be enjoyable rather than merely technically functional.

Pay attention to:

- Responsive movement.
- Reasonable jump distances.
- Reachable platforms.
- Fair enemy placement.
- Clear level objectives.
- Increasing or varied difficulty.
- Meaningful level progression.
- Appropriate feedback for player actions.

Avoid impossible jumps, soft locks, broken level transitions and situations where the player cannot finish the game.

## 8. Autonomous Development and Testing

Before finishing, you MUST use the available development and browser tools to validate your game.

When supported by the available tools:

1. Create the required files.
2. Check JavaScript syntax.
3. Launch the game using the local HTTP server.
4. Inspect browser and runtime errors.
5. Verify that the title screen appears.
6. Start the game.
7. Test left/right movement.
8. Test jumping and platform collisions.
9. Check collectibles and scoring.
10. Check enemy or hazard behavior.
11. Test level progression.
12. Check game-over and restart behavior.
13. Verify final victory behavior.
14. Check that the Web Audio system initializes after user interaction.
15. Verify that music and sound effects are triggered correctly.
16. Fix defects discovered during testing.

Do not claim that a feature was tested unless it was actually tested.

If a feature cannot be verified with the available tools, state that limitation in the final response.

## 9. Completion Requirements

The final deliverable must be a playable browser game.

Before finishing, ensure that:

- `index.html` exists.
- All required game files are present.
- The game starts without fatal JavaScript errors.
- Core movement and gameplay mechanics are implemented.
- Three distinct levels exist.
- Score, lives, game over and victory are implemented.
- Original looping chiptune music is implemented.
- Required retro sound effects are implemented.
- Music can be enabled and disabled.
- No external runtime dependencies are required.

Your final response should briefly describe:

- The game's title and theme.
- The implemented gameplay features.
- The original soundtrack and audio system.
- The checks actually performed.
- Any known remaining limitations.

---

# Experimental Protocol

This section defines how AI Challenge Lab evaluates participants. It is not an additional gameplay requirement.

## Protocol Version

Challenge ID: `CHALLENGE_001`

Challenge version: `V2`

The V2 task adds mandatory original chiptune music, sound effects and audio controls.

Results produced under Challenge 001 V1 must retain their original challenge version and must not be retroactively scored as V2 attempts.

## Fairness and Reproducibility

- Use the same frozen challenge prompt for all participants in the same comparison cohort.
- Use the same tool schemas, sandbox image and machine where possible.
- Record the exact model and provider route.
- Record generation parameters and resource limits.
- Record all model and tool interactions.
- Preserve generated source files.
- Preserve screenshots and evaluation evidence.
- Record token usage, elapsed time and provider-reported costs.
- Do not modify generated games manually before official evaluation.
- Do not provide hidden evaluation tests to the agent.
- Do not silently retry failed model runs outside the frozen protocol.

Provider-specific settings and deviations from shared limits must be documented.

A single run is an entertainment competition, not a statistically significant benchmark.

## Resource Limits

Resource limits are controlled by the harness configuration, not by the game prompt.

The intended baseline configuration is:

- Maximum model turns: 64.
- Maximum tool calls: 192.
- Maximum agent wall time: 1200 seconds.
- Maximum output tokens per turn: 4096.
- Image-context policy: latest screenshot.
- Browser recording: disabled during agent execution unless explicitly enabled by the protocol.

Any alternative configuration must be recorded as a separate experimental condition.

Cost accounting must be reported separately from game quality.

## Final Evaluation

After the agent stops, the harness should independently evaluate the saved game whenever a usable artifact exists.

Agent termination status and game quality must be reported separately.

A resource-limit termination does not automatically mean the game failed.

A normal agent termination does not automatically mean the game succeeded.

Evaluation should include:

- Page loading.
- JavaScript startup errors.
- Canvas rendering.
- Keyboard movement.
- Jumping and collisions.
- Collectibles and score.
- Level count and progression.
- Moving enemies or hazards.
- Lives and damage.
- Game over and restart.
- Victory condition.
- Web Audio initialization.
- Music playback scheduling.
- Music mute/unmute behavior.
- Sound-effect triggering.

Each criterion should be marked PASS, FAIL or UNKNOWN, with supporting evidence.

Do not infer successful gameplay solely from the presence of source-code functions.

Automated tests may validate audio initialization, scheduling and state changes, but cannot reliably determine whether a soundtrack is musically appealing.

Musical quality requires a separate listening assessment.

## Scoring — 100 Points

### Functionality — 35 points

Evaluate:

- Game launches correctly.
- No fatal runtime errors.
- Player movement.
- Jumping and platform collisions.
- Level progression.
- Collectibles and score.
- Enemies and hazards.
- Lives, game over and restart.
- Final victory condition.

### Gameplay — 25 points

Evaluate:

- Control responsiveness.
- Level design.
- Difficulty and fairness.
- Challenge and pacing.
- Overall enjoyment.

Use blind human playtesting where practical.

### Visual Quality — 15 points

Evaluate:

- Visual coherence.
- Readability.
- Animation.
- Interface quality.
- Overall polish.

### Audio Quality — 15 points

Evaluate:

- Originality and suitability of the chiptune soundtrack.
- Melody, rhythm and bass.
- Loop quality.
- Sound-effect clarity.
- Audio balance and consistency.
- Music controls and playback reliability.

Functional audio checks should be automated where practical. Musical quality should be assessed by listening.

### Requirements Compliance — 10 points

Evaluate compliance with the explicit technical, gameplay and audio requirements.

## Reporting

Publish an itemized score with supporting evidence.

Record separately:

- Agent termination reason.
- Artifact validation status.
- Challenge completion status.
- Final quality score.
- Total model turns.
- Tool calls.
- Input and output tokens.
- Wall-clock time.
- Estimated and provider-reported cost.
- Known limitations.
- Experimental protocol deviations.

Use functionality, followed by gameplay, as tie-breakers.

Browser smoke checks can be automated, but arbitrary gameplay and musical quality cannot be fully validated through generic browser automation alone.
