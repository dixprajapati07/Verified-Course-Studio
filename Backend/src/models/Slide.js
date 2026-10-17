import mongoose from 'mongoose';

const slideSchema = new mongoose.Schema(
  {
    presentationId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Presentation', 
      required: true,
      index: true
    },
    slideNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    bulletPoints: [{ type: String }],
    codeSnippet: {
      language: { type: String, default: '' },
      code: { type: String, default: '' },
      filename: { type: String, default: '' }
    },
    visualDiagram: {
      diagramType: { type: String, default: 'flow' },
      labels: [{ type: String }]
    },
    notes: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Note' 
    }
  },
  { timestamps: true }
);

slideSchema.index({ presentationId: 1, slideNumber: 1 }, { unique: true });

export const Slide = mongoose.model('Slide', slideSchema);
