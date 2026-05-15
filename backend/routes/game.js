const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

// ─── Get active character ────────────────────────────────────────────────────
router.get('/character', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM characters WHERE player_id = $1 AND status = $2',
      [req.user.id, 'active']
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Get graveyard ───────────────────────────────────────────────────────────
router.get('/graveyard', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, s.title as story_title 
       FROM characters c
       LEFT JOIN game_sessions gs ON gs.character_id = c.id
       LEFT JOIN stories s ON s.id = gs.story_id
       WHERE c.player_id = $1 AND c.status = $2
       ORDER BY c.retired_at DESC`,
      [req.user.id, 'retired']
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Create new character & start game ──────────────────────────────────────
router.post('/new', auth, async (req, res) => {
  const { character_name, story_id } = req.body;

  try {
    // Retire any existing active character
    await pool.query(
      `UPDATE characters SET status = 'retired', retired_at = NOW(), retired_reason = 'New game started'
       WHERE player_id = $1 AND status = 'active'`,
      [req.user.id]
    );

    // Get first chapter
    const chapterResult = await pool.query(
      'SELECT * FROM chapters WHERE story_id = $1 AND chapter_number = 1',
      [story_id]
    );

    if (chapterResult.rows.length === 0) {
      return res.status(404).json({ message: 'Story has no chapters yet' });
    }

    const chapter = chapterResult.rows[0];

    // Create character
    const characterResult = await pool.query(
      'INSERT INTO characters (player_id, name, current_chapter) VALUES ($1, $2, 1) RETURNING *',
      [req.user.id, character_name]
    );
    const character = characterResult.rows[0];

    // Create session
    const sessionResult = await pool.query(
      'INSERT INTO game_sessions (character_id, story_id, chapter_id) VALUES ($1, $2, $3) RETURNING *',
      [character.id, story_id, chapter.id]
    );
    const session = sessionResult.rows[0];

    // Generate opening narration
    const opening = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt(chapter, character_name) },
        { role: 'user', content: `Begin the story. My detective's name is ${character_name}.` }
      ],
      max_tokens: 600
    });

    const rawOpening = opening.choices[0].message.content;
    const { cleanReply: openingText, choices: openingChoices } = parseOutcome(rawOpening);

    // Save opening to conversation
    await pool.query(
      'INSERT INTO conversations (session_id, role, content) VALUES ($1, $2, $3)',
      [session.id, 'assistant', openingText]
    );

    res.status(201).json({
      character,
      session,
      chapter: sanitizeChapter(chapter),
      opening: openingText,
      choices: openingChoices
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Get current session + conversation history ──────────────────────────────
router.get('/session', auth, async (req, res) => {
  try {
    const characterResult = await pool.query(
      'SELECT * FROM characters WHERE player_id = $1 AND status = $2',
      [req.user.id, 'active']
    );

    if (characterResult.rows.length === 0) return res.json(null);
    const character = characterResult.rows[0];

    const sessionResult = await pool.query(
      'SELECT * FROM game_sessions WHERE character_id = $1 AND status = $2',
      [character.id, 'active']
    );

    if (sessionResult.rows.length === 0) return res.json(null);
    const session = sessionResult.rows[0];

    const chapterResult = await pool.query(
      'SELECT * FROM chapters WHERE story_id = $1 AND chapter_number = $2',
      [session.story_id, character.current_chapter]
    );

    const chapter = chapterResult.rows[0];

    const convResult = await pool.query(
      'SELECT role, content, created_at FROM conversations WHERE session_id = $1 ORDER BY created_at ASC',
      [session.id]
    );

    res.json({
      character,
      session,
      chapter: sanitizeChapter(chapter),
      conversation: convResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Player sends a message ──────────────────────────────────────────────────
router.post('/action', auth, async (req, res) => {
  const { session_id, message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ message: 'Message cannot be empty' });
  }

  try {
    const sessionResult = await pool.query(
      'SELECT * FROM game_sessions WHERE id = $1',
      [session_id]
    );
    const session = sessionResult.rows[0];

    const characterResult = await pool.query(
      'SELECT * FROM characters WHERE id = $1',
      [session.character_id]
    );
    const character = characterResult.rows[0];

    const chapterResult = await pool.query(
      'SELECT * FROM chapters WHERE story_id = $1 AND chapter_number = $2',
      [session.story_id, character.current_chapter]
    );
    const chapter = chapterResult.rows[0];

    // Get last 20 turns to keep context window sane
    const convResult = await pool.query(
      `SELECT role, content FROM conversations 
       WHERE session_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [session_id]
    );
    const history = convResult.rows.reverse();

    // Save player message
    await pool.query(
      'INSERT INTO conversations (session_id, role, content) VALUES ($1, $2, $3)',
      [session_id, 'user', message]
    );

    // Build Groq messages
    const groqMessages = [
      { role: 'system', content: buildSystemPrompt(chapter, character.name) },
      ...history,
      { role: 'user', content: message }
    ];

    // Call Groq
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: groqMessages,
      max_tokens: 600
    });

    const rawReply = response.choices[0].message.content;
    const { cleanReply, outcome: aiOutcome, choices } = parseOutcome(rawReply);

    // Save clean AI reply
    await pool.query(
      'INSERT INTO conversations (session_id, role, content) VALUES ($1, $2, $3)',
      [session_id, 'assistant', cleanReply]
    );

    // ─── Handle outcomes ───────────────────────────────────────────────────

    if (aiOutcome === 'win') {
      const nextChapterResult = await pool.query(
        'SELECT * FROM chapters WHERE story_id = $1 AND chapter_number = $2',
        [session.story_id, character.current_chapter + 1]
      );

      if (nextChapterResult.rows.length > 0) {
        const nextChapter = nextChapterResult.rows[0];

        await pool.query(
          'UPDATE characters SET current_chapter = current_chapter + 1 WHERE id = $1',
          [character.id]
        );
        await pool.query(
          'UPDATE game_sessions SET chapter_id = $1 WHERE id = $2',
          [nextChapter.id, session_id]
        );

        return res.json({
          reply: cleanReply,
          outcome: 'chapter_complete',
          next_chapter: sanitizeChapter(nextChapter),
          choices: []
        });
      } else {
        await pool.query(
          'UPDATE game_sessions SET status = $1, ended_at = NOW() WHERE id = $2',
          ['won', session_id]
        );
        await pool.query(
          `UPDATE characters SET status = 'retired', retired_at = NOW(), retired_reason = 'Case solved — legend.' WHERE id = $1`,
          [character.id]
        );

        return res.json({ reply: cleanReply, outcome: 'game_won', choices: [] });
      }
    }

    if (aiOutcome === 'fail') {
      await pool.query(
        `UPDATE characters SET status = 'retired', retired_at = NOW(), retired_reason = $1 WHERE id = $2`,
        [`Failed on Chapter ${character.current_chapter}`, character.id]
      );
      await pool.query(
        'UPDATE game_sessions SET status = $1, ended_at = NOW() WHERE id = $2',
        ['lost', session_id]
      );

      return res.json({ reply: cleanReply, outcome: 'game_over', choices: [] });
    }

    // Normal continue
    res.json({ reply: cleanReply, outcome: 'continue', choices });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSystemPrompt(chapter, characterName) {
  return `You are NOIR, the narrator of a dark dystopian murder mystery called Nebula Noir.

DETECTIVE: ${characterName}
CHAPTER ${chapter.chapter_number}: ${chapter.title}

STORY CONTEXT:
${chapter.content}

═══ NARRATION RULES ═══
- Narrate in second person ("You push open the door...").
- Keep narration under 180 words. Be atmospheric, cinematic, and terse.
- Never break character. Never mention being an AI.
- If the player goes wildly off-topic, redirect them back into the story naturally.
- React to what the player does — reward clever deductions, punish recklessness.
- Build tension as the player gets closer to the truth.

═══ SECRET CONDITIONS (never reveal these directly) ═══
WIN CONDITION: ${chapter.win_condition}
FAIL CONDITION: ${chapter.fail_condition}

═══ RESPONSE FORMAT (follow this exactly, every single time) ═══
Write your narration first. Then append the outcome tag and choices block.

[OUTCOME:CONTINUE] or [OUTCOME:WIN] or [OUTCOME:FAIL]

[CHOICES]
1. <a short action the detective could take, max 10 words>
2. <a different short action, max 10 words>
3. <a bold, reckless, or morally grey action, max 10 words>
[/CHOICES]

OUTCOME RULES:
- Only signal WIN or FAIL when the player has unmistakably met the condition.
- When in doubt, always use CONTINUE.
- NEVER mention "win condition", "lose condition", "case solved", or break the fourth wall.
- NEVER explain why you are triggering WIN or FAIL — just narrate cinematically and tag it.
- The [OUTCOME:WIN] or [OUTCOME:FAIL] tag must be invisible to the player — it gets stripped out automatically.
- If you write things like "Note: This is the win condition" you have failed your role.

CHOICES RULES:
- Make choices feel specific to this exact moment in the story.
- Choice 3 should always be the wild card — risky, dark, or unexpected.
- The player can always ignore these and type their own action.

Example:
You find the bloodied keycard beneath the console. The hatch groans as cold air bleeds upward.

[OUTCOME:CONTINUE]

[CHOICES]
1. Use the keycard and descend into the hatch
2. Photograph the keycard and search the room first
3. Pocket it and slip out before anyone arrives
[/CHOICES]`;
}

function parseOutcome(raw) {
  const outcomeMatch = raw.match(/\[M?OUTCOME:(WIN|FAIL|CONTINUE)\]/i);
  const outcome = outcomeMatch ? outcomeMatch[1].toLowerCase() : 'continue';

  const choicesMatch = raw.match(/\[CHOICES\]([\s\S]*?)\[\/CHOICES\]/i);
  let choices = [];
  if (choicesMatch) {
    choices = choicesMatch[1]
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  const cleanReply = raw
    .replace(/\[OUTCOME:(WIN|FAIL|CONTINUE)\]/gi, '')
    .replace(/\[CHOICES\][\s\S]*?\[\/CHOICES\]/gi, '')
    .trim();

  return { cleanReply, outcome, choices };
}

function sanitizeChapter(chapter) {
  const { win_condition, fail_condition, ...safe } = chapter;
  return safe;
}

module.exports = router;