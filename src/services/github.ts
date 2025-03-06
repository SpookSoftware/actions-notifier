/**
 * Service for handling GitHub-related operations
 */

/**
 * Validates a GitHub token by making test API calls
 * @param token GitHub token to validate
 * @returns Promise resolving to a boolean indicating if the token is valid
 */
export async function validateGitHubToken(token: string): Promise<boolean> {
  try {
    // Test API call to verify token (user endpoint requires minimal permissions)
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    // Check if unauthorized or rate limited
    if (response.status === 401 || response.status === 403) {
      return false;
    }

    // For valid token, test if it has repo scope with a sample repo request
    const repoResponse = await fetch(
      "https://api.github.com/repos/octocat/hello-world",
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    // Return true if we can access repo API
    return repoResponse.status !== 403; // 403 would mean insufficient permissions
  } catch (error) {
    console.error("Error validating token:", error);
    return false;
  }
}