<script lang="ts">
  // Converted from React ProgressBar to Svelte with runes
  export let steps: string[] = [];
  export let currentStep: number;
</script>

<div class="progress-bar">
  {#each steps as label, index}
    <div class="progress-step">
      <div class="step-marker {index + 1 === currentStep ? 'active' : index + 1 < currentStep ? 'completed' : ''}">
        {#if index + 1 < currentStep}
          ✓
        {:else}
          {index + 1}
        {/if}
      </div>
      <div class="step-label">{label}</div>
    </div>
  {/each}
</div>