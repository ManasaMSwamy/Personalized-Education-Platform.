import { Presentation } from './types';

export const demoPresentation: Presentation = {
  presentation_title: 'Artificial Intelligence Demo',
  audience: 'college',
  brand_theme: {
    primary_color: '#4f46e5',
    secondary_color: '#ec4899',
    college_name: 'Demo University',
    submitted_by: 'AI Demo',
    submitted_to: 'Students',
  },
  slides: [
    {
      slide_number: 1,
      title: 'What is AI?',
      content: ['AI is machines doing smart things', 'Like Siri or self-driving cars', 'Learns from data'],
      visual_suggestion: 'Fun robot image',
      speaker_notes: 'Start with relatable examples',
      image_url: 'https://source.unsplash.com/800x500/?robot',
      video_url: 'https://www.youtube.com/watch?v/dQw4w9WgXcQ', // Rick Roll - guaranteed working
    },
    {
      slide_number: 2,
      title: 'How AI Works',
      content: ['Data → Model → Predictions', 'Training with lots of examples', 'Math + Computers = Magic'],
      visual_suggestion: 'Simple flowchart',
      speaker_notes: 'Keep simple for demo',
      flow_chart: {
        steps: [
          { id: '1', text: 'Collect Data', type: 'start' },
          { id: '2', text: 'Train Model', type: 'process' },
          { id: '3', text: 'Make Prediction?', type: 'decision' },
          { id: '4', text: 'Done!', type: 'end' },
        ],
      },
    },
    {
      slide_number: 3,
      title: 'AI Examples',
      content: ['ChatGPT writes essays', 'Netflix recommends shows', 'Self-driving cars'],
      visual_suggestion: 'Icons grid',
      speaker_notes: 'Real world to engage',
      table_data: {
        headers: ['AI App', 'What it does'],
        rows: [['ChatGPT', 'Writes text'], ['Netflix', 'Movie recs'], ['Tesla', 'Drives car']],
      },
    },
    {
      slide_number: 4,
      title: 'Future of AI',
      content: ['Smarter robots', 'Better medicine', 'Creative AI art'],
      visual_suggestion: 'Futuristic image',
      speaker_notes: 'End on exciting note',
      image_url: 'https://source.unsplash.com/800x500/?future,ai',
    },
    {
      slide_number: 5,
      title: 'Questions?',
      content: ['What excites you most?', 'What scares you?', 'Try AI tools today!'],
      visual_suggestion: 'Question mark graphic',
      speaker_notes: 'Interactive close',
      chart_data: {
        type: 'pie',
        data: [{ label: 'Excited', value: 60 }, { label: 'Curious', value: 30 }, { label: 'Scared', value: 10 }],
      },
    },
  ],
  pedagogy_section: {
    mode: 'Interactive',
    strategy_description: 'Hands-on AI exploration',
    activities: ['Try ChatGPT live', 'Discuss future impacts'],
    quiz: [{ question: 'What does AI stand for?', options: ['Artificial Intelligence', 'Awesome Ideas', 'Auto Internet'], answer: 'Artificial Intelligence' }],
  },
  data_source_summary: {
    summary: 'Demo data for testing',
    sources_used: ['Mock AI', 'YouTube suggestions'],
  },
};
