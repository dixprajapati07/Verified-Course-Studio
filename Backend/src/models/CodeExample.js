import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    name: { type: String, required: true },
    input: { type: String, default: '' },
    expectedOutput: { type: String, required: true },
    assertionType: { 
      type: String, 
      enum: ['exact', 'contains', 'regex'], 
      default: 'contains' 
    }
  },
  { _id: false }
);

const lineExplanationSchema = new mongoose.Schema(
  {
    lineRange: { type: String, required: true },
    explanation: { type: String, required: true }
  },
  { _id: false }
);

const codeExampleSchema = new mongoose.Schema(
  {
    presentationId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Presentation',
      index: true 
    },
    slideId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Slide',
      index: true 
    },
    title: { type: String, required: true, trim: true },
    topic: { type: String, required: true },
    language: { 
      type: String, 
      required: true, 
      enum: ['java', 'python', 'javascript', 'typescript', 'go'],
      default: 'python' 
    },
    runtimeVersion: { type: String, default: '3.12' },
    difficulty: { 
      type: String, 
      enum: ['Beginner', 'Intermediate', 'Advanced'], 
      default: 'Intermediate' 
    },
    lessonObjective: { type: String, required: true },
    code: { type: String, required: true },
    explanation: [lineExplanationSchema],
    tests: [testCaseSchema],
    isVerified: { type: Boolean, default: false },
    lastVerificationDate: { type: Date },
    executionCount: { type: Number, default: 0 },
    userId: { type: String, default: 'trainer_default' }
  },
  { timestamps: true }
);

export const CodeExample = mongoose.model('CodeExample', codeExampleSchema);
