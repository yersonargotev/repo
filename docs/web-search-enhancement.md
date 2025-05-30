# Enhanced AI Analysis with Web Search

This document explains the enhanced AI analysis features that leverage OpenAI's web search capabilities to find better and more accurate alternatives to GitHub repositories.

## New Features

### 1. Web Search Enhancement
The `AIAnalysisService` now uses OpenAI's `webSearchPreview` tool to find more accurate and up-to-date alternatives by searching the web in real-time.

### 2. Improved Alternative Discovery
- Searches for current alternatives and competitors
- Finds actively maintained projects
- Provides more relevant suggestions based on real-time data

## Usage Examples

### Basic Usage (with Web Search)
```typescript
import { AIAnalysisService } from './lib/ai-analysis';

const analysisService = new AIAnalysisService();

const repoData = {
  name: "nextjs",
  owner: { login: "vercel" },
  description: "The React Framework",
  language: "TypeScript",
  stargazers_count: 120000,
  forks_count: 26000,
  topics: ["react", "framework", "ssr"],
  html_url: "https://github.com/vercel/next.js"
};

// Analyze with web search (default)
const analysis = await analysisService.analyzeRepository(repoData);
console.log(analysis.alternatives); // Enhanced with web search results
```

### Basic Analysis (without Web Search)
```typescript
// Faster analysis without web search
const basicAnalysis = await analysisService.analyzeRepositoryBasic(repoData);

// Or explicitly disable web search
const analysis = await analysisService.analyzeRepository(repoData, { useWebSearch: false });
```

### Enhanced Search Queries
```typescript
// Get improved search queries using web search
const searchQueries = await analysisService.searchAlternatives(repoData);
console.log(searchQueries);
// Output: More relevant, researched search terms
```

## How Web Search Works

1. **Initial Analysis**: The service performs a standard AI analysis
2. **Web Search Enhancement**: Uses OpenAI's web search to find current alternatives
3. **Result Parsing**: Structures the search results into the expected format
4. **Deduplication**: Removes duplicate alternatives and merges results
5. **Final Output**: Returns enhanced analysis with better alternatives

## Configuration Options

### Web Search Model Configuration
```typescript
const service = new AIAnalysisService();
// Uses openai.responses('gpt-4o-mini') with webSearchPreview tool
```

### Search Context Size
The service uses different context sizes for different operations:
- `high`: For finding alternatives (more comprehensive)
- `medium`: For generating search queries (balanced)

## Benefits

1. **More Accurate Alternatives**: Finds current, actively maintained projects
2. **Real-time Data**: Uses current web information instead of training data cutoff
3. **Better Relevance**: Searches consider current ecosystem and trends
4. **Comprehensive Coverage**: Combines AI knowledge with web search results

## Error Handling

The service includes robust error handling:
- Falls back to basic analysis if web search fails
- Provides meaningful error messages
- Graceful degradation ensures service availability

## Performance Considerations

- Web search adds latency (typically 2-5 seconds)
- Use `useWebSearch: false` for faster responses when needed
- Results are cached within the analysis process
- Deduplication prevents redundant results

## Example Output

The enhanced analysis provides better alternatives:

```typescript
{
  alternatives: [
    {
      name: "Nuxt.js",
      url: "https://nuxt.com",
      githubUrl: "https://github.com/nuxt/nuxt",
      description: "The Intuitive Vue Framework",
      reasoning: "Vue.js equivalent to Next.js with similar SSR capabilities"
    },
    {
      name: "SvelteKit",
      url: "https://kit.svelte.dev",
      githubUrl: "https://github.com/sveltejs/kit",
      description: "The fastest way to build svelte apps",
      reasoning: "Modern alternative with excellent performance and developer experience"
    }
    // ... more alternatives found via web search
  ],
  // ... rest of analysis
}
```

## Integration

The enhanced features are backward compatible. Existing code will automatically benefit from web search enhancement unless explicitly disabled.
