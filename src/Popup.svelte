<!-- App.svelte -->
<script lang="ts">
  const name: string = "Bun";
  let count = $state(0);
</script>

<main class="app">
  <h1>Cookin up apps with {name}</h1>
  <button
    onclick={() => {
      count++;
    }}>Click me</button
  >

  <p>Oh, and count is {count}</p>
  <input type="text" bind:value={count} placeholder="Enter your name" />
</main>

<style>
  h1 {
    color: #ff3e00;
    text-align: center;
    font-size: 2em;
  }
</style>
