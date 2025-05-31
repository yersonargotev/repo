import { GitHubService } from '@/lib/github';
import { db } from '@/lib/db';
import { repositories as repositoriesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

const githubService = new GitHubService();

export async function getRepositoryInfo(owner: string, repoName: string) {
  const fullName = `${owner}/${repoName}`;

  try {
    console.log(`Checking database for repository: ${fullName}`);

    // First, check if we already have this repo in the database
    const existingRepo = await db.query.repositories.findFirst({
      where: eq(repositoriesTable.fullName, fullName),
    });

    if (existingRepo) {
      console.log(`Found repository in database: ${fullName}`);
      return {
        repository: existingRepo,
        success: true,
        source: 'database',
      };
    }

    // If not in database, fetch from GitHub API
    console.log(
      `Repository not in database, fetching from GitHub: ${fullName}`,
    );

    const repoData = await githubService.fetchRepository(owner, repoName);

    // Get topics
    const topics = await githubService.getRepositoryTopics(owner, repoName);
    repoData.topics = topics;

    // Transform to our internal format
    const repository = {
      id: repoData.id,
      owner: repoData.owner.login,
      name: repoData.name,
      fullName: repoData.full_name,
      description: repoData.description,
      githubUrl: repoData.html_url,
      avatarUrl: repoData.owner.avatar_url,
      primaryLanguage: repoData.language,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      size: repoData.size,
      topics: repoData.topics,
      license: repoData.license?.name || null,
      isArchived: repoData.archived,
      isDisabled: repoData.disabled,
      defaultBranch: repoData.default_branch,
      githubCreatedAt: new Date(repoData.created_at),
      githubUpdatedAt: new Date(repoData.updated_at),
      githubPushedAt: new Date(repoData.pushed_at),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database for future requests
    try {
      console.log(`Saving repository to database: ${fullName}`);
      await db
        .insert(repositoriesTable)
        .values({
          owner: repository.owner,
          name: repository.name,
          fullName: repository.fullName,
          description: repository.description,
          githubUrl: repository.githubUrl,
          avatarUrl: repository.avatarUrl,
          primaryLanguage: repository.primaryLanguage,
          stars: repository.stars,
          forks: repository.forks,
          openIssues: repository.openIssues,
          size: repository.size,
          topics: repository.topics,
          license: repository.license,
          isArchived: repository.isArchived,
          isDisabled: repository.isDisabled,
          defaultBranch: repository.defaultBranch,
          githubCreatedAt: repository.githubCreatedAt,
          githubUpdatedAt: repository.githubUpdatedAt,
          githubPushedAt: repository.githubPushedAt,
        })
        .onConflictDoUpdate({
          target: repositoriesTable.fullName,
          set: {
            description: repository.description,
            stars: repository.stars,
            forks: repository.forks,
            primaryLanguage: repository.primaryLanguage,
            openIssues: repository.openIssues,
            size: repository.size,
            topics: repository.topics,
            license: repository.license,
            isArchived: repository.isArchived,
            isDisabled: repository.isDisabled,
            defaultBranch: repository.defaultBranch,
            githubCreatedAt: repository.githubCreatedAt,
            githubUpdatedAt: repository.githubUpdatedAt,
            githubPushedAt: repository.githubPushedAt,
            updatedAt: new Date(),
          },
        });
      console.log(`Successfully saved repository to database: ${fullName}`);
    } catch (dbError) {
      console.warn(
        `Failed to save repository to database: ${fullName}`,
        dbError,
      );
      // Continue even if database save fails
    }

    return {
      repository,
      success: true,
      source: 'github',
    };
  } catch (error) {
    console.error(`Error getting repository info for ${fullName}:`, error);
    throw error;
  }
}
