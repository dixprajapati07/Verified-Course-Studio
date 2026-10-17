import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from '../seed.js';
import { Presentation } from '../models/Presentation.js';
import { Slide } from '../models/Slide.js';
import { Note } from '../models/Note.js';
import { CodeExample } from '../models/CodeExample.js';

let presentationId = '';
let slideId = '';
let codeExampleId = '';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDB();
  const seeded = await seedDatabase();
  presentationId = seeded._id.toString();

  const slide = await Slide.findOne({ presentationId });
  slideId = slide._id.toString();

  const example = await CodeExample.findOne();
  codeExampleId = example._id.toString();
});

afterAll(async () => {
  await disconnectDB();
});

describe('Verified Course Studio Backend API Tests', () => {

  describe('Health Check', () => {
    it('GET /api/health returns healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('Feature 1: Presentation & Slide Notes API', () => {
    it('GET /api/presentations retrieves seeded presentation', async () => {
      const res = await request(app).get('/api/presentations');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /api/presentations/:id retrieves presentation with slides and notes', async () => {
      const res = await request(app).get(`/api/presentations/${presentationId}`);
      expect(res.status).toBe(200);
      expect(res.body.presentation).toBeDefined();
      expect(res.body.slides.length).toBeGreaterThan(0);
      expect(res.body.notes.length).toBeGreaterThan(0);
    });

    it('POST /api/presentations/:id/notes/generate creates or updates notes for all slides', async () => {
      const res = await request(app).post(`/api/presentations/${presentationId}/notes/generate`);
      expect(res.status).toBe(200);
      expect(res.body.notes).toBeDefined();
      expect(res.body.notes.length).toBeGreaterThan(0);
      expect(res.body.notes[0].summary).toBeDefined();
      expect(res.body.notes[0].speakingScript).toBeDefined();
    });

    it('PATCH /api/slides/:slideId/notes preserves saved trainer edits', async () => {
      const newSummary = 'Updated summary by trainer for lecture delivery';
      const newScript = 'Good morning class, today we examine API boundaries closely.';

      const res = await request(app)
        .patch(`/api/slides/${slideId}/notes`)
        .send({
          summary: newSummary,
          speakingScript: newScript
        });

      expect(res.status).toBe(200);
      expect(res.body.note.summary).toBe(newSummary);
      expect(res.body.note.speakingScript).toBe(newScript);
      expect(res.body.note.isEdited).toBe(true);

      // Verify persistence directly in MongoDB
      const persisted = await Note.findOne({ slideId });
      expect(persisted.summary).toBe(newSummary);
      expect(persisted.isEdited).toBe(true);
    });

    it('GET /api/presentations/:id/notes/export returns PDF stream', async () => {
      const res = await request(app)
        .get(`/api/presentations/${presentationId}/notes/export?format=pdf`)
        .responseType('blob');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    it('GET /api/presentations/:id/notes/export returns DOCX stream', async () => {
      const res = await request(app)
        .get(`/api/presentations/${presentationId}/notes/export?format=docx`)
        .responseType('blob');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument');
    });
  });

  describe('Feature 2: Code Execution & Verification API', () => {
    it('POST /api/code-examples/run executes real code via isolated runner', async () => {
      const res = await request(app)
        .post('/api/code-examples/run')
        .send({
          language: 'python',
          code: 'print("EXECUTION_SANDBOX_OK_2026")\nprint(f"Computed: {2 + 3}")'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.output).toContain('EXECUTION_SANDBOX_OK_2026');
      expect(res.body.output).toContain('Computed: 5');
      expect(res.body.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('POST /api/code-examples/run rejects disallowed languages', async () => {
      const res = await request(app)
        .post('/api/code-examples/run')
        .send({
          language: 'malicious_lang',
          code: 'rm -rf /'
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('is not permitted');
    });

    it('POST /api/code-examples/:id/verify runs tests and verifies passing code', async () => {
      const passingCode = `def validate_course_payload(payload):\n    return {"status": "VALIDATED", "title": payload.get("title", "")}\n\nif __name__ == "__main__":\n    print("Validation Result: VALIDATED")\n    print("Course: Spring Boot REST APIs")`;

      const res = await request(app)
        .post(`/api/code-examples/${codeExampleId}/verify`)
        .send({ code: passingCode });

      expect(res.status).toBe(200);
      expect(res.body.allTestsPassed).toBe(true);
      expect(res.body.isVerified).toBe(true);

      // Verify in MongoDB
      const example = await CodeExample.findById(codeExampleId);
      expect(example.isVerified).toBe(true);
    });
  });

});
