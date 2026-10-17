import mongoose from 'mongoose';

const keyTermSchema = new mongoose.Schema(
  {
    term: { type: String, required: true },
    definition: { type: String, required: true }
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    slideId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Slide', 
      required: true,
      unique: true,
      index: true 
    },
    presentationId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Presentation', 
      required: true,
      index: true 
    },
    slideNumber: { type: Number, required: true },
    slideTitle: { type: String, default: '' },
    summary: { type: String, required: true },
    detailedExplanation: { type: String, required: true },
    speakingScript: { type: String, required: true },
    practicalExample: { type: String, required: true },
    keyTerms: [keyTermSchema],
    takeaways: [{ type: String }],
    transitionSentence: { type: String, required: true },
    estimatedSpeakingTime: { type: String, default: '3-4 mins' },
    isEdited: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    lastSavedAt: { type: Date, default: Date.now },
    userId: { type: String, default: 'trainer_default' }
  },
  { timestamps: true }
);

export const Note = mongoose.model('Note', noteSchema);
