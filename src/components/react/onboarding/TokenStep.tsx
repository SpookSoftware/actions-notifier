import React from "react";
import { CrossIcon, PlusIcon } from "../shared/icons";

interface TokenStepProps {
  showTokenInput: boolean;
  setShowTokenInput: (show: boolean) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  validatingToken: boolean;
  validateToken: () => Promise<void>;
  tokenMessage: { type: "success" | "error"; text: string } | null;
}

const TokenStep: React.FC<TokenStepProps> = ({
  showTokenInput,
  setShowTokenInput,
  githubToken,
  setGithubToken,
  validatingToken,
  validateToken,
  tokenMessage,
}) => {
  return (
    <div className="step">
      <div className="step-number">2</div>
      <div className="step-content">
        <h2>GitHub Token Setup</h2>
        <p>
          The extension needs a GitHub Personal Access Token with
          <strong> repo</strong> scope to monitor your workflow status.
        </p>

        <div className="permission-item">
          <CrossIcon />
          <span>
            This token will <strong>not</strong> be sent to our servers
          </span>
        </div>
        <div className="permission-item">
          <PlusIcon />
          <span>The token is stored only in your browser</span>
        </div>
        <div className="permission-item">
          <PlusIcon />
          <span>Used only to check workflow status via GitHub API</span>
        </div>

        <div className="token-options">
          <a
            href="https://github.com/settings/tokens/new?description=CI/CD%20Workflow%20Notifications&scopes=repo"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Create New Token
          </a>
          <span>or</span>
          <button
            className="btn btn-secondary"
            onClick={() => setShowTokenInput(true)}
          >
            I already have a token
          </button>
        </div>

        {showTokenInput && (
          <div>
            <p>Enter your GitHub token:</p>
            <input
              type="password"
              className="token-input"
              placeholder="ghp_..."
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
            />
            <p className="help-text">
              Token should begin with "ghp_" and have the "repo" scope
              permission.
            </p>

            <button
              className="btn btn-primary"
              onClick={validateToken}
              disabled={validatingToken}
            >
              {validatingToken && <span className="spinner"></span>}
              Validate Token
            </button>

            {tokenMessage && (
              <div
                className={`token-feedback ${
                  tokenMessage.type === "success"
                    ? "success-message"
                    : "error-message"
                }`}
              >
                {tokenMessage.text}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenStep;
