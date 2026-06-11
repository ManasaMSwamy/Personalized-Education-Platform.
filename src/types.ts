export interface Slide {
  slide_number: number;
  title: string;
  content: string[];
  visual_suggestion: string;
  speaker_notes: string;
  image_url?: string;
  chart_data?: {
    type: 'bar' | 'pie' | 'line' | 'table';
    data: any[];
    labels?: string[];
  };
  architecture?: {
    nodes: { id: string; label: string; type: string }[];
    edges: { from: string; to: string; label?: string }[];
  };
  flow_chart?: {
    steps: { id: string; text: string; type: 'start' | 'process' | 'decision' | 'end' }[];
  };
  table_data?: {
    headers: string[];
    rows: string[][];
  };
  er_diagram?: ERDiagram;
  video_url?: string;
};

export interface ERDiagram {
  entities: {
    id: string;
    name: string;
    attributes: string[];
  }[];
  relations: {
    from: string;
    to: string;
    label?: string;
    type: string;
  }[];
}

export interface Presentation {
  presentation_title: string;
  audience: 'school' | 'college';
  brand_theme: {
    primary_color: string;
    secondary_color: string;
    college_name?: string;
    college_logo_url?: string;
    department_logo_url?: string;
    submitted_by?: string;
    submitted_to?: string;
  };
  slides: Slide[];

  pedagogy_section?: {
    mode: string;
    strategy_description: string;
    activities?: string[];
    discussion_prompts?: string[];
    quiz?: {
      question: string;
      options: string[];
      answer: string;
    }[];
  };
  data_source_summary?: {
    summary: string;
    sources_used: string[];
  };
}

export type LoadingStage = 'idle' | 'analyzing' | 'generating' | 'media' | 'finalizing';


export interface PresentationInput {
  topic: string;
  subject: string;
  audience: 'school' | 'college';
  slideCount: number;
  tone: 'formal' | 'friendly' | 'storytelling' | 'interactive';
  pedagogyMode: 'Socratic' | 'Gamified' | 'Flipped' | 'None';
  pdfUpload: boolean;
  pdfContent?: string;
  // youtubeLink: string; // Removed - auto videos
  primaryColor: string;
  secondaryColor: string;
  collegeName: string;
  collegeLogoUrl?: string;
  departmentLogoUrl?: string;
  submittedBy: string;
  submittedTo: string;
}
