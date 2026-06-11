import Groq from 'groq-sdk';
import { Presentation, PresentationInput } from '../types';
import { getAudienceRelevantVideos } from './youtubeService';

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function generatePresentation(input: PresentationInput): Promise<Presentation> {
  const videos = await getAudienceRelevantVideos(input.topic, input.audience);

  const audienceGuide = input.audience === 'school'
    ? `SCHOOL AUDIENCE (simple, engaging, emoji-rich):
- Each slide: 6-8 bullet points, each 8-15 words, use emojis in every bullet
- Use simple analogies and real-life examples kids relate to
- Speaker notes: 4-6 sentences, encouraging tone, fun facts
- Visuals: simple bar/pie charts (2-3 items), max 3-step flowcharts`
    : `COLLEGE AUDIENCE (academic, detailed, professional):
- Each slide: 6-8 bullet points, each 15-25 words, technically accurate
- Include definitions, mechanisms, formulas, or processes where relevant
- Add sub-points or elaborations where the concept needs depth
- Speaker notes: 5-8 sentences with examples, context, and exam tips
- Visuals: detailed charts (4-6 data points), 4-6 step flowcharts, tables`;

  const prompt = `You are an expert educational presentation generator. Create a RICH, DETAILED, CONTENT-HEAVY presentation.

TOPIC: ${input.topic}
SUBJECT: ${input.subject}
AUDIENCE: ${input.audience}
SLIDE COUNT: ${input.slideCount}
TONE: ${input.tone}
PEDAGOGY: ${input.pedagogyMode}
PDF CONTENT: ${input.pdfContent ? input.pdfContent.substring(0, 4000) : 'None — use your knowledge'}
PRIMARY COLOR: ${input.primaryColor}
SECONDARY COLOR: ${input.secondaryColor}
COLLEGE NAME: ${input.collegeName}
SUBMITTED BY: ${input.submittedBy}
SUBMITTED TO: ${input.submittedTo}
SUGGESTED VIDEOS: ${JSON.stringify(videos)}

═══════════════════════════════════════
CONTENT DEPTH REQUIREMENTS (CRITICAL):
═══════════════════════════════════════
${audienceGuide}

EVERY slide MUST have ALL of the following:
1. title: Specific, descriptive (5-10 words), NOT generic like "Introduction" or "Overview"
2. content: MINIMUM 6 bullet points, MAXIMUM 8. Each bullet must be:
   - A complete informative sentence (not just a word or phrase)
   - Contain actual facts, data, mechanisms, or explanations
   - School: 8-15 words with emoji. College: 15-25 words, technically rich
3. speaker_notes: MINIMUM 5 sentences covering:
   - What to say about this slide
   - A real-world example or analogy
   - A key fact or statistic
   - A connection to the next slide
   - An engagement question for the audience
4. visual_suggestion: Describe exactly what visual would best illustrate this slide
5. EXACTLY ONE visual from: chart_data, flow_chart, table_data, er_diagram, architecture, image_url

═══════════════════════════════════════
SLIDE STRUCTURE RULES:
═══════════════════════════════════════
Slide 1: Title/Introduction — hook the audience, state the problem or importance
Slides 2 to N-2: Core content — each slide covers ONE specific sub-topic in depth
  - Cover: definitions, history, how it works, types/categories, advantages, disadvantages,
    real-world applications, case studies, comparisons, future trends
Slide N-1: Summary/Key Takeaways — consolidate all learning points
Slide N: Conclusion/Call to Action — what students should do next

PEDAGOGY MODES:
- Socratic: Add 2 inquiry questions per slide in speaker_notes
- Gamified: Add a mini-challenge or points system in speaker_notes
- Flipped: Add pre-class reading task in speaker_notes for first 3 slides
- None: Standard educational delivery

VISUALS — assign intelligently:
- Processes/workflows → flow_chart (4-6 steps)
- Data/statistics/comparisons → chart_data (bar/pie/line with 4-6 real data points)
- Comparisons/features → table_data (3-5 rows, 3-4 columns with real values)
- Database/entity topics → er_diagram
- System/architecture topics → architecture
- All others → image_url: "https://source.unsplash.com/800x500/?${encodeURIComponent(input.topic)},education"

VIDEO ASSIGNMENT: Use suggested videos ONLY if title matches slide topic 85%+.
Suggested: ${JSON.stringify(videos)}

═══════════════════════════════════════
RETURN ONLY THIS EXACT JSON (no markdown, no explanation):
═══════════════════════════════════════
{
  "presentation_title": "Full descriptive title of the presentation",
  "audience": "${input.audience}",
  "brand_theme": {
    "primary_color": "${input.primaryColor}",
    "secondary_color": "${input.secondaryColor}",
    "college_name": "${input.collegeName}",
    "submitted_by": "${input.submittedBy}",
    "submitted_to": "${input.submittedTo}"
  },
  "slides": [
    {
      "slide_number": 1,
      "title": "Specific descriptive slide title",
      "content": [
        "First complete informative bullet point sentence with real content",
        "Second complete informative bullet point sentence with real content",
        "Third complete informative bullet point sentence with real content",
        "Fourth complete informative bullet point sentence with real content",
        "Fifth complete informative bullet point sentence with real content",
        "Sixth complete informative bullet point sentence with real content"
      ],
      "visual_suggestion": "Description of the ideal visual for this slide",
      "speaker_notes": "Detailed speaker notes covering what to say, examples, facts, and engagement questions. At least 5 sentences.",
      "image_url": "https://source.unsplash.com/800x500/?topic,education",
      "chart_data": { "type": "bar", "data": [{"label": "Category A", "value": 45}, {"label": "Category B", "value": 72}] },
      "flow_chart": { "steps": [{"id": "s1", "text": "Step description", "type": "start"}, {"id": "s2", "text": "Process step", "type": "process"}, {"id": "s3", "text": "End", "type": "end"}] },
      "table_data": { "headers": ["Feature", "Option A", "Option B"], "rows": [["Row 1", "Value", "Value"], ["Row 2", "Value", "Value"]] },
      "er_diagram": { "entities": [{"id": "e1", "name": "Entity", "attributes": ["id", "name"]}], "relations": [{"from": "e1", "to": "e2", "label": "has", "type": "one-to-many"}] },
      "architecture": { "nodes": [{"id": "n1", "label": "Component", "type": "service"}], "edges": [{"from": "n1", "to": "n2", "label": "calls"}] },
      "video_url": "https://www.youtube.com/watch?v=VIDEO_ID"
    }
  ],
  "pedagogy_section": {
    "mode": "${input.pedagogyMode}",
    "strategy_description": "Detailed description of the pedagogical approach used",
    "activities": ["Activity 1 description", "Activity 2 description", "Activity 3 description"],
    "discussion_prompts": ["Discussion question 1?", "Discussion question 2?", "Discussion question 3?"],
    "quiz": [
      {"question": "Quiz question 1?", "options": ["A) Option", "B) Option", "C) Option", "D) Option"], "answer": "A) Option"},
      {"question": "Quiz question 2?", "options": ["A) Option", "B) Option", "C) Option", "D) Option"], "answer": "B) Option"},
      {"question": "Quiz question 3?", "options": ["A) Option", "B) Option", "C) Option", "D) Option"], "answer": "C) Option"}
    ]
  },
  "data_source_summary": {
    "summary": "Summary of content sources and knowledge used",
    "sources_used": ["Source 1", "Source 2", "Source 3"]
  }
}

IMPORTANT: Generate ALL ${input.slideCount} slides with FULL content. Do not truncate or abbreviate any slide.`;

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.65,
    max_tokens: 8000,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error('Empty response from model.');

  const parsed = JSON.parse(text);

  // Validate and patch slides that have too few bullets
  if (parsed.slides) {
    parsed.slides = parsed.slides.map((slide: any) => ({
      ...slide,
      content: Array.isArray(slide.content) && slide.content.length >= 3
        ? slide.content
        : ['Content not generated — please regenerate.'],
      speaker_notes: slide.speaker_notes || 'No speaker notes generated.',
    }));
  }

  return parsed;
}
