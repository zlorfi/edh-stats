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
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <NavBar />

    <main class="container mx-auto px-4 py-8 flex-1">
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
                class="flex-1 btn btn-primary text-lg py-3 icon-button"
              >
                <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7-11-7z" fill="currentColor" />
                </svg>
                <span>Start</span>
              </button>
            {:else if counterActive}
              <button
                on:click={stopCounter}
                class="flex-1 btn btn-secondary text-lg py-3 icon-button"
              >
                <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" fill="currentColor" />
                </svg>
                <span>Pause</span>
              </button>
            {:else if hasPausedGame}
              <button
                on:click={startCounter}
                class="flex-1 btn btn-primary text-lg py-3 icon-button"
              >
                <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7-11-7z" fill="currentColor" />
                </svg>
                <span>Resume</span>
              </button>
            {/if}

            <button
              on:click={resetCounter}
              class="flex-1 btn btn-secondary text-lg py-3 icon-button"
              disabled={!counterActive && !hasPausedGame}
              class:opacity-50={!counterActive && !hasPausedGame}
            >
              <svg
                class="btn-icon btn-icon-reset"
                viewBox="0 0 512 512"
                aria-hidden="true"
              >
                <path
                  d="M480.1 192l7.9 0c13.3 0 24-10.7 24-24l0-144c0-9.7-5.8-18.5-14.8-22.2S477.9 .2 471 7L419.3 58.8C375 22.1 318 0 256 0 127 0 20.3 95.4 2.6 219.5 .1 237 12.2 253.2 29.7 255.7s33.7-9.7 36.2-27.1C79.2 135.5 159.3 64 256 64 300.4 64 341.2 79 373.7 104.3L327 151c-6.9 6.9-8.9 17.2-5.2 26.2S334.3 192 344 192l136.1 0zm29.4 100.5c2.5-17.5-9.7-33.7-27.1-36.2s-33.7 9.7-36.2 27.1c-13.3 93-93.4 164.5-190.1 164.5-44.4 0-85.2-15-117.7-40.3L185 361c6.9-6.9 8.9-17.2 5.2-26.2S177.7 320 168 320L24 320c-13.3 0-24 10.7-24 24L0 488c0 9.7 5.8 18.5 14.8 22.2S34.1 511.8 41 505l51.8-51.8C137 489.9 194 512 256 512 385 512 491.7 416.6 509.4 292.5z"
                  fill="currentColor"
                />
              </svg>
              <span>Reset</span>
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

<style>
  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn-icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  .btn-icon-reset {
    width: 1.15rem;
    height: 1.15rem;
  }
</style>
