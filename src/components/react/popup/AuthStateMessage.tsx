import React from 'react';

type AuthState = 'success' | 'warning' | 'error' | null;

interface AuthStateMessageProps {
  authState: AuthState;
  showWelcomeMessage: boolean;
}

const AuthStateMessage: React.FC<AuthStateMessageProps> = ({ 
  authState, 
  showWelcomeMessage 
}) => {
  if (showWelcomeMessage) {
    return (
      <div className="auth-state auth-state-warning" id="welcome-message">
        <strong>Welcome to CI/CD Workflow Notifications!</strong>
        <p>
          This extension needs a GitHub token to monitor your workflows and
          notify you when they complete.
        </p>
      </div>
    );
  }

  if (authState === 'success') {
    return (
      <div className="auth-state auth-state-success">
        <strong>✓ GitHub token configured</strong>
        <p>
          Your extension is ready to monitor GitHub workflows. Click the bell
          icon on any running workflow to receive a notification when it
          completes.
        </p>
      </div>
    );
  }

  if (authState === 'warning') {
    return (
      <div className="auth-state auth-state-warning">
        <strong>⚠️ GitHub token required</strong>
        <p>
          Please add a GitHub token with 'repo' scope to enable workflow
          monitoring.
        </p>
      </div>
    );
  }

  if (authState === 'error') {
    return (
      <div className="auth-state auth-state-error">
        <strong>✖ GitHub token invalid</strong>
        <p>
          The provided token could not be verified. Please make sure it has the
          correct 'repo' scope permissions.
        </p>
      </div>
    );
  }

  return null;
};

export default AuthStateMessage;