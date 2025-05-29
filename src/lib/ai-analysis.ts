import { openai } from '@ai-sdk/openai';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';

// Schema for structured AI analysis
export const AnalysisSchema = z.object({
  alternatives: z.array(z.object({
    name: z.string(),
    url: z.string(),
    description: z.string().optional(),
    githubUrl: z.string().optional(),
    stars: z.number().optional(),
    category: z.string().optional(),
    reasoning: z.string() // Why this alternative is suggested
  })),
  category: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  considerations: z.array(z.string()),
  useCase: z.string(),
  targetAudience: z.string()
});

export type AIAnalysisResult = z.infer<typeof AnalysisSchema>;

interface GitHubRepo {
  name: string;
  owner: { login: string };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  html_url: string;
}

export class AIAnalysisService {
  private model = openai('gpt-4o-mini');

  async analyzeRepository(repoData: GitHubRepo): Promise<AIAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(repoData);
    
    const result = await generateObject({
      model: this.model,
      schema: AnalysisSchema,
      prompt,
      temperature: 0.7
    });

    return result.object;
  }

  async searchAlternatives(repoData: GitHubRepo): Promise<string[]> {
    const searchPrompt = `
    Given this GitHub repository:
    - Name: ${repoData.name}
    - Description: ${repoData.description || 'No description'}
    - Language: ${repoData.language || 'Unknown'}
    - Topics: ${repoData.topics?.join(', ') || 'None'}

    Generate 5-8 search queries that would help find alternative tools, libraries, or projects that serve similar purposes.
    These queries should be specific and targeted for GitHub search or general web search.
    
    Return only the search queries, one per line.
    `;

    const result = await generateText({
      model: this.model,
      prompt: searchPrompt,
      temperature: 0.5
    });

    return result.text.split('\n').filter(q => q.trim().length > 0);
  }

  private buildAnalysisPrompt(repoData: GitHubRepo): string {
    return `
    You are an expert software analyst. Analyze this GitHub repository and provide comprehensive insights about alternatives and categorization.

    Repository Details:
    - Name: ${repoData.name}
    - Owner: ${repoData.owner.login}
    - Description: ${repoData.description || 'No description provided'}
    - Primary Language: ${repoData.language || 'Not specified'}
    - Stars: ${repoData.stargazers_count}
    - Forks: ${repoData.forks_count}
    - Topics/Tags: ${repoData.topics?.join(', ') || 'None'}
    - URL: ${repoData.html_url}

    Your task is to:

    1. **Find Alternatives**: Identify 5-8 similar tools, libraries, or projects that serve the same or similar purpose. For each alternative, provide:
       - Name of the project/tool
       - GitHub URL (if available) or main website URL
       - Brief description of what it does
       - Reasoning for why it's a good alternative
       - Estimated popularity/stars (if known)
       - Specific category/type

    2. **Categorize**: Determine the most appropriate category for this repository (e.g., "Web Framework", "CLI Tool", "Machine Learning Library", "Database", "DevOps Tool", etc.)

    3. **Analysis**: Provide a comprehensive summary including:
       - What this tool/project does
       - Key strengths and features
       - Important considerations or limitations
       - Primary use cases
       - Target audience (developers, end-users, specific industries, etc.)

    Focus on accuracy and relevance. If you're not certain about specific details like exact star counts, indicate this in your response. 
    Prioritize well-known, actively maintained alternatives with good community support.

    Be thorough but concise. The analysis should help developers understand if this tool is right for their needs and what other options they should consider.
    `;
  }

  async enhanceWithWebSearch(repoData: GitHubRepo, initialAnalysis: AIAnalysisResult): Promise<AIAnalysisResult> {
    // This method could be extended to use web search APIs to find more accurate alternative data
    // For now, it returns the initial analysis
    return initialAnalysis;
  }
}
