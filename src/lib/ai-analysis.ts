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
  private webSearchModel = openai.responses('gpt-4o-mini');
  
  /**
   * Analyzes a repository with enhanced web search for better alternatives
   * @param repoData The GitHub repository data
   * @param options Configuration options
   */
  async analyzeRepository(
    repoData: GitHubRepo, 
    options: { useWebSearch?: boolean } = { useWebSearch: true }
  ): Promise<AIAnalysisResult> {
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

      // Enhance with web search for better alternatives if enabled
      if (options.useWebSearch) {
        const enhancedResult = await this.enhanceWithWebSearch(repoData, result.object);
        return enhancedResult;
      }
      
      return result.object;
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Log detailed error information for debugging
      console.error('Primary analysis failed:', {
        errorName: error.name,
        errorMessage: error.message,
        repository: `${repoData.owner.login}/${repoData.name}`,
        cause: error.cause?.message || 'No cause available',
        text: error.text ? `${error.text.substring(0, 500)}...` : 'No text available'
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
          });          // Transform to match expected type, filling in defaults where needed
          const analysisResult: AIAnalysisResult = {
            ...result.object,
            strengths: result.object.strengths || [`Has ${repoData.stargazers_count} stars on GitHub`],
            considerations: result.object.considerations || ["Manual review recommended for detailed analysis"],
            useCase: result.object.useCase || `Development tool in ${repoData.language || 'software development'}`,
            targetAudience: result.object.targetAudience || `Developers and ${repoData.language || 'software'} enthusiasts`
          };
          
          console.info('Recovery successful with fallback schema');
          
          // Try to enhance with web search even in fallback case
          try {
            const enhancedResult = await this.enhanceWithWebSearch(repoData, analysisResult);
            return enhancedResult;
          } catch (enhanceError) {
            console.warn('Web search enhancement failed in fallback:', enhanceError);
            return analysisResult;
          }} catch (secondError: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
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

  /**
   * Analyzes a repository without web search (faster but potentially less comprehensive)
   */
  async analyzeRepositoryBasic(repoData: GitHubRepo): Promise<AIAnalysisResult> {
    return this.analyzeRepository(repoData, { useWebSearch: false });
  }

  async searchAlternatives(repoData: GitHubRepo): Promise<string[]> {
    try {
      // Use web search to generate more relevant search queries
      const searchResult = await generateText({
        model: this.webSearchModel,
        prompt: `
          Given this GitHub repository, research and generate 5-8 specific search queries 
          that would help find alternative tools, libraries, or projects that serve similar purposes.
          
          Repository Information:
          - Name: ${repoData.name}
          - Description: ${repoData.description || 'No description'}
          - Language: ${repoData.language || 'Unknown'}
          - Topics: ${repoData.topics?.join(', ') || 'None'}
          - Stars: ${repoData.stargazers_count}
          
          Research the current landscape and ecosystem to suggest the most relevant search terms.
          Focus on finding actively maintained alternatives and competing solutions.
          
          Return only the search queries, one per line.
        `,
        tools: {
          web_search_preview: openai.tools.webSearchPreview({
            searchContextSize: 'medium'
          })
        },
        temperature: 0.5
      });

      const queries = searchResult.text.split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('-') && !q.startsWith('•'))
        .slice(0, 8);

      return queries.length > 0 ? queries : this.generateFallbackQueries(repoData);
    } catch (error) {
      console.warn('Web search for alternatives failed, using fallback:', error);
      return this.generateFallbackQueries(repoData);
    }
  }

  private generateFallbackQueries(repoData: GitHubRepo): string[] {
    const baseQueries = [
      `${repoData.name} alternatives`,
      `best ${repoData.language || 'open source'} ${repoData.name} alternatives`,
      `${repoData.name} vs competitors`,
      `similar tools to ${repoData.name}`
    ];

    if (repoData.topics && repoData.topics.length > 0) {
      baseQueries.push(`${repoData.topics[0]} libraries alternatives`);
      baseQueries.push(`${repoData.topics.slice(0, 2).join(' ')} tools`);
    }

    if (repoData.description) {
      const keywords = repoData.description.split(' ').slice(0, 3).join(' ');
      baseQueries.push(`${keywords} alternatives`);
    }

    baseQueries.push(`github ${repoData.language || ''} ${repoData.name} similar projects`.trim());

    return baseQueries.slice(0, 8);
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
    try {
      // Use web search to find more accurate and up-to-date alternatives
      const enhancedAlternatives = await this.findAlternativesWithWebSearch(repoData);
      
      // Merge and deduplicate alternatives
      const allAlternatives = [...initialAnalysis.alternatives, ...enhancedAlternatives];
      const uniqueAlternatives = this.deduplicateAlternatives(allAlternatives);
      
      return {
        ...initialAnalysis,
        alternatives: uniqueAlternatives.slice(0, 8) // Limit to top 8 alternatives
      };
    } catch (error) {
      console.warn('Web search enhancement failed, using initial analysis:', error);
      return initialAnalysis;
    }
  }

  private async findAlternativesWithWebSearch(repoData: GitHubRepo): Promise<AIAnalysisResult['alternatives']> {
    const searchQuery = this.buildSearchQuery(repoData);
    
    const searchResult = await generateText({
      model: this.webSearchModel,
      prompt: `
        Search for alternatives to the GitHub repository "${repoData.owner.login}/${repoData.name}".
        
        Repository details:
        - Name: ${repoData.name}
        - Description: ${repoData.description || 'No description'}
        - Language: ${repoData.language || 'Unknown'}
        - Topics: ${repoData.topics?.join(', ') || 'None'}
        
        Find 5-6 similar tools, libraries, or projects that serve the same or similar purpose.
        Focus on actively maintained, popular alternatives.
        
        For each alternative found, I need:
        1. The exact name of the project
        2. The GitHub URL or main website URL
        3. A brief description of what it does
        4. Why it's a good alternative to ${repoData.name}
        
        Search query: ${searchQuery}
      `,
      tools: {
        web_search_preview: openai.tools.webSearchPreview({
          searchContextSize: 'high'
        })
      },
      temperature: 0.3
    });

    // Parse the search results and structure them
    return this.parseSearchResultsToAlternatives(searchResult.text, repoData);
  }

  private buildSearchQuery(repoData: GitHubRepo): string {
    const terms = [
      `${repoData.name} alternatives`,
      repoData.language ? `${repoData.language} ${repoData.name} alternatives` : '',
      repoData.description ? `"${repoData.description}" alternatives` : '',
      `similar to ${repoData.name}`,
      ...repoData.topics?.map(topic => `${topic} alternatives`) || []
    ].filter(Boolean);

    return terms.slice(0, 3).join(' OR ');
  }

  private async parseSearchResultsToAlternatives(searchText: string, repoData: GitHubRepo): Promise<AIAnalysisResult['alternatives']> {
    try {
      const parseResult = await generateObject({
        model: this.model,
        schema: z.object({
          alternatives: z.array(z.object({
            name: z.string().min(1),
            url: z.string().url(),
            description: z.string().optional(),
            githubUrl: z.string().url().optional(),
            reasoning: z.string().min(1)
          })).min(1).max(6)
        }),
        prompt: `
          Based on the following web search results about alternatives to ${repoData.name}, 
          extract and structure information about alternative tools/libraries:

          Search Results:
          ${searchText}

          Extract up to 6 alternatives with:
          - name: exact project name
          - url: GitHub URL or main website URL (must be valid URL)
          - description: brief description (optional)
          - githubUrl: GitHub URL if different from main URL (optional)
          - reasoning: why it's a good alternative

          Focus on actively maintained projects with good community support.
          Exclude the original repository (${repoData.owner.login}/${repoData.name}).
        `,
        temperature: 0.1
      });

      return parseResult.object.alternatives;
    } catch (error) {
      console.warn('Failed to parse search results:', error);
      return [];
    }
  }

  private deduplicateAlternatives(alternatives: AIAnalysisResult['alternatives']): AIAnalysisResult['alternatives'] {
    const seen = new Set<string>();
    return alternatives.filter(alt => {
      const key = alt.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
