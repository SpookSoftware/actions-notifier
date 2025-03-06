import React from "react";

const WelcomeStep: React.FC = () => {
  return (
    <div className="step">
      <div className="step-number">1</div>
      <div className="step-content">
        <h2>Welcome to CI/CD Workflow Notifications</h2>
        <p>
          This extension enhances GitHub's Actions interface by adding
          notification support for your CI/CD workflows.
        </p>
        <p>
          <strong>Key Features:</strong>
        </p>
        <ul>
          <li>Get notified when workflows complete (success or failure)</li>
          <li>Easily monitor specific jobs within a workflow</li>
          <li>Track pull request checks directly from the PR page</li>
          <li>Manage all your active workflow monitors in one place</li>
        </ul>
        <p>
          <strong>Important:</strong> To access GitHub's API and monitor your
          workflows, you'll need to provide a GitHub token with appropriate
          permissions.
        </p>
      </div>
    </div>
  );
};

export default WelcomeStep;
