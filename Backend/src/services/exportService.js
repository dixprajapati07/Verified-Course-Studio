import PDFDocument from 'pdfkit';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle 
} from 'docx';

/**
 * Generate PDF buffer for presentation speaker notes.
 */
export async function generateNotesPDF({ presentation, notes }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title & Header
      doc.fontSize(22).fillColor('#1e1b4b').text('Verified Course Material Studio', { align: 'center' });
      doc.fontSize(14).fillColor('#4338ca').text(`Trainer Speaker Briefing: ${presentation.title}`, { align: 'center' });
      doc.fontSize(10).fillColor('#64748b').text(`Audience: ${presentation.targetAudience} | Framework: ${presentation.framework} | Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(1.5);

      // Divider line
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      notes.forEach((note, index) => {
        // Prevent orphaned headers near bottom of page
        if (doc.y > 660) {
          doc.addPage();
        }

        doc.fontSize(14).fillColor('#1e293b').text(`Slide ${note.slideNumber}: ${note.slideTitle || 'Slide ' + note.slideNumber}`);
        doc.fontSize(9).fillColor('#6366f1').text(`Estimated Speaking Time: ${note.estimatedSpeakingTime || '3-4 mins'}`);
        doc.moveDown(0.4);

        // Slide Summary
        doc.fontSize(10).fillColor('#334155').font('Helvetica-Bold').text('Slide Summary: ', { continued: true })
           .font('Helvetica').text(note.summary);
        doc.moveDown(0.6);

        // Detailed Explanation
        doc.fontSize(10).fillColor('#334155').font('Helvetica-Bold').text('Detailed Explanation: ', { continued: true })
           .font('Helvetica').text(note.detailedExplanation);
        doc.moveDown(0.6);

        // Speaking Script Box
        doc.fontSize(10).fillColor('#4338ca').font('Helvetica-Bold').text('Trainer Speaking Script (Classroom Cue):');
        doc.fontSize(9.5).fillColor('#1e1b4b').font('Helvetica-Oblique').text(`"${note.speakingScript}"`, { indent: 15 });
        doc.moveDown(0.6);

        // Practical Example
        doc.fontSize(10).fillColor('#334155').font('Helvetica-Bold').text('Practical Industry Example: ', { continued: true })
           .font('Helvetica').text(note.practicalExample);
        doc.moveDown(0.6);

        // Key Terms
        if (note.keyTerms && note.keyTerms.length > 0) {
          doc.fontSize(10).fillColor('#334155').font('Helvetica-Bold').text('Key Terms:');
          note.keyTerms.forEach(term => {
            doc.fontSize(9).fillColor('#0f172a').font('Helvetica-Bold').text(`• ${term.term}: `, { continued: true, indent: 10 })
               .font('Helvetica').fillColor('#475569').text(term.definition);
          });
          doc.moveDown(0.4);
        }

        // Takeaways
        if (note.takeaways && note.takeaways.length > 0) {
          doc.fontSize(10).fillColor('#334155').font('Helvetica-Bold').text('Student Takeaways:');
          note.takeaways.forEach(item => {
            doc.fontSize(9).fillColor('#475569').font('Helvetica').text(`✓ ${item}`, { indent: 10 });
          });
          doc.moveDown(0.4);
        }

        // Transition Sentence
        doc.fontSize(10).fillColor('#0284c7').font('Helvetica-Bold').text('Transition Sentence: ', { continued: true })
           .font('Helvetica').text(note.transitionSentence);
        doc.moveDown(1.2);

        // Slide separator line
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(1);
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate DOCX buffer for presentation speaker notes.
 */
export async function generateNotesDOCX({ presentation, notes }) {
  const sectionsChildren = [
    new Paragraph({
      text: 'Verified Course Material Studio',
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 }
    }),
    new Paragraph({
      text: `Speaker Notes Briefing: ${presentation.title}`,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 80 }
    }),
    new Paragraph({
      text: `Audience: ${presentation.targetAudience} | Framework: ${presentation.framework} | Exported: ${new Date().toLocaleDateString()}`,
      spacing: { after: 240 }
    })
  ];

  notes.forEach((note) => {
    sectionsChildren.push(
      new Paragraph({
        text: `Slide ${note.slideNumber}: ${note.slideTitle || 'Slide ' + note.slideNumber}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 60 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Estimated Speaking Time: ', bold: true, color: '6366f1' }),
          new TextRun({ text: note.estimatedSpeakingTime || '3-4 mins', color: '6366f1' })
        ],
        spacing: { after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Slide Summary: ', bold: true }),
          new TextRun({ text: note.summary })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Detailed Explanation: ', bold: true }),
          new TextRun({ text: note.detailedExplanation })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Trainer Speaking Script: ', bold: true, color: '4338ca' }),
          new TextRun({ text: `"${note.speakingScript}"`, italics: true })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Practical Industry Example: ', bold: true }),
          new TextRun({ text: note.practicalExample })
        ],
        spacing: { after: 100 }
      })
    );

    if (note.takeaways && note.takeaways.length > 0) {
      sectionsChildren.push(
        new Paragraph({
          text: 'Core Takeaways:',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 80, after: 40 }
        })
      );
      note.takeaways.forEach((item) => {
        sectionsChildren.push(
          new Paragraph({
            text: `• ${item}`,
            bullet: { level: 0 },
            spacing: { after: 40 }
          })
        );
      });
    }

    sectionsChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Transition to Next Slide: ', bold: true, color: '0284c7' }),
          new TextRun({ text: note.transitionSentence, italics: true })
        ],
        spacing: { before: 80, after: 200 }
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sectionsChildren
      }
    ]
  });

  return await Packer.toBuffer(doc);
}
