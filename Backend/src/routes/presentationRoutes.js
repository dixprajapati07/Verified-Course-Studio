import express from 'express';
import { Presentation } from '../models/Presentation.js';
import { Slide } from '../models/Slide.js';
import { Note } from '../models/Note.js';
import { generateSlideNotes } from '../services/notesService.js';
import { generateNotesPDF, generateNotesDOCX } from '../services/exportService.js';
import { authenticateTrainer } from '../middleware/authMiddleware.js';
import { generationRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * GET /api/presentations
 * List presentations for the trainer.
 */
router.get('/', authenticateTrainer, async (req, res) => {
  try {
    const presentations = await Presentation.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(presentations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve presentations: ' + err.message });
  }
});

/**
 * GET /api/presentations/:presentationId
 * Retrieve presentation details with ordered slides and their attached notes.
 */
router.get('/:presentationId', authenticateTrainer, async (req, res) => {
  try {
    const { presentationId } = req.params;
    const presentation = await Presentation.findById(presentationId);
    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found.' });
    }

    const slides = await Slide.find({ presentationId }).sort({ slideNumber: 1 });
    const notes = await Note.find({ presentationId }).sort({ slideNumber: 1 });

    res.json({
      presentation,
      slides,
      notes
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch presentation: ' + err.message });
  }
});

/**
 * GET /api/presentations/:presentationId/notes
 * Fetch all notes for a presentation.
 */
router.get('/:presentationId/notes', authenticateTrainer, async (req, res) => {
  try {
    const { presentationId } = req.params;
    const notes = await Note.find({ presentationId }).sort({ slideNumber: 1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve notes: ' + err.message });
  }
});

/**
 * POST /api/presentations/:presentationId/notes/generate
 * Generate or regenerate notes for all slides in the presentation.
 */
router.post('/:presentationId/notes/generate', authenticateTrainer, generationRateLimiter, async (req, res) => {
  try {
    const { presentationId } = req.params;
    const presentation = await Presentation.findById(presentationId);
    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found.' });
    }

    const slides = await Slide.find({ presentationId }).sort({ slideNumber: 1 });
    if (slides.length === 0) {
      return res.status(400).json({ error: 'Presentation contains no slides to generate notes for.' });
    }

    const generatedNotes = [];

    for (const slide of slides) {
      const generated = await generateSlideNotes({
        slide,
        presentation,
        level: presentation.targetAudience
      });

      // Upsert note in database
      const savedNote = await Note.findOneAndUpdate(
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
          lastSavedAt: new Date(),
          userId: req.user.id
        },
        { new: true, upsert: true }
      );

      // Link note to slide
      slide.notes = savedNote._id;
      await slide.save();

      generatedNotes.push(savedNote);
    }

    res.json({
      message: `Successfully generated notes for ${generatedNotes.length} slides.`,
      notes: generatedNotes
    });
  } catch (err) {
    res.status(500).json({ error: 'Notes generation failed: ' + err.message });
  }
});

/**
 * GET /api/presentations/:presentationId/notes/export
 * Export presentation notes to PDF or DOCX.
 */
router.get('/:presentationId/notes/export', authenticateTrainer, async (req, res) => {
  try {
    const { presentationId } = req.params;
    const format = (req.query.format || 'pdf').toLowerCase();

    const presentation = await Presentation.findById(presentationId);
    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found.' });
    }

    const notes = await Note.find({ presentationId }).sort({ slideNumber: 1 });
    if (notes.length === 0) {
      return res.status(400).json({ error: 'No speaker notes available to export for this presentation.' });
    }

    const safeFilename = `${presentation.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Speaker_Notes`;

    if (format === 'docx') {
      const buffer = await generateNotesDOCX({ presentation, notes });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.docx"`);
      return res.send(buffer);
    } else {
      // Default: PDF
      const buffer = await generateNotesPDF({ presentation, notes });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.pdf"`);
      return res.send(buffer);
    }
  } catch (err) {
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
});

export default router;
