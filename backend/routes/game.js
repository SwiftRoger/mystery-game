const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Get active character
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

// Get graveyard (retired characters)
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

// Create new character and start game
router.post('/new', auth, async (req, res) => {
  const { character_name, story_id } = req.body;

  try {
    // Retire any existing active character
    await pool.query(
      `UPDATE characters SET status = 'retired', retired_at = NOW(), retired_reason = 'New game started'
       WHERE player_id = $1 AND status = 'active'`,
      [req.user.id]
    );

    // Get story and first chapter
    const chapterResult = await pool.query(
      'SELECT * FROM chapters WHERE story_id = $1 AND chapter_number = 1',
      [story_id]
    );

    if (chapterResult.rows.length === 0) {
      return res.status(404).json({ message: 'Story has no chapters yet' });
    }

    const chapter = chapterResult.rows[0];

    // Create new character
    const characterResult = await pool.query(
      'INSERT INTO characters (player_id, name, current_chapter) VALUES ($1, $2, 1) RETURNING *',
      [req.user.id, character_name]
    );

    const character = characterResult.rows[0];

    // Create game session
    const sessionResult = await pool.query(
      'INSERT INTO game_sessions (character_id, story_id, chapter_id) VALUES ($1, $2, $3) RETURNING *',
      [character.id, story_id, chapter.id]
    );

    const session = sessionResult.rows[0];

    // Generate opening narration from Groq
    const opening = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(chapter)
        },
        {
          role: 'user',
          content: `My detective's name is ${character_name}. Begin the story.`
        }
      ],
      max_tokens: 500
    });

    const openingText = opening.choices[0].message.content;

    // Save opening to conversation
    await pool.query(
      'INSERT INTO conversations (session_id, role, content) VALUES ($1, $2, $3)',
      [session.id, 'assistant', openingText]
    );

    res.status(201).json({
      character,
      session,
      chapter: {
        id: chapter.id,
        chapter_number: chapter.chapter_number,
        title: chapter.title,
        content: chapter.content
      },
      opening: openingText
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current session + conversation history
router.get('/session', auth, async (req, res) => {
  try {
    // Get active character
    const characterResult = await pool.query(
      'SELECT * FROM characters WHERE player_id = $1 AND status = $2',
      [req.user.id, 'active']
    );

    if (characterResult.rows.length === 0) {
      return res.json(null);
    }

    const character = characterResult.rows[0];

    // Get active session
    const sessionResult = await pool.query(
      'SELECT * FROM game_sessions WHERE character_id = $1 AND status = $2',
      [character.id, 'active']
    );

    if (sessionResult.rows.length === 0) {
      return res.json(null);
    }

    const session = sessionResult.rows[0];

    // Get current chapter
    const chapterResult = await pool.query(
      'SELECT * FROM chapters WHERE story_id = $1 AND chapter_number = $2',
      [session.story_id, character.current_chapter]
    );

    const chapter = chapterResult.rows[0];

    // Get conversation history
    const convResult = await pool.query(
      'SELECT * FROM conversations WHERE session_id = $1 ORDER BY created_at ASC',
      [session.id]
    );

    res.json({
      character,
      session,
      chapter: {
        id: chapter.id,
        chapter_number: chapter.chapter_number,
        title: chapter.title,
        content: chapter.content
      },
      conversation: convResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Player sends a message
router.post('/action', auth, async (req, res) => {
  const { session_id, message } = req.body;

  try {
    // Get session
    const sessionResult = await pool.query(
      'SELECT * FROM game_sessions WHERE id = $1',
      [session_id]
    );

    const session = sessionResult.rows[0];

    // Get character
    const characterResult = await pool.query(
      'SELECT * FROM characters WHERE id = $1',
      [session.character_id]
    );

    const character = characterResult.rows[0];

    // Get current chapter (with win/fail conditions — never sent to frontend)
    const chapterResult = await pool.query(
      'SELECT * FROM chapters WHERE story_id = $1 AND chapter_number = $2',
      [session.story_id, character.current_chapter]
    );

    const chapter = chapterResult.rows[0];

    // Get conversation history
    const convResult = await pool.query(
      'SELECT * FROM conversations WHERE session_id = $1 ORDER BY created_at ASC',
      [session_id]
    );

    // Build messages array for Groq
    const messages = [
      {
        role: 'system',
        content: buildSystemPrompt(chapter)
      },
      ...convResult.rows.map(c => ({
        role: c.role,
        content: c.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Save player message
    await pool.query(
      'INSERT INTO conversations (session_id, role, content) VALUES ($1, $2, $3)',
      [session_id, 'user', message]
    );

    // Call Groq
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages,
      max_tokens: 600
    });

    const aiReply = response.choices[0].message.content;

    // Save AI reply
    await pool.query(
      'INSERT INTO conversations (session_id, role, content) VALUES ($1, $2, $3)',
      [session_id, 'assistant', aiReply]
    );

    // Check win/fail conditions
    const outcome = checkOutcome(message, aiReply, chapter);

    if (outcome === 'win') {
      // Check if there is a next chapter
      const nextChapter = await pool.query(
        'SELECT * FROM chapters WHERE story_id = $1 AND chapter_number = $2',
        [session.story_id, character.current_chapter + 1]
      );

      if (nextChapter.rows.length > 0) {
        // Advance to next chapter
        await pool.query(
          'UPDATE characters SET current_chapter = current_chapter + 1 WHERE id = $1',
          [character.id]
        );

        await pool.query(
          'UPDATE game_sessions SET chapter_id = $1 WHERE id = $2',
          [nextChapter.rows[0].id, session_id]
        );

        return res.json({
          reply: aiReply,
          outcome: 'chapter_complete',
          next_chapter: {
            chapter_number: nextChapter.rows[0].chapter_number,
            title: nextChapter.rows[0].title,
            content: nextChapter.rows[0].content
          }
        });
      } else {
        // Game complete — all chapters done
        await pool.query(
          'UPDATE game_sessions SET status = $1, ended_at = NOW() WHERE id = $2',
          ['won', session_id]
        );

        await pool.query(
          `UPDATE characters SET status = 'retired', retired_at = NOW(), retired_reason = 'Case solved — legend.'
           WHERE id = $1`,
          [character.id]
        );

        return res.json({ reply: aiReply, outcome: 'game_won' });
      }
    }

    if (outcome === 'fail') {
      // Retire character
      await pool.query(
        `UPDATE characters 
         SET status = 'retired', retired_at = NOW(), retired_reason = $1
         WHERE id = $2`,
        [`Failed on Chapter ${character.current_chapter}`, character.id]
      );

      await pool.query(
        'UPDATE game_sessions SET status = $1, ended_at = NOW() WHERE id = $2',
        ['lost', session_id]
      );

      return res.json({ reply: aiReply, outcome: 'game_over' });
    }

    // Normal response — game continues
    res.json({ reply: aiReply, outcome: 'continue' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper — build system prompt for Groq
function buildSystemPrompt(chapter) {
  return `You are the narrator of a dark sci-fi murder mystery game called Nebula Noir.

STORY CONTEXT:
${chapter.content}

YOUR RULES:
- Stay strictly within the story. Never break character.
- Narrate in second person ("You enter the room...").
- If the player tries to go off-story, redirect them back naturally without breaking immersion.
- Keep responses under 150 words. Be atmospheric, dark, and cinematic.
- Do NOT reveal the win or fail conditions directly.
- If the player is getting close to the win condition, build tension and reward their deduction.
- If the player is heading toward failure, give subtle warning signs through the narrative.

WIN CONDITION (secret — never reveal this directly):
${chapter.win_condition}

FAIL CONDITION (secret — never reveal this directly):
${chapter.fail_condition}`;
}

// Helper — check if player hit win or fail condition
function checkOutcome(playerMessage, aiReply, chapter) {
  const combined = (playerMessage + ' ' + aiReply).toLowerCase();
  const win = chapter.win_condition.toLowerCase();
  const fail = chapter.fail_condition.toLowerCase();

  // Extract key words from conditions
  const winKeywords = win.split(' ').filter(w => w.length > 4);
  const failKeywords = fail.split(' ').filter(w => w.length > 4);

  const winHits = winKeywords.filter(w => combined.includes(w)).length;
  const failHits = failKeywords.filter(w => combined.includes(w)).length;

  if (winHits >= 3) return 'win';
  if (failHits >= 3) return 'fail';
  return 'continue';
}

module.exports = router;