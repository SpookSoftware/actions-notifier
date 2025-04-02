/**
 * Service for handling GitHub organization-related operations
 */

/**
 * GitHub organization type definition
 */
export type GitHubOrganization = {
  login: string;
  id: number;
  url: string;
  repos_url: string;
  avatar_url: string;
  description: string;
};

/**
 * GitHub repository type definition
 */
export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string;
  fork: boolean;
  url: string;
};

/**
 * Fetches the organizations that the authenticated user belongs to
 * @param token GitHub token to use for authentication
 * @returns Promise resolving to an array of GitHub organizations
 */
export async function fetchUserOrganizations(
  token: string
): Promise<GitHubOrganization[]> {
  try {
    const response = await fetch("https://api.github.com/user/orgs", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch organizations: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching user organizations:", error);
    throw error;
  }
}

/**
 * Checks if the token is authorized for the specified organization
 * @param token GitHub token to check
 * @param orgName Organization name to check authorization for
 * @returns Promise resolving to a boolean indicating if the token is authorized
 */
export async function checkOrganizationAuthorization(
  token: string,
  orgName: string
): Promise<boolean> {
  try {
    // Try to access an organization's repos to test authorization
    const response = await fetch(
      `https://api.github.com/orgs/${orgName}/repos?per_page=1`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    return response.status === 200;
  } catch (error) {
    console.error(
      `Error checking organization authorization for ${orgName}:`,
      error
    );
    return false;
  }
}

/**
 * Tests if the token can access a specific repository within an organization
 * @param token GitHub token to test
 * @param orgName Organization name
 * @param repoName Repository name
 * @returns Promise resolving to an object with success status and message
 */
export async function testRepositoryAccess(
  token: string,
  orgName: string,
  repoName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${orgName}/${repoName}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (response.ok) {
      return {
        success: true,
        message: "✓ Access verified! Your token can access this repository.",
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: `✖ Access failed: ${
          errorData.message || "Repository not found or not authorized"
        }`,
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `Error testing repository access for ${orgName}/${repoName}:`,
      error
    );
    return {
      success: false,
      message: `✖ Error testing access: ${errorMessage}`,
    };
  }
}

/**
 * Gets organization authorization URL
 * @param orgName Organization name
 * @returns URL for authorizing tokens for the organization
 */
export function getOrganizationAuthorizationUrl(orgName: string): string {
  return `https://github.com/organizations/${orgName}/settings/applications`;
}
