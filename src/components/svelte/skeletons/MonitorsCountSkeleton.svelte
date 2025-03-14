<!-- MonitorsCountSkeleton.svelte: Skeleton for monitors count section -->
<script lang="ts">
  import SkeletonLoader from "./SkeletonLoader.svelte";
</script>

<div class="monitors-count-skeleton">
  <SkeletonLoader width="150px" height="16px" />
</div>

<style>
  .monitors-count-skeleton {
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 6px;
    background-color: #f6f8fa;
    height: 40px;
    display: flex;
    align-items: center;
  }
</style>
