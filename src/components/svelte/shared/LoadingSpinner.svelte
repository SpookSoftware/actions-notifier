<script lang="ts">
  // Props using Runes
  const size = $props<"small" | "medium" | "large">("medium");
  const className = $props<string>("");
</script>

<div class="loading-spinner size-{size} {className}"></div>

<style>
  .loading-spinner {
    display: inline-block;
    border-radius: 50%;
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-left-color: #0366d6;
    animation: spin 1s linear infinite;
  }

  .size-small {
    width: 14px;
    height: 14px;
  }

  .size-medium {
    width: 24px;
    height: 24px;
  }

  .size-large {
    width: 32px;
    height: 32px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>