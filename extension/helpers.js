export function shouldAddActionNotificationButton(url) {
  // This is black magic. Basically, this regex matches the following kinds of URLs:
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/actions
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/pull/22932/checks
  // - https://github.com/SpookSoftware/github-actions-browser-notifications/actions/workflows/waitAMinute.yml
  const pattern =
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/(actions|actions\/workflows\/[^/]+|pull\/[^/]+\/checks)$/;
  return pattern.test(url);
}
