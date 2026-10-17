import express from 'express';
import { Slide } from '../models/Slide.js';
import { Note } from '../models/Note.js';
import { Presentation } from '../models/Presentation.js';
import { generateSlideNotes } from '../services/notesService.js';
import { authenticateTrainer } from '../middleware/authMiddleware.js';
import { generationRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/slides/:slideId/notes/regenerate
 * Regenerate notes specifically for one slide.
 */
router.post('/:slideId/notes/regenerate', authenticateTrainer, generationRateLimiter, async (req, res) => {
  try {
    const { slideId } = req.params;
    const slide = await Slide.findById(slideId);
    if (!slide) {
      return res.status(404).json({ error: 'Slide not found.' });
    }

    const presentation = await Presentation.findById(slide.presentationId);
    if (!presentation) {
      return res.status(404).json({ error: 'Parent presentation not found.' });
    }

    const generated = await generateSlideNotes({
      slide,
      presentation,
      level: req.body.level || presentation.targetAudience
    });

    const existingNote = await Note.findOne({ slideId: slide._id });

    const note = await Note.findOneAndUpdate(
      { slideId: slide._id },
      {
        presentationId: presentation._id,
        slideId: slide._id,
        slideNumber: slide.slideNumber,
        slideTitle: slide.title,
        summary: generated.summary,
        detailedExplanation: generated.detailedExplanation,
        speakingScript: generated.speakingScript,
        practicalExample: generated.practicalExample,
        keyTerms: generated.keyTerms,
        takeaways: generated.takeaways,
        transitionSentence: generated.transitionSentence,
        estimatedSpeakingTime: generated.estimatedSpeakingTime,
        isEdited: false,
        version: (existingNote?.version || 1) + 1,
        lastSavedAt: new Date(),
        userId: req.user.id
      },
      { new: true, upsert: true }
    );

    slide.notes = note._id;
    await slide.save();

    res.json({
      message: `Regenerated notes for Slide ${slide.slideNumber}.`,
      note
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to regenerate slide notes: ' + err.message });
  }
});

/**
 * PATCH /api/slides/:slideId/notes
 * Update and preserve edited notes for a slide.
 */
router.patch('/:slideId/notes', authenticateTrainer, async (req, res) => {
  try {
    const { slideId } = req.params;
    const updates = req.body;

    const slide = await Slide.findById(slideId);
    if (!slide) {
      return res.status(404).json({ error: 'Slide not found.' });
    }

    let note = await Note.findOne({ slideId });
    if (!note) {
      // If note does not exist yet, generate or create base record
      const presentation = await Presentation.findById(slide.presentationId);
      const generated = await generateSlideNotes({ slide, presentation });
      note = new Note({
        presentationId: slide.presentationId,
        slideId: slide._id,
        slideNumber: slide.slideNumber,
        slideTitle: slide.title,
        ...generated,
        userId: req.user.id
      });
    }

    // Apply updates
    const allowedFields = [
      'summary',
      'detailedExplanation',
      'speakingScript',
      'practicalExample',
      'keyTerms',
      'takeaways',
      'transitionSentence',
      'estimatedSpeakingTime'
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        note[field] = updates[field];
      }
    });

    note.isEdited = true;
    note.version = (note.version || 1) + 1;
    note.lastSavedAt = new Date();
    await note.save();

    slide.notes = note._id;
    await slide.save();

    res.json({
      message: 'Slide notes saved successfully.',
      note
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update slide notes: ' + err.message });
  }
});

/**
 * GET /api/slides/:slideId/notes
 * Retrieve notes for a specific slide.
 */
router.get('/:slideId/notes', authenticateTrainer, async (req, res) => {
  try {
    const { slideId } = req.params;
    const note = await Note.findOne({ slideId });
    if (!note) {
      return res.status(404).json({ error: 'Notes not found for this slide.' });
    }
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch slide notes: ' + err.message });
  }
});

export default router;
