import React from "react";

interface GitHubTokenFormProps {
  token: string;
  onTokenChange: (token: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  tokenStatus: { message: string; isValid: boolean | null };
  isLoading: boolean;
}

const GitHubTokenForm: React.FC<GitHubTokenFormProps> = ({
  token,
  onTokenChange,
  onSubmit,
  tokenStatus,
  isLoading,
}) => {
  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="githubToken">GitHub Token:</label>
      <input
        type="password"
        id="githubToken"
        value={token}
        onChange={(e) => onTokenChange(e.target.value)}
        required
        placeholder="ghp_..."
      />
      <div className="help-text">
        <a
          href="https://github.com/settings/tokens/new?description=CICD%20Workflow%20Notifications&scopes=repo"
          target="_blank"
          rel="noopener noreferrer"
        >
          Create a new token with repo scope →
        </a>
      </div>
      {tokenStatus.message && (
        <div
          id="token-status"
          className={tokenStatus.isValid ? "token-valid" : "token-invalid"}
        >
          {tokenStatus.message}
        </div>
      )}
      <div className="flex-row">
        <button type="submit" id="saveButton" disabled={isLoading}>
          Save Token
        </button>
        {isLoading && !tokenStatus.isValid && (
          <div className="spinner" style={{ display: "inline-block" }}></div>
        )}
      </div>
    </form>
  );
};

export default GitHubTokenForm;
