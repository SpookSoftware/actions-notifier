<script lang="ts">
</script>

<div class="step">
  <div class="step-number">4</div>
  <div class="step-content">
    <h2>You're all set!</h2>
    <p>
      Your GitHub token has been configured successfully. You can now use the
      extension to monitor your workflows.
    </p>

    <h3>How to use:</h3>
    <ol>
      <li>Navigate to GitHub Actions or a pull request with checks</li>
      <li>Find a running or queued workflow</li>
      <li>Click the bell icon 🔔 to monitor that workflow</li>
      <li>The extension will notify you when the workflow completes</li>
    </ol>

    <div class="notification-examples">
      <h3>Here are some places where the bell icons will appear:</h3>
      <div class="image-stack">
        <div class="image-container">
          <img
            src="/images/actions-bells.jpg"
            alt="Notification bell in GitHub Actions"
          />
          <p>On Actions Pages</p>
        </div>
        <div class="image-container">
          <img
            src="/images/jobs-bells.jpg"
            alt="Notification bell in Jobs view"
          />
          <p>On Jobs Pages</p>
        </div>
        <div class="image-container">
          <img
            src="/images/pr-bells.jpg"
            alt="Notification bell in Pull Requests"
          />
          <p>On Pull Request Pages</p>
        </div>
      </div>
    </div>

    <div class="help-text">
      <p>
        You can always update your token or manage active monitors from the
        extension popup.
      </p>
    </div>
  </div>
</div>

<style>
  .notification-examples {
    margin: 24px 0;
    padding: 16px;
    background-color: #f6f8fa;
    border-radius: 6px;
  }

  .image-stack {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-top: 16px;
  }

  .image-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .image-container img {
    width: 100%;
    max-width: 600px;
    border-radius: 6px;
    border: 1px solid #d0d7de;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .image-container p {
    margin-top: 8px;
    font-weight: 500;
    color: #24292f;
  }
</style>
