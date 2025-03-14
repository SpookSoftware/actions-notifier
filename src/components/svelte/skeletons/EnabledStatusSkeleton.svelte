<!-- EnabledStatusSkeleton.svelte: Skeleton for extension enabled status -->
<script lang="ts">
  import SkeletonLoader from "./SkeletonLoader.svelte";
</script>

<div class="enabled-status-skeleton">
  <div class="row">
    <SkeletonLoader width="120px" height="16px" />
    <SkeletonLoader width="70px" height="16px" />
  </div>
  <SkeletonLoader width="90%" height="14px" />
</div>

<style>
  .enabled-status-skeleton {
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 6px;
    background-color: #f6f8fa;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
</style>
