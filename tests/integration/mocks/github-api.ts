import { Page } from "@playwright/test";

type MockResponse<T> = T | (() => T);
type MockConfig = {
  delay?: number;
  error?: string;
  response?: MockResponse<any>;
};

type OrganizationAuthResponses = {
  [orgName: string]: boolean;
};

type GitHubApiMockConfig = {
  fetchUserOrganizations?: MockConfig;
  checkOrganizationAuthorization?: {
    delay?: number;
    error?: string;
    responses?: OrganizationAuthResponses;
  };
  testRepositoryAccess?: {
    delay?: number;
    error?: string;
    responses?: {
      [key: string]: { success: boolean; message: string };
    };
  };
};

/**
 * Mocks GitHub API calls for testing
 * @param page Playwright page object
 * @param config Mock configuration
 */
export async function mockGithubApi(
  page: Page,
  config: GitHubApiMockConfig
): Promise<void> {
  // Set up the mock for fetchUserOrganizations
  if (config.fetchUserOrganizations) {
    const fetchUserOrgs = config.fetchUserOrganizations;
    await page.route("https://api.github.com/user/orgs", async (route) => {
      if (fetchUserOrgs.error) {
        await route.abort("failed");
        return;
      }

      if (fetchUserOrgs.delay) {
        await new Promise((resolve) =>
          setTimeout(resolve, fetchUserOrgs.delay)
        );
      }

      const response =
        typeof fetchUserOrgs.response === "function"
          ? fetchUserOrgs.response()
          : fetchUserOrgs.response || [];

      await route.fulfill({ json: response });
    });
  }

  // Set up the mock for checkOrganizationAuthorization
  if (config.checkOrganizationAuthorization) {
    const checkOrgAuth = config.checkOrganizationAuthorization;
    await page.route(
      /https:\/\/api\.github\.com\/orgs\/.*\/repos\?per_page=1/,
      async (route) => {
        const url = route.request().url();
        const orgName = url.match(/\/orgs\/(.*?)\/repos/)?.[1];

        if (!orgName) {
          await route.abort("failed");
          return;
        }

        if (checkOrgAuth.error) {
          await route.abort("failed");
          return;
        }

        if (checkOrgAuth.delay) {
          await new Promise((resolve) =>
            setTimeout(resolve, checkOrgAuth.delay)
          );
        }

        const isAuthorized = checkOrgAuth.responses?.[orgName] ?? false;

        if (isAuthorized) {
          await route.fulfill({ status: 200, json: [] });
        } else {
          await route.fulfill({ status: 404, json: { message: "Not Found" } });
        }
      }
    );
  }

  // Set up the mock for testRepositoryAccess
  if (config.testRepositoryAccess) {
    const testRepoAccess = config.testRepositoryAccess;
    await page.route(
      /https:\/\/api\.github\.com\/repos\/.*\/.*/,
      async (route) => {
        const url = route.request().url();
        const match = url.match(/\/repos\/(.*?)\/(.*?)(\?|$)/);
        const orgName = match?.[1];
        const repoName = match?.[2];

        if (!orgName || !repoName) {
          await route.abort("failed");
          return;
        }

        const key = `${orgName}/${repoName}`;

        if (testRepoAccess.error) {
          await route.abort("failed");
          return;
        }

        if (testRepoAccess.delay) {
          await new Promise((resolve) =>
            setTimeout(resolve, testRepoAccess.delay)
          );
        }

        const response = testRepoAccess.responses?.[key] ?? {
          success: false,
          message: "Repository not found or access denied",
        };

        if (response.success) {
          await route.fulfill({ status: 200, json: {} });
        } else {
          await route.fulfill({ status: 404, json: { message: "Not Found" } });
        }
      }
    );
  }
}
