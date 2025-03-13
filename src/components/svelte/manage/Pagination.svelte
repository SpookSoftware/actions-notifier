<script lang="ts">
  let currentPage = $state(1);
  let totalItems = $state(0);
  let itemsPerPage = $state(10);

  // Derived values
  const totalPages = $derived(Math.ceil(totalItems / itemsPerPage));
  const hasPrevious = $derived(currentPage > 1);
  const hasNext = $derived(currentPage < totalPages);
  const shouldShow = $derived(totalItems > itemsPerPage);

  // Generate page numbers
  const pageNumbers = $derived.by(() => {
    const numbers = [];

    for (let i = 1; i <= totalPages; i++) {
      // Only show a few page numbers around the current page
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 2 && i <= currentPage + 2)
      ) {
        numbers.push({
          type: "number",
          value: i,
          active: i === currentPage,
        });
      } else if (
        (i === currentPage - 3 && currentPage > 3) ||
        (i === currentPage + 3 && currentPage < totalPages - 2)
      ) {
        // Add ellipsis
        numbers.push({
          type: "ellipsis",
          key: `ellipsis-${i}`,
        });
      }
    }

    return numbers;
  });
</script>

{#if shouldShow}
  <div class="pagination">
    {#if hasPrevious}
      <button class="page-button" onclick={() => currentPage--}>
        ← Previous
      </button>
    {/if}

    {#each pageNumbers as page (page.type === "number" ? page.value : page.key)}
      {#if page.type === "number"}
        <button
          class="page-button {page.active ? 'active' : ''}"
          onclick={() => (currentPage = page.value!)}
        >
          {page.value}
        </button>
      {:else}
        <span style="padding: 6px">...</span>
      {/if}
    {/each}

    {#if hasNext}
      <button class="page-button" onclick={() => currentPage++}>
        Next →
      </button>
    {/if}
  </div>
{/if}
