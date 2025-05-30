interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  default_branch: string;
  open_issues_count: number;
  license: {
    key: string;
    name: string;
  } | null;
  archived: boolean;  disabled: boolean;
  visibility: string;
}

export class GitHubService {
  private apiKey?: string;
  private baseUrl = 'https://api.github.com';

  constructor() {
    this.apiKey = process.env.GITHUB_TOKEN;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitHub-Repo-Analyzer/1.0',
    };

    if (this.apiKey) {
      headers.Authorization = `token ${this.apiKey}`;
    }

    return headers;
  }

  async fetchRepository(owner: string, repo: string): Promise<GitHubRepo> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}`;
    
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        next: { revalidate: 3600 } // Cache for 1 hour
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Repository ${owner}/${repo} not found`);
        }
        if (response.status === 403) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch repository data from GitHub');
    }
  }

  async searchRepositories(query: string, limit = 5): Promise<GitHubRepo[]> {
    const url = `${this.baseUrl}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`;
    
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        next: { revalidate: 3600 }
      });

      if (!response.ok) {
        throw new Error(`GitHub search API error: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('GitHub search error:', error);
      return [];
    }
  }

  async fetchRepositoryReadme(owner: string, repo: string): Promise<string | null> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/readme`;
    
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        next: { revalidate: 3600 }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      // Decode base64 content
      return Buffer.from(data.content, 'base64').toString('utf-8');
    } catch (error) {
      console.error('Error fetching README:', error);
      return null;
    }
  }

  async getRepositoryTopics(owner: string, repo: string): Promise<string[]> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/topics`;
    
    try {
      const response = await fetch(url, {
        headers: {
          ...this.getHeaders(),
          'Accept': 'application/vnd.github.mercy-preview+json', // Required for topics API
        },
        next: { revalidate: 3600 }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.names || [];
    } catch (error) {
      console.error('Error fetching topics:', error);
      return [];
    }
  }

  async getRateLimitStatus(): Promise<{
    limit: number;
    remaining: number;
    reset: Date;
  }> {
    const url = `${this.baseUrl}/rate_limit`;
    
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rate limit status');
      }

      const data = await response.json();
      return {
        limit: data.rate.limit,
        remaining: data.rate.remaining,
        reset: new Date(data.rate.reset * 1000),
      };
    } catch (error) {
      console.error('Error fetching rate limit:', error);
      throw error;
    }
  }
}

export type { GitHubRepo };
