import mongoose from 'mongoose';

const testResultSchema = new mongoose.Schema(
  {
    testName: { type: String, required: true },
    passed: { type: Boolean, required: true },
    expected: { type: String, default: '' },
    actual: { type: String, default: '' },
    error: { type: String, default: '' }
  },
  { _id: false }
);

const executionLogSchema = new mongoose.Schema(
  {
    codeExampleId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'CodeExample', 
      index: true 
    },
    language: { type: String, required: true },
    code: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['success', 'compilation_error', 'runtime_error', 'timeout'], 
      required: true 
    },
    output: { type: String, default: '' },
    errorOutput: { type: String, default: '' },
    executionTimeMs: { type: Number, default: 0 },
    memoryKb: { type: Number, default: 0 },
    testResults: [testResultSchema],
    allTestsPassed: { type: Boolean, default: false },
    userId: { type: String, default: 'trainer_default' }
  },
  { timestamps: true }
);

export const ExecutionLog = mongoose.model('ExecutionLog', executionLogSchema);
