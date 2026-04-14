<script>
  import { onMount, tick } from "svelte";
  import { browser } from "$app/environment";
  import { authenticatedFetch } from "$stores/auth";
  import NavBar from "$components/NavBar.svelte";
  import ProtectedRoute from "$components/ProtectedRoute.svelte";
  import Footer from "$components/Footer.svelte";

  let showLogForm = false;
  let games = [];
  let commanders = [];
  let allCommanders = [];
  let loading = false;
  let loadingMore = false;
  let limit = 20;
  let offset = 0;
  let hasMore = false;
  let submitting = false;
  let editingGame = null;
  let serverError = "";
  let logFormElement;

  let deleteConfirm = {
    show: false,
    gameId: null,
    deleting: false,
  };

  let newGame = {
    date: new Date().toISOString().split("T")[0],
    commanderId: "",
    playerCount: 4,
    won: false,
    rounds: 8,
    startingPlayerWon: false,
    solRingTurnOneWon: false,
    notes: "",
  };

  $: formData = editingGame || newGame;

  onMount(async () => {
    await Promise.all([loadCommanders(), loadGames()]);
    loadPrefilled();
  });

  async function loadCommanders() {
    try {
      const response = await authenticatedFetch("/api/commanders");
      if (response.ok) {
        const data = await response.json();
        allCommanders = data.commanders || [];
      }
    } catch (error) {
      console.error("Failed to load commanders:", error);
    }
  }

  $: commanders = deriveCommanderOptions(allCommanders, formData?.commanderId);

  async function loadGames({ append = false } = {}) {
    if (append) {
      if (loadingMore || !hasMore) return;
      loadingMore = true;
    } else {
      loading = true;
      offset = 0;
      hasMore = false;
    }

    try {
      const queryOffset = append ? offset : 0;
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: queryOffset.toString(),
      });
      const response = await authenticatedFetch(
        `/api/games?${params.toString()}`,
      );
      if (response.ok) {
        const data = await response.json();
        const incomingGames = data.games || [];
        if (append) {
          const existingIds = new Set(games.map((game) => game.id));
          const deduped = incomingGames.filter(
            (game) => !existingIds.has(game.id),
          );
          games = [...games, ...deduped];
        } else {
          games = incomingGames;
        }
        hasMore = data.pagination?.hasMore ?? false;
        offset = queryOffset + incomingGames.length;
      } else {
        console.error("Failed to load games:", await response.text());
      }
    } catch (error) {
      console.error("Failed to load games:", error);
    } finally {
      if (append) {
        loadingMore = false;
      } else {
        loading = false;
      }
    }
  }

  async function loadMore() {
    await loadGames({ append: true });
  }

  async function loadPrefilled() {
    if (!browser) return;

    const prefilled = localStorage.getItem("edh-prefill-game");
    if (prefilled) {
      try {
        const data = JSON.parse(prefilled);
        newGame.date = data.date || new Date().toISOString().split("T")[0];
        newGame.rounds = data.rounds || 8;
        newGame.notes =
          `Ended after ${data.rounds} rounds in ${data.duration}.\nAverage time/round: ${data.avgTimePerRound}` ||
          "";

        showLogForm = true;
        localStorage.removeItem("edh-prefill-game");

        await tick();
        logFormElement?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        console.error("Error loading prefilled game data:", error);
      }
    }
  }

  async function handleLogGame(e) {
    e.preventDefault();
    serverError = "";

    if (!formData.commanderId) {
      serverError = "Please select a commander";
      return;
    }

    if (editingGame) {
      await handleUpdateGame();
    } else {
      await handleCreateGame();
    }
  }

  async function handleCreateGame() {
    submitting = true;

    try {
      const payload = {
        commanderId: formData.commanderId,
        date: formData.date,
        playerCount: parseInt(formData.playerCount),
        won: formData.won === true || formData.won === "true",
        rounds: parseInt(formData.rounds),
        startingPlayerWon:
          formData.startingPlayerWon === true ||
          formData.startingPlayerWon === "true",
        solRingTurnOneWon:
          formData.solRingTurnOneWon === true ||
          formData.solRingTurnOneWon === "true",
      };

      if (formData.notes && formData.notes.trim()) {
        payload.notes = formData.notes;
      }

      const response = await authenticatedFetch("/api/games", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        games = [data.game, ...games];
        offset += 1;
        resetForm();
        showLogForm = false;

        // Reset the round counter state
        if (browser) {
          localStorage.removeItem("edh-round-counter-state");
        }
      } else {
        const errorData = await response.json();
        serverError = errorData.message || "Failed to log game";
      }
    } catch (error) {
      console.error("Log game error:", error);
      serverError = "Network error occurred";
    } finally {
      submitting = false;
    }
  }

  async function handleUpdateGame() {
    submitting = true;

    try {
      const payload = {
        commanderId: formData.commanderId,
        date: formData.date,
        playerCount: parseInt(formData.playerCount),
        won: formData.won === true || formData.won === "true",
        rounds: parseInt(formData.rounds),
        startingPlayerWon:
          formData.startingPlayerWon === true ||
          formData.startingPlayerWon === "true",
        solRingTurnOneWon:
          formData.solRingTurnOneWon === true ||
          formData.solRingTurnOneWon === "true",
      };

      if (formData.notes && formData.notes.trim()) {
        payload.notes = formData.notes;
      }

      const response = await authenticatedFetch(
        `/api/games/${editingGame.id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        const data = await response.json();
        games = games.map((g) => (g.id === data.game.id ? data.game : g));
        resetForm();
        editingGame = null;
        showLogForm = false;
      } else {
        const errorData = await response.json();
        serverError = errorData.message || "Failed to update game";
      }
    } catch (error) {
      console.error("Update game error:", error);
      serverError = "Network error occurred";
    } finally {
      submitting = false;
    }
  }

  async function startEdit(game) {
    // Map API response to form fields
    const formattedDate = game.date
      ? new Date(game.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    // Ensure commanderId is a number to match select options
    const cmdId = game.commanderId;
    const finalCmdId = cmdId
      ? typeof cmdId === "number"
        ? cmdId
        : parseInt(cmdId)
      : "";

    editingGame = {
      id: game.id,
      date: formattedDate,
      commanderId: finalCmdId,
      playerCount: game.playerCount || 4,
      won: game.won || false,
      rounds: game.rounds || 8,
      startingPlayerWon: game.startingPlayerWon || false,
      solRingTurnOneWon: game.solRingTurnOneWon || false,
      notes: game.notes || "",
    };

    showLogForm = true;
    serverError = "";
    await tick();
    logFormElement?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    editingGame = null;
    showLogForm = false;
    serverError = "";
  }

  function resetForm() {
    newGame = {
      date: new Date().toISOString().split("T")[0],
      commanderId: "",
      playerCount: 4,
      won: false,
      rounds: 8,
      startingPlayerWon: false,
      solRingTurnOneWon: false,
      notes: "",
    };
  }

  function showDeleteConfirm(gameId) {
    deleteConfirm = {
      show: true,
      gameId,
      deleting: false,
    };
  }

  async function confirmDelete() {
    deleteConfirm.deleting = true;

    try {
      const response = await authenticatedFetch(
        `/api/games/${deleteConfirm.gameId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        games = games.filter((g) => g.id !== deleteConfirm.gameId);
        offset = Math.max(0, offset - 1);
        deleteConfirm = { show: false, gameId: null, deleting: false };
      } else {
        serverError = "Failed to delete game";
        deleteConfirm.deleting = false;
      }
    } catch (error) {
      console.error("Delete game error:", error);
      serverError = "Network error occurred";
      deleteConfirm.deleting = false;
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function deriveCommanderOptions(allList, currentCommanderId) {
    if (!Array.isArray(allList) || allList.length === 0) {
      return [];
    }

    const active = allList.filter((cmd) => !cmd.archived);
    const normalizedId = normalizeCommanderId(currentCommanderId);

    if (normalizedId === null) {
      return active;
    }

    const current = allList.find((cmd) => cmd.id === normalizedId);
    if (
      current &&
      current.archived &&
      !active.some((cmd) => cmd.id === current.id)
    ) {
      return [...active, current];
    }

    return active;
  }

  function normalizeCommanderId(value) {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
</script>

<svelte:head>
  <title>Game Log - EDH Stats Tracker</title>
  <meta name="description" content="Log and manage your EDH/Commander games" />
</svelte:head>

<ProtectedRoute>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <NavBar />

    <main class="container mx-auto px-4 py-8 flex-1">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Game Log</h1>
        <button
          on:click={() => {
            showLogForm = !showLogForm;
            if (!showLogForm) cancelEdit();
          }}
          class="btn btn-primary"
        >
          {#if showLogForm}
            Cancel
          {:else}
            Log New Game
          {/if}
        </button>
      </div>

      <!-- Log Game Form -->
      {#if showLogForm}
        <div class="card mb-8">
          <h2 class="text-xl font-bold mb-4">
            {editingGame ? "Edit Game" : "Log New Game"}
          </h2>

          {#key editingGame?.id || "new"}
            <form
              on:submit={handleLogGame}
              class="space-y-4"
              bind:this={logFormElement}
            >
              <!-- Date and Commander Row -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    for="date"
                    class="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    bind:value={formData.date}
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label
                    for="commander"
                    class="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Commander *
                  </label>
                  <select
                    id="commander"
                    bind:value={formData.commanderId}
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a commander</option>
                    {#each commanders as commander}
                      <option value={commander.id}>
                        {commander.name}{commander.archived
                          ? " (Archived)"
                          : ""}
                      </option>
                    {/each}
                  </select>
                </div>
              </div>

              <!-- Player Count and Rounds -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    for="playerCount"
                    class="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Player Count
                  </label>
                  <input
                    id="playerCount"
                    type="number"
                    bind:value={formData.playerCount}
                    min="2"
                    max="8"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label
                    for="rounds"
                    class="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Rounds
                  </label>
                  <input
                    id="rounds"
                    type="number"
                    bind:value={formData.rounds}
                    min="1"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <!-- Checkboxes -->
              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    bind:checked={formData.won}
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span class="ml-2 text-sm text-gray-900">I won this game</span
                  >
                </label>

                <label class="flex items-center">
                  <input
                    type="checkbox"
                    bind:checked={formData.startingPlayerWon}
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span class="ml-2 text-sm text-gray-900"
                    >Starting player won</span
                  >
                </label>

                <label class="flex items-center">
                  <input
                    type="checkbox"
                    bind:checked={formData.solRingTurnOneWon}
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span class="ml-2 text-sm text-gray-900">
                    Player with Sol Ring turn 1 won
                  </span>
                </label>
              </div>

              <!-- Notes -->
              <div>
                <label
                  for="notes"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  bind:value={formData.notes}
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Add any notes about this game..."
                ></textarea>
              </div>

              <!-- Error Message -->
              {#if serverError}
                <div class="rounded-md bg-red-50 p-4">
                  <p class="text-sm font-medium text-red-800">{serverError}</p>
                </div>
              {/if}

              <!-- Submit Button -->
              <div class="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  class="flex-1 btn btn-primary disabled:opacity-50"
                >
                  {#if submitting}
                    <div class="loading-spinner w-5 h-5 mx-auto"></div>
                  {:else if editingGame}
                    Update Game
                  {:else}
                    Log Game
                  {/if}
                </button>

                {#if editingGame}
                  <button
                    type="button"
                    on:click={cancelEdit}
                    class="btn btn-secondary"
                  >
                    Cancel
                  </button>
                {/if}
              </div>
            </form>
          {/key}
        </div>
      {/if}

      <!-- Games List -->
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <div class="loading-spinner w-12 h-12"></div>
        </div>
      {:else if games.length === 0}
        <div class="card text-center py-12">
          <p class="text-gray-600 mb-4">No games logged yet</p>
          <button on:click={() => (showLogForm = true)} class="btn btn-primary">
            Log Your First Game
          </button>
        </div>
      {:else}
        <div class="space-y-4">
          {#each games as game}
            <div
              class="card hover:shadow-lg transition-shadow {game.won
                ? 'border-l-4 border-l-green-500'
                : ''}"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h3 class="text-lg font-bold text-gray-900">
                      {game.commanderName}
                    </h3>
                    {#if game.won}
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        Won
                      </span>
                    {:else}
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        Loss
                      </span>
                    {/if}
                  </div>

                  <div class="text-sm text-gray-600 space-y-1">
                    <p>
                      {formatDate(game.date)} • {game.rounds} rounds • {game.playerCount}
                      players
                    </p>
                    {#if game.startingPlayerWon}
                      <p>• Starting player won</p>
                    {/if}
                    {#if game.solRingTurnOneWon}
                      <p>• Sol Ring turn 1 won</p>
                    {/if}
                    {#if game.notes}
                      <p class="mt-2 text-gray-700">{game.notes}</p>
                    {/if}
                  </div>
                </div>

                <div class="flex gap-2 ml-4">
                  <button
                    on:click={() => startEdit(game)}
                    class="text-indigo-600 hover:text-indigo-800 text-xl font-medium"
                  >
                    Edit
                  </button>
                  <button
                    on:click={() => showDeleteConfirm(game.id)}
                    class="text-red-600 hover:text-red-800 text-xl font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>

        {#if hasMore}
          <div class="flex justify-center pt-6">
            <button
              on:click={loadMore}
              class="btn btn-secondary"
              disabled={loadingMore}
            >
              {#if loadingMore}
                <div class="loading-spinner w-5 h-5"></div>
              {:else}
                Load More
              {/if}
            </button>
          </div>
        {:else if hasMore && games.length > 0}
          <p class="text-center text-gray-500 pt-6">
            You have reached the end of the line.
          </p>
        {/if}
      {/if}
    </main>

    <!-- Delete Confirmation Modal -->
    {#if deleteConfirm.show}
      <div
        class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
      >
        <button
          class="absolute inset-0 w-full h-full cursor-default"
          aria-label="Close dialog"
          on:click={() =>
            !deleteConfirm.deleting && (deleteConfirm.show = false)}
        ></button>
        <div class="relative bg-white rounded-lg p-6 max-w-sm w-full mx-4">
          <h3 class="text-lg font-bold text-gray-900 mb-2">Delete Game</h3>
          <p class="text-gray-600 mb-6">
            Are you sure you want to delete this game? This action cannot be
            undone.
          </p>

          <div class="flex gap-3">
            <button
              on:click={confirmDelete}
              disabled={deleteConfirm.deleting}
              class="flex-1 btn btn-danger disabled:opacity-50"
            >
              {#if deleteConfirm.deleting}
                <div class="loading-spinner w-5 h-5 mx-auto"></div>
              {:else}
                Delete
              {/if}
            </button>
            <button
              on:click={() => (deleteConfirm.show = false)}
              disabled={deleteConfirm.deleting}
              class="flex-1 btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    {/if}

    <Footer />
  </div>
</ProtectedRoute>
