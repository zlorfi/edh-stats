<script>
  import { onMount } from "svelte";

  let version = "";

  onMount(async () => {
    try {
      const response = await fetch("/version.txt");
      if (response.ok) {
        version = (await response.text()).trim();
      }
    } catch (error) {
      console.error("Failed to load version:", error);
      version = "unknown";
    }
  });
</script>

<footer class="bg-white border-t border-gray-200 mt-12 w-full">
  <div class="container mx-auto px-4 py-4 text-center text-sm text-gray-600">
    <p>EDH Stats • Track your Commander games</p>
    {#if version}
      <p class="text-xs text-gray-500 mt-1">v{version}</p>
    {/if}
  </div>
</footer>
