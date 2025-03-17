<script lang="ts">
  import LoadingSpinner from "@/components/svelte/shared/LoadingSpinner.svelte";
  let isLoading = $state(false);
  let shouldShowAreYouSure = $state(false);
  let done = $state(false);
</script>

<div>
  {#if isLoading}
    <LoadingSpinner />
  {:else if shouldShowAreYouSure}
    <button
      onclick={() => {
        isLoading = true;
        setTimeout(() => {
          shouldShowAreYouSure = false;
          isLoading = false;
          done = true;
        }, 3000);
      }}
      >Are you sure? This cannot be undone. Click one more time to complete</button
    >
  {:else if done}
    <p>You cleared them all! (not really though lol)</p>
  {:else}
    <button onclick={() => (shouldShowAreYouSure = true)}
      >Clear all alarms</button
    >
  {/if}
</div>
