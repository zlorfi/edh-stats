<script>
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import NavBar from "$components/NavBar.svelte";
  import ProtectedRoute from "$components/ProtectedRoute.svelte";
  import Footer from "$components/Footer.svelte";

  let counterActive = false;
  let currentRound = 1;
  let startTime = null;
  let elapsedTime = "00:00:00";
  let avgTimePerRound = "00:00";
  let timerInterval = null;
  let hasPausedGame = false;
  let pausedElapsedTime = 0;

  onMount(() => {
    loadCounter();
    if (counterActive) {
      startTimer();
    }
  });

  onDestroy(() => {
    clearTimer();
  });

  function startCounter() {
    counterActive = true;
    hasPausedGame = false;

    if (!startTime) {
      startTime = new Date();
    } else {
      // Resuming: adjust start time for paused duration
      startTime = new Date(Date.now() - pausedElapsedTime * 1000);
    }

    saveCounter();
    startTimer();
  }

  function stopCounter() {
    counterActive = false;
    hasPausedGame = true;

    if (startTime) {
      pausedElapsedTime = Math.floor((Date.now() - new Date(startTime)) / 1000);
    }

    clearTimer();
    saveCounter();
  }

  function nextRound() {
    currentRound++;
    saveCounter();
  }

  function resetCounter() {
    counterActive = false;
    hasPausedGame = false;
    currentRound = 1;
    startTime = null;
    elapsedTime = "00:00:00";
    avgTimePerRound = "00:00";
    pausedElapsedTime = 0;
    clearTimer();
    saveCounter();
  }

  function startTimer() {
    clearTimer();
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
  }

  function clearTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimer() {
    if (!startTime) return;

    const now = Date.now();
    const elapsed = Math.floor((now - new Date(startTime)) / 1000);

    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    elapsedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    // Calculate average time per round
    if (currentRound > 0) {
      const avgSeconds = Math.floor(elapsed / currentRound);
      const avgMins = Math.floor(avgSeconds / 60);
      const avgSecs = avgSeconds % 60;
      avgTimePerRound = `${String(avgMins).padStart(2, "0")}:${String(avgSecs).padStart(2, "0")}`;
    }
  }

  function saveCounter() {
    if (!browser) return;

    localStorage.setItem(
      "edh-round-counter-state",
      JSON.stringify({
        counterActive,
        currentRound,
        startTime,
        elapsedTime,
        avgTimePerRound,
        hasPausedGame,
        pausedElapsedTime,
      }),
    );
  }

  function loadCounter() {
    if (!browser) return;

    const saved = localStorage.getItem("edh-round-counter-state");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        counterActive = data.counterActive || false;
        currentRound = data.currentRound || 1;
        startTime = data.startTime ? new Date(data.startTime) : null;
        elapsedTime = data.elapsedTime || "00:00:00";
        avgTimePerRound = data.avgTimePerRound || "00:00";
        hasPausedGame = data.hasPausedGame || false;
        pausedElapsedTime = data.pausedElapsedTime || 0;
      } catch (error) {
        console.error("Error loading counter:", error);
        resetCounter();
      }
    }
  }

  function saveAndGoToGameLog() {
    if (!browser) return;

    const now = new Date();
    localStorage.setItem(
      "edh-prefill-game",
      JSON.stringify({
        date: now.toISOString().split("T")[0],
        rounds: currentRound,
        duration: elapsedTime,
        startTime: startTime ? new Date(startTime).toISOString() : null,
        endTime: now.toISOString(),
        avgTimePerRound,
      }),
    );

    goto("/games");
  }
</script>

<svelte:head>
  <title>Round Counter - EDH Stats Tracker</title>
  <meta name="description" content="Track your game rounds and duration" />
</svelte:head>

<ProtectedRoute>
  <div class="min-h-screen bg-gray-50">
    <NavBar />

    <main class="container mx-auto px-4 py-8">
      <div class="max-w-2xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-8 text-center">
          Round Counter
        </h1>

        <div class="card">
          <!-- Round Display -->
          <div class="text-center mb-8">
            <p class="text-2xl text-gray-600 mb-2">Current Round</p>
            <p class="text-8xl font-bold text-indigo-600 mb-6">
              {currentRound}
            </p>
            <button
              on:click={nextRound}
              disabled={!counterActive && !hasPausedGame}
              class="btn btn-primary text-lg px-8 py-3 disabled:opacity-50"
            >
              Next Round →
            </button>
          </div>

          <!-- Timer Display -->
          <div class="text-center mb-8 border-t pt-8">
            <p class="text-xl text-gray-600 mb-2">Elapsed Time</p>
            <p class="text-5xl font-bold text-gray-900 font-mono mb-4">
              {elapsedTime}
            </p>
            <p class="text-lg text-gray-600">
              Average per round: <span class="font-semibold"
                >{avgTimePerRound}</span
              >
            </p>
          </div>

          <!-- Controls -->
          <div class="flex gap-4 mb-6">
            {#if !counterActive && !hasPausedGame}
              <button
                on:click={startCounter}
                class="flex-1 btn btn-primary text-lg py-3"
              >
                ▶️ Start Counter
              </button>
            {:else if counterActive}
              <button
                on:click={stopCounter}
                class="flex-1 btn btn-secondary text-lg py-3"
              >
                ⏸️ Pause
              </button>
            {:else if hasPausedGame}
              <button
                on:click={startCounter}
                class="flex-1 btn btn-primary text-lg py-3"
              >
                ▶️ Resume
              </button>
            {/if}

            <button
              on:click={resetCounter}
              class="flex-1 btn btn-secondary text-lg py-3"
              disabled={!counterActive && !hasPausedGame}
              class:opacity-50={!counterActive && !hasPausedGame}
            >
              🔄 Reset
            </button>
          </div>

          <!-- Save Game Button -->
          {#if counterActive || hasPausedGame}
            <div class="text-center border-t pt-6">
              <button
                on:click={saveAndGoToGameLog}
                class="btn btn-primary text-white px-8 py-4 text-lg font-bold w-full"
              >
                End Game & Log Results
              </button>
              <p class="text-sm text-gray-500 mt-2">
                This will take you to the game log with pre-filled data
              </p>
            </div>
          {/if}
        </div>
      </div>
    </main>

    <Footer />
  </div>
</ProtectedRoute>
