<script>
  import { onMount } from "svelte";
  import { auth } from "$stores/auth";

  let allowRegistration = true;

  onMount(() => {
    (async () => {
      await auth.checkRegistrationConfig();
    })();

    const unsubscribe = auth.subscribe(($auth) => {
      allowRegistration = $auth.allowRegistration;
    });

    return () => {
      unsubscribe();
    };
  });
</script>

<svelte:head>
  <title>EDH Stats Tracker</title>
  <meta
    name="description"
    content="Track your Magic: The Gathering EDH/Commander games and statistics"
  />
</svelte:head>

<div class="min-h-full flex flex-col py-12 px-4 sm:px-6 lg:px-8">
  <div class="flex items-center justify-center flex-1">
    <div class="w-full space-y-8 text-center">
      <div class="max-w-md mx-auto">
        <h1 class="text-4xl font-bold font-mtg text-edh-primary mb-4">
          EDH Stats
        </h1>
        <p class="text-xl text-gray-600 mb-8">
          Track your Commander games and statistics
        </p>

        <div class="space-y-4">
          <a href="/login" class="btn btn-primary w-full block"
            >Login to Track Games</a
          >
          {#if allowRegistration}
            <a href="/register" class="btn btn-secondary w-full block"
              >Create New Account</a
            >
          {/if}
        </div>
      </div>

      <!-- Features Section -->
      <div class="mt-12 max-w-4xl mx-auto">
        <div class="grid md:grid-cols-3 gap-6">
          <div class="card text-center">
            <div class="text-4xl mb-3">📊</div>
            <h3 class="font-bold text-lg mb-2">Track Games</h3>
            <p class="text-gray-600">Log your EDH games and commanders</p>
          </div>
          <div class="card text-center">
            <div class="text-4xl mb-3">📈</div>
            <h3 class="font-bold text-lg mb-2">View Stats</h3>
            <p class="text-gray-600">Analyze your win rates and performance</p>
          </div>
          <div class="card text-center">
            <div class="text-4xl mb-3">⏱️</div>
            <h3 class="font-bold text-lg mb-2">Round Counter</h3>
            <p class="text-gray-600">Track game duration and rounds</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
