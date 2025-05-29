import { openai } from '@ai-sdk/openai';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';

// Schema for structured AI analysis with improved validation
export const AnalysisSchema = z.object({
  alternatives: z.array(z.object({
    name: z.string().min(1),
    url: z.string().url(),
    description: z.string().optional(),
    githubUrl: z.string().url().optional(),
    stars: z.number().int().min(0).optional().or(z.null()).transform(val => val ?? undefined),
    category: z.string().optional(),
    reasoning: z.string().min(1) // Why this alternative is suggested
  })).min(1),
  category: z.string().min(1),
  summary: z.string().min(10),
  strengths: z.array(z.string().min(1)).min(1),
  considerations: z.array(z.string().min(1)).min(1),
  useCase: z.string().min(5),
  targetAudience: z.string().min(5)
});

// Fallback schema with more lenient validation
export const FallbackAnalysisSchema = z.object({
  alternatives: z.array(z.object({
    name: z.string().min(1),
    url: z.string().url(),
    description: z.string().optional(),
    githubUrl: z.string().url().optional(),
    stars: z.number().int().min(0).optional().or(z.null()).transform(val => val ?? undefined),
    category: z.string().optional(),
    reasoning: z.string().min(1)
  })).min(1),
  category: z.string().min(1),
  summary: z.string().min(1),
  strengths: z.array(z.string()).optional().default(["Has active development", "Open source project"]),
  considerations: z.array(z.string()).optional().default(["Requires evaluation for specific use case"]),
  useCase: z.string().optional().default("Software development tool"),
  targetAudience: z.string().optional().default("Developers and technical users")
});

export type AIAnalysisResult = z.infer<typeof AnalysisSchema>;
export type FallbackAnalysisResult = z.infer<typeof FallbackAnalysisSchema>;

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
    
    try {
      const result = await generateObject({
        model: this.model,
        schema: AnalysisSchema,
        prompt,
        temperature: 0.7,
        schemaName: 'RepositoryAnalysis',
        schemaDescription: 'Complete analysis of a GitHub repository including alternatives, categorization, and detailed insights'
      });

      return result.object;    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Log detailed error information for debugging
      console.error('Primary analysis failed:', {
        errorName: error.name,
        errorMessage: error.message,
        repository: `${repoData.owner.login}/${repoData.name}`,
        cause: error.cause?.message || 'No cause available',
        text: error.text ? error.text.substring(0, 500) + '...' : 'No text available'
      });

      // If schema validation fails, try with a more explicit prompt
      if (error.name === 'AI_NoObjectGeneratedError' || error.name === 'AI_TypeValidationError') {
        console.warn('Attempting recovery with explicit prompt structure...');
        
        const explicitPrompt = this.buildExplicitPrompt(repoData);
          try {
          const result = await generateObject({
            model: this.model,
            schema: FallbackAnalysisSchema, // Use more lenient schema
            prompt: explicitPrompt,
            temperature: 0.3, // Even lower temperature for consistency
            schemaName: 'RepositoryAnalysis',
            schemaDescription: 'Complete analysis of a GitHub repository including alternatives, categorization, and detailed insights'
          });

          // Transform to match expected type, filling in defaults where needed
          const analysisResult: AIAnalysisResult = {
            ...result.object,
            strengths: result.object.strengths || [`Has ${repoData.stargazers_count} stars on GitHub`],
            considerations: result.object.considerations || ["Manual review recommended for detailed analysis"],
            useCase: result.object.useCase || `Development tool in ${repoData.language || 'software development'}`,
            targetAudience: result.object.targetAudience || `Developers and ${repoData.language || 'software'} enthusiasts`
          };          console.info('Recovery successful with fallback schema');
          return analysisResult;        } catch (secondError: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
          console.error('Recovery attempt also failed:', {
            errorName: secondError.name,
            errorMessage: secondError.message,
            repository: `${repoData.owner.login}/${repoData.name}`
          });
          
          // Fallback: create a minimal valid object
          return this.createFallbackAnalysis(repoData, secondError);
        }
      }
      
      throw error;
    }
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
    You are an expert software analyst. Analyze this GitHub repository and provide comprehensive insights following the exact structure required.

    Repository Details:
    - Name: ${repoData.name}
    - Owner: ${repoData.owner.login}
    - Description: ${repoData.description || 'No description provided'}
    - Primary Language: ${repoData.language || 'Not specified'}
    - Stars: ${repoData.stargazers_count}
    - Forks: ${repoData.forks_count}
    - Topics/Tags: ${repoData.topics?.join(', ') || 'None'}
    - URL: ${repoData.html_url}

    You must provide a complete analysis with ALL of the following sections:    1. **alternatives**: Find 5-8 similar tools, libraries, or projects that serve the same or similar purpose. For each alternative, provide:
       - name: Name of the project/tool (REQUIRED: string)
       - url: GitHub URL or main website URL (REQUIRED: valid URL string)
       - description: Brief description of what it does (OPTIONAL: string)
       - githubUrl: GitHub URL if different from url (OPTIONAL: valid URL string)  
       - stars: GitHub star count if known (OPTIONAL: positive integer number, omit if unknown)
       - category: Specific category/type (OPTIONAL: string)
       - reasoning: Detailed explanation for why it's a good alternative (REQUIRED: string)

    IMPORTANT: For the stars field, only provide actual numbers if you're confident about them. If uncertain, omit the field entirely rather than guessing.

    2. **category**: Determine the most appropriate category for this repository (e.g., "Web Framework", "CLI Tool", "Machine Learning Library", "Database", "DevOps Tool", etc.)

    3. **summary**: Provide a comprehensive overview of what this tool/project does and its significance.

    4. **strengths**: List key strengths and features as an array of strings. Include specific advantages, unique features, and what makes this tool stand out.

    5. **considerations**: List important considerations, limitations, or potential drawbacks as an array of strings. Include learning curve, performance considerations, or compatibility issues.

    6. **useCase**: Describe the primary use cases in a single, comprehensive sentence or paragraph.

    7. **targetAudience**: Describe the target audience in a single, comprehensive sentence (e.g., "developers, end-users, specific industries, etc.")

    Focus on accuracy and relevance. If you're not certain about specific details like exact star counts, provide reasonable estimates. 
    Prioritize well-known, actively maintained alternatives with good community support.

    Ensure ALL fields are provided in your response. The analysis should help developers understand if this tool is right for their needs and what other options they should consider.
    `;
  }
  private buildExplicitPrompt(repoData: GitHubRepo): string {
    return `
    You must analyze this GitHub repository and return a structured response with ALL required fields.

    Repository Information:
    Name: ${repoData.name}
    Owner: ${repoData.owner.login}
    Description: ${repoData.description || 'No description provided'}
    Language: ${repoData.language || 'Not specified'}
    Stars: ${repoData.stargazers_count}
    Forks: ${repoData.forks_count}
    Topics: ${repoData.topics?.join(', ') || 'None'}

    CRITICAL: You MUST provide ALL of the following fields in your response:

    1. alternatives: Array of 5-8 similar projects, each with:
       - name (required)
       - url (required) 
       - reasoning (required)
       - description, githubUrl, stars, category (optional)

    2. category: Main category of this repository (required)

    3. summary: Comprehensive description of what this project does (required)

    4. strengths: Array of key advantages and features (required - provide at least 3)

    5. considerations: Array of limitations or things to consider (required - provide at least 2)

    6. useCase: Primary use cases description (required)

    7. targetAudience: Who this tool is for (required)

    Focus on providing accurate, helpful information. If uncertain about details, make reasonable estimates based on the repository information provided.
    `;
  }
  private createFallbackAnalysis(repoData: GitHubRepo, error: any): AIAnalysisResult { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.warn('Creating fallback analysis due to repeated failures:', error);
    
    return {
      alternatives: [
        {
          name: "Similar Project Search Needed",
          url: `https://github.com/search?q=${encodeURIComponent(repoData.name)}`,
          reasoning: "Manual search required due to analysis failure"
        }
      ],
      category: repoData.language || "Unknown",
      summary: `${repoData.name} - ${repoData.description || 'A GitHub repository that requires manual analysis.'}`,
      strengths: [
        `Has ${repoData.stargazers_count} stars on GitHub`,
        `Written in ${repoData.language || 'multiple languages'}`,
        "Part of the open source community"
      ],
      considerations: [
        "Analysis failed - manual review recommended",
        "May require deeper investigation",
        "Check repository directly for latest information"
      ],
      useCase: repoData.description || `Development tool or library related to ${repoData.language || 'software development'}`,
      targetAudience: `Developers working with ${repoData.language || 'various technologies'} and open source contributors`
    };
  }

  async enhanceWithWebSearch(repoData: GitHubRepo, initialAnalysis: AIAnalysisResult): Promise<AIAnalysisResult> {
    // This method could be extended to use web search APIs to find more accurate alternative data
    // For now, it returns the initial analysis
    return initialAnalysis;
  }
}
