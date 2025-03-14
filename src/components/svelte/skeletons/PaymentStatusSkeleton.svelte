<!-- PaymentStatusSkeleton.svelte: Skeleton for payment/license status -->
<script lang="ts">
  import SkeletonLoader from "./SkeletonLoader.svelte";
</script>

<div class="payment-section-skeleton">
  <div class="payment-header-skeleton">
    <SkeletonLoader width="100px" height="16px" />
    <SkeletonLoader width="80px" height="20px" borderRadius="12px" />
  </div>
  <div class="payment-info-skeleton">
    <SkeletonLoader width="90%" height="16px" />
    <SkeletonLoader width="100%" height="8px" borderRadius="3px" />
    <SkeletonLoader width="100%" height="36px" borderRadius="6px" />
  </div>
</div>

<style>
  .payment-section-skeleton {
    margin-bottom: 16px;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    overflow: hidden;
  }

  .payment-header-skeleton {
    padding: 12px;
    background-color: #f6f8fa;
    border-bottom: 1px solid #e1e4e8;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .payment-info-skeleton {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
