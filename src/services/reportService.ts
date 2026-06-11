import Groq from 'groq-sdk';

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const MODEL = 'llama-3.3-70b-versatile';

export interface ReportSection {
  title: string;
  content: string;
}

export interface EngineeringReport {
  projectTitle: string;
  collegeName: string;
  department: string;
  academicYear: string;
  sections: ReportSection[];
}

// ── Generate full report from uploaded content ────────────────────
export async function generateEngineeringReport(
  docText: string,
  collegeName = 'Engineering College',
  department = 'Computer Science & Engineering',
  academicYear = '2024-25',
): Promise<EngineeringReport> {
  const doc = docText.slice(0, 12000);

  const prompt = `You are an expert academic report writer for engineering colleges.
Analyze the following project document and generate a complete, professional engineering project report.

DOCUMENT CONTENT:
${doc}

Generate a full engineering project report with ALL of the following sections.
Return ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON.

JSON FORMAT:
{
  "projectTitle": "Full descriptive project title extracted from the document",
  "collegeName": "${collegeName}",
  "department": "${department}",
  "academicYear": "${academicYear}",
  "sections": [
    {
      "title": "Abstract",
      "content": "A concise 150-200 word summary of the entire project covering the problem, approach, technologies used, and key outcomes. Written in third person, past tense."
    },
    {
      "title": "1. Introduction",
      "content": "2-3 paragraphs introducing the project domain, background context, motivation for the project, and a brief overview of what the system does. Include the significance of the work."
    },
    {
      "title": "2. Problem Statement",
      "content": "A clear, precise statement of the problem being solved. Describe the existing gaps, limitations of current solutions, and why this project is needed. 1-2 paragraphs."
    },
    {
      "title": "3. Objectives",
      "content": "List 5-7 specific, measurable objectives of the project. Each objective should start with an action verb (Design, Develop, Implement, Evaluate, etc.)."
    },
    {
      "title": "4. Literature Survey",
      "content": "Review of 4-5 related works or existing systems. For each, describe the approach, technology used, and its limitations. Conclude with how this project addresses those gaps."
    },
    {
      "title": "5. Methodology",
      "content": "Describe the development methodology used (Agile/Waterfall/Iterative). Explain each phase: Requirements Analysis, System Design, Implementation, Testing, Deployment. 2-3 paragraphs."
    },
    {
      "title": "6. System Architecture",
      "content": "Describe the overall system architecture in detail. Explain the major components, how they interact, data flow between modules, client-server structure if applicable, and any APIs or external services used."
    },
    {
      "title": "7. Modules Description",
      "content": "List and describe each module of the system. For each module provide: Module Name, Purpose, Key Functions, and Inputs/Outputs. Cover at least 4-6 modules."
    },
    {
      "title": "8. Technologies Used",
      "content": "List all technologies, frameworks, languages, tools, and platforms used. Organize into categories: Frontend, Backend, Database, APIs/Services, Development Tools. Justify why each was chosen."
    },
    {
      "title": "9. Implementation",
      "content": "Describe the implementation process in detail. Cover key algorithms, important code logic (without actual code), database schema design, UI/UX decisions, and any challenges faced during development."
    },
    {
      "title": "10. Results and Discussion",
      "content": "Present the outcomes of the project. Describe what was achieved, system performance, test results, screenshots description, accuracy metrics if applicable, and comparison with existing systems."
    },
    {
      "title": "11. Advantages",
      "content": "List 5-7 key advantages of the proposed system over existing solutions. Be specific and technical."
    },
    {
      "title": "12. Applications",
      "content": "Describe 5-6 real-world application areas where this system can be deployed. Include both immediate and potential future applications."
    },
    {
      "title": "13. Future Scope",
      "content": "Describe 4-5 potential enhancements and future directions for the project. Include emerging technologies that could be integrated and scalability improvements."
    },
    {
      "title": "14. Conclusion",
      "content": "A 1-2 paragraph conclusion summarizing what was accomplished, the significance of the project, key learnings, and the overall impact of the system."
    },
    {
      "title": "15. References",
      "content": "List 6-8 references in IEEE format. Include research papers, textbooks, and official documentation relevant to the project technologies and domain."
    }
  ]
}

IMPORTANT RULES:
- Write in formal academic English suitable for engineering college submission
- Use technical terminology appropriate to the domain
- Make content specific to the uploaded document — do NOT write generic content
- Each section must be substantive and detailed (not placeholder text)
- The report must be plagiarism-free and original
- Do NOT include actual source code in any section`;

  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  });

  const raw = res.choices[0]?.message?.content ?? '';
  if (!raw.trim()) throw new Error('Empty response from AI model.');

  try {
    return JSON.parse(raw) as EngineeringReport;
  } catch {
    // Try to extract JSON if model wrapped it
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as EngineeringReport;
    throw new Error('Failed to parse report JSON from AI response.');
  }
}

// ── Download as .txt (universally compatible) ─────────────────────
export function downloadAsTxt(report: EngineeringReport): void {
  const lines: string[] = [];
  const divider = '═'.repeat(70);
  const thinDivider = '─'.repeat(70);

  lines.push(divider);
  lines.push('');
  lines.push(`                    ${report.collegeName.toUpperCase()}`);
  lines.push(`                    Department of ${report.department}`);
  lines.push(`                    Academic Year: ${report.academicYear}`);
  lines.push('');
  lines.push(divider);
  lines.push('');
  lines.push('                    PROJECT REPORT');
  lines.push('');
  lines.push(`Title: ${report.projectTitle}`);
  lines.push('');
  lines.push(divider);
  lines.push('');

  for (const section of report.sections) {
    lines.push('');
    lines.push(section.title.toUpperCase());
    lines.push(thinDivider);
    lines.push('');
    lines.push(section.content);
    lines.push('');
  }

  lines.push(divider);
  lines.push('                    END OF REPORT');
  lines.push(divider);

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, `${report.projectTitle.replace(/[^a-z0-9]/gi, '_')}_Report.txt`);
}

// ── Download as .doc (Word-compatible HTML) ───────────────────────
export function downloadAsDoc(report: EngineeringReport): void {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const sectionHtml = report.sections.map(s => `
    <h2 style="font-size:14pt;color:#1a1a2e;margin-top:24pt;margin-bottom:6pt;border-bottom:1px solid #ccc;padding-bottom:4pt;">
      ${escape(s.title)}
    </h2>
    <p style="font-size:11pt;line-height:1.8;text-align:justify;margin-bottom:12pt;white-space:pre-wrap;">${escape(s.content)}</p>
  `).join('');

  const html = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <title>${escape(report.projectTitle)}</title>
  <!--[if gte mso 9]>
  <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml>
  <![endif]-->
  <style>
    body { font-family: 'Times New Roman', serif; margin: 72pt; color: #111; }
    h1   { font-size: 18pt; text-align: center; color: #1a1a2e; margin-bottom: 4pt; }
    h2   { font-size: 14pt; color: #1a1a2e; }
    .cover { text-align: center; margin-bottom: 48pt; border-bottom: 2px solid #1a1a2e; padding-bottom: 24pt; }
    .cover p { font-size: 12pt; margin: 4pt 0; color: #444; }
    .cover .label { font-size: 10pt; color: #888; text-transform: uppercase; letter-spacing: 2px; }
    p { font-size: 11pt; line-height: 1.8; text-align: justify; }
  </style>
</head>
<body>
  <div class="cover">
    <p class="label">Project Report</p>
    <h1>${escape(report.projectTitle)}</h1>
    <p>${escape(report.collegeName)}</p>
    <p>Department of ${escape(report.department)}</p>
    <p>Academic Year: ${escape(report.academicYear)}</p>
  </div>
  ${sectionHtml}
</body>
</html>`;

  const blob = new Blob([html], { type: 'application/msword' });
  triggerDownload(blob, `${report.projectTitle.replace(/[^a-z0-9]/gi, '_')}_Report.doc`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
