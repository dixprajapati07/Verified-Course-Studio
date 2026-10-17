import mongoose from 'mongoose';

const presentationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    topic: { type: String, required: true },
    targetAudience: { 
      type: String, 
      enum: ['Beginner', 'Intermediate', 'Advanced'], 
      default: 'Intermediate' 
    },
    language: { type: String, default: 'Java' },
    framework: { type: String, default: 'Spring Boot 3.2' },
    slideCount: { type: Number, default: 0 },
    userId: { type: String, default: 'trainer_default', index: true },
    branding: {
      instituteName: { type: String, default: 'TechSummit Academy' },
      accentColor: { type: String, default: '#6366f1' }
    }
  },
  { timestamps: true }
);

export const Presentation = mongoose.model('Presentation', presentationSchema);
