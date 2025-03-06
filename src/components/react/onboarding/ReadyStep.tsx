import React from "react";

interface ReadyStepProps {
  trialButtonText: string;
  trialButtonDisabled: boolean;
  startingTrial: boolean;
  startFreeTrial: () => Promise<void>;
}

const ReadyStep: React.FC<ReadyStepProps> = ({
  trialButtonText,
  trialButtonDisabled,
  startingTrial,
  startFreeTrial,
}) => {
  return (
    <div className="step">
      <div className="step-number">3</div>
      <div className="step-content">
        <h2>You're all set!</h2>
        <p>
          Your GitHub token has been configured successfully. You can now use
          the extension to monitor your workflows.
        </p>

        <h3>How to use:</h3>
        <ol>
          <li>Navigate to GitHub Actions or a pull request with checks</li>
          <li>Find a running or queued workflow</li>
          <li>Click the bell icon 🔔 to monitor that workflow</li>
          <li>The extension will notify you when the workflow completes</li>
        </ol>

        <div
          style={{
            margin: "20px 0",
            padding: "15px",
            backgroundColor: "#f8f4ff",
            border: "1px solid #ddd2f7",
            borderRadius: "6px",
            borderLeft: "4px solid #6f42c1",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#6f42c1" }}>
            💜 Free Trial Period
          </h3>
          <p>
            To use the extension, you need to sign up for a
            <b> 7-day free trial</b>. After the trial period, a one-time
            purchase is required to continue using the extension.
          </p>
          <p style={{ marginBottom: "10px" }}>
            <b>Price:</b> $2.95 (one-time payment, lifetime license)
          </p>
          <button
            className="btn btn-primary"
            onClick={startFreeTrial}
            disabled={trialButtonDisabled}
          >
            {startingTrial && <span className="spinner"></span>}
            {trialButtonText}
          </button>
        </div>

        <div className="help-text">
          <p>
            You can always update your token or manage active monitors from the
            extension popup.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReadyStep;
