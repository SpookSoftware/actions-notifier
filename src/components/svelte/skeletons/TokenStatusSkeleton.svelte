<!-- TokenStatusSkeleton.svelte: Skeleton for token status section -->
<script lang="ts">
  import SkeletonLoader from "./SkeletonLoader.svelte";
</script>

<div class="token-status-skeleton">
  <SkeletonLoader width="180px" height="20px" />
  <div class="form-skeleton">
    <SkeletonLoader width="100%" height="16px" />
    <SkeletonLoader width="100%" height="36px" borderRadius="6px" />
    <SkeletonLoader width="80%" height="12px" />
    <div style="display: flex; margin-top: 8px;">
      <SkeletonLoader width="90px" height="32px" borderRadius="6px" />
    </div>
  </div>
</div>

<style>
  .token-status-skeleton {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .form-skeleton {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
</style>
