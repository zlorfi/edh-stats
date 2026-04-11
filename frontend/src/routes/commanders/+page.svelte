<script>
  import { onMount } from "svelte";
  import { authenticatedFetch } from "$stores/auth";
  import NavBar from "$components/NavBar.svelte";
  import ProtectedRoute from "$components/ProtectedRoute.svelte";
  import Footer from "$components/Footer.svelte";

  let showAddForm = false;
  let commanders = [];
  let loading = false;
  let submitting = false;
  let serverError = "";
  let editingCommander = null;

  let newCommander = {
    name: "",
    colors: [],
  };

  $: formData = editingCommander || newCommander;

  const mtgColors = [
    { id: "W", name: "White", hex: "#F0E6D2" },
    { id: "U", name: "Blue", hex: "#0E68AB" },
    { id: "B", name: "Black", hex: "#2C2B2D" },
    { id: "R", name: "Red", hex: "#C44536" },
    { id: "G", name: "Green", hex: "#5A7A3B" },
  ];

  onMount(async () => {
    await loadCommanders();
  });

  async function loadCommanders() {
    loading = true;
    try {
      // Load all commanders (not just ones with stats)
      const response = await authenticatedFetch("/api/commanders");
      if (response.ok) {
        const data = await response.json();
        const commandersList = data.commanders || [];

        // Load stats for each commander
        const statsResponse = await authenticatedFetch("/api/stats/commanders");
        let statsMap = {};
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          const statsList = statsData.stats || [];
          // Map stats by commanderId
          statsList.forEach((stat) => {
            statsMap[stat.commanderId] = stat;
          });
        }

        // Merge commanders with their stats
        commanders = commandersList.map((cmd) => ({
          ...cmd,
          commanderId: cmd.id,
          totalGames: cmd.totalGames || 0,
          winRate: cmd.winRate || 0,
          avgRounds: cmd.avgRounds || 0,
          wins: cmd.totalWins || 0,
        }));
      }
    } catch (error) {
      console.error("Load commanders error:", error);
      serverError = "Failed to load commanders";
    } finally {
      loading = false;
    }
  }

  function toggleColor(colorId) {
    const current = editingCommander || newCommander;
    if (current.colors.includes(colorId)) {
      current.colors = current.colors.filter((c) => c !== colorId);
    } else {
      current.colors = [...current.colors, colorId];
    }

    if (editingCommander) {
      editingCommander = { ...editingCommander, colors: current.colors };
    } else {
      newCommander = { ...newCommander, colors: current.colors };
    }
  }

  function startEdit(commander) {
    // Handle both array and string formats for colors
    const colorsArray = Array.isArray(commander.colors)
      ? commander.colors
      : typeof commander.colors === "string"
        ? commander.colors.split("")
        : [];

    editingCommander = {
      id: commander.id || commander.commanderId,
      name: commander.name,
      colors: colorsArray,
    };
    showAddForm = true;
    serverError = "";
  }

  function cancelEdit() {
    editingCommander = null;
    showAddForm = false;
    resetForm();
  }

  async function handleAddCommander(e) {
    e.preventDefault();
    serverError = "";

    const current = editingCommander || newCommander;

    if (!current.name.trim()) {
      serverError = "Commander name is required";
      return;
    }

    submitting = true;
    try {
      if (editingCommander) {
        // Update existing commander
        const response = await authenticatedFetch(
          `/api/commanders/${editingCommander.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              name: current.name.trim(),
              colors: current.colors,
            }),
          },
        );

        if (response.ok) {
          await loadCommanders();
          editingCommander = null;
          resetForm();
          showAddForm = false;
        } else {
          const errorData = await response.json();
          serverError = errorData.message || "Failed to update commander";
        }
      } else {
        // Create new commander
        const response = await authenticatedFetch("/api/commanders", {
          method: "POST",
          body: JSON.stringify({
            name: current.name.trim(),
            colors: current.colors,
          }),
        });

        if (response.ok) {
          await loadCommanders();
          resetForm();
          showAddForm = false;
        } else {
          const errorData = await response.json();
          serverError = errorData.message || "Failed to add commander";
        }
      }
    } catch (error) {
      console.error("Commander save error:", error);
      serverError = "Network error occurred";
    } finally {
      submitting = false;
    }
  }

  function resetForm() {
    newCommander = {
      name: "",
      colors: [],
    };
  }

  function getColorComponents(colors) {
    if (!colors || colors.length === 0) return [];

    // Handle both string and array formats
    const colorArray = typeof colors === "string" ? colors.split("") : colors;

    return colorArray
      .map((c) => mtgColors.find((mc) => mc.id === c))
      .filter(Boolean);
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  }

  let deleteConfirm = {
    show: false,
    commanderId: null,
    commanderName: "",
    deleting: false,
  };

  function showDeleteConfirm(commanderId, commanderName) {
    deleteConfirm = {
      show: true,
      commanderId,
      commanderName,
      deleting: false,
    };
  }

  async function handleDelete() {
    deleteConfirm.deleting = true;
    try {
      const response = await authenticatedFetch(
        `/api/commanders/${deleteConfirm.commanderId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        await loadCommanders();
        deleteConfirm.show = false;
      } else {
        const errorData = await response.json();
        serverError = errorData.message || "Failed to delete commander";
      }
    } catch (error) {
      console.error("Delete commander error:", error);
      serverError = "Network error occurred";
    } finally {
      deleteConfirm.deleting = false;
    }
  }
</script>

<svelte:head>
  <title>Commanders - EDH Stats Tracker</title>
  <meta name="description" content="Manage your EDH/Commander decks" />
</svelte:head>

<ProtectedRoute>
  <div class="min-h-screen bg-gray-50">
    <NavBar />

    <main class="container mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Commanders</h1>
        <button
          on:click={() => {
            if (showAddForm) {
              cancelEdit();
            } else {
              showAddForm = true;
            }
          }}
          class="btn btn-primary"
        >
          {#if showAddForm}
            Cancel
          {:else}
            Add Commander
          {/if}
        </button>
      </div>

      <!-- Add Commander Form -->
      {#if showAddForm}
        <div class="card mb-8">
          <h2 class="text-xl font-bold mb-4">
            {editingCommander ? "Edit Commander" : "Add New Commander"}
          </h2>

          <form on:submit={handleAddCommander} class="space-y-4">
            <div>
              <label
                for="name"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Commander Name *
              </label>
              <input
                id="name"
                type="text"
                bind:value={formData.name}
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter commander name"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Color Identity
              </label>
              <div class="flex gap-3">
                {#each mtgColors as color}
                  <button
                    type="button"
                    on:click={() => toggleColor(color.id)}
                    class="w-12 h-12 rounded-full border-2 transition-all {formData.colors.includes(
                      color.id,
                    )
                      ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900'
                      : 'border-gray-300 hover:border-gray-400'}"
                    style="background-color: {color.hex}"
                    title={color.name}
                  >
                    <span class="sr-only">{color.name}</span>
                  </button>
                {/each}
              </div>
              <p class="text-xs text-gray-500 mt-2">
                Leave empty for colorless commanders
              </p>
            </div>

            {#if serverError}
              <div class="rounded-md bg-red-50 p-4">
                <p class="text-sm font-medium text-red-800">{serverError}</p>
              </div>
            {/if}

            <div class="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                class="btn btn-primary disabled:opacity-50 flex-1"
              >
                {#if submitting}
                  <div class="loading-spinner w-5 h-5 mx-auto"></div>
                {:else}
                  {editingCommander ? "Update Commander" : "Add Commander"}
                {/if}
              </button>
              {#if editingCommander}
                <button
                  type="button"
                  on:click={cancelEdit}
                  disabled={submitting}
                  class="btn bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
              {/if}
            </div>
          </form>
        </div>
      {/if}

      <!-- Commanders List -->
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <div class="loading-spinner w-12 h-12"></div>
        </div>
      {:else if commanders.length === 0}
        <div class="card text-center py-12">
          <p class="text-gray-600 mb-4">No commanders yet</p>
          <button on:click={() => (showAddForm = true)} class="btn btn-primary">
            Add Your First Commander
          </button>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each commanders as commander}
            <div class="card hover:shadow-lg transition-shadow">
              <!-- Header with name and actions -->
              <div class="flex items-start justify-between mb-4">
                <h3 class="text-xl font-bold text-gray-900">
                  {commander.name}
                </h3>
                <div class="flex gap-2">
                  <button
                    on:click={() => startEdit(commander)}
                    class="text-indigo-600 hover:text-indigo-800 text-xl font-medium"
                  >
                    Edit
                  </button>
                  <button
                    on:click={() =>
                      showDeleteConfirm(
                        commander.id || commander.commanderId,
                        commander.name,
                      )}
                    class="text-red-600 hover:text-red-800 text-xl font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <!-- Color badges -->
              <div class="flex gap-2 mb-6">
                {#each getColorComponents(commander.colors) as color}
                  <div
                    class="w-8 h-8 rounded"
                    style="background-color: {color.hex}"
                    title={color.name}
                  ></div>
                {:else}
                  <span class="text-sm text-gray-500 italic">Colorless</span>
                {/each}
              </div>

              <!-- Stats Grid -->
              <div class="grid grid-cols-2 gap-6">
                <div class="text-center">
                  <div class="text-3xl font-bold text-gray-900">
                    {commander.totalGames || 0}
                  </div>
                  <div class="text-sm text-gray-600 mt-1">Games Played</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-gray-900">
                    {Number(commander.winRate || 0).toFixed(1)}%
                  </div>
                  <div class="text-sm text-gray-600 mt-1">Win Rate</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-gray-900">
                    {Number(commander.avgRounds || 0).toFixed(1)}
                  </div>
                  <div class="text-sm text-gray-600 mt-1">Avg Rounds</div>
                </div>
                <div class="text-center">
                  <div class="text-sm text-gray-500 mt-2">Added</div>
                  <div class="text-sm text-gray-700">
                    {formatDate(commander.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Delete Confirmation Modal -->
      {#if deleteConfirm.show}
        <div
          class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
          on:click={() =>
            !deleteConfirm.deleting && (deleteConfirm.show = false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            class="bg-white rounded-lg p-6 max-w-sm w-full mx-4"
            on:click|stopPropagation
            role="document"
          >
            <h3 class="text-lg font-bold text-gray-900 mb-2">
              Delete Commander
            </h3>
            <p class="text-gray-600 mb-6">
              Are you sure you want to delete "{deleteConfirm.commanderName}"?
              This action cannot be undone.
            </p>
            <div class="flex gap-3 justify-end">
              <button
                on:click={() => (deleteConfirm.show = false)}
                disabled={deleteConfirm.deleting}
                class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                on:click={handleDelete}
                disabled={deleteConfirm.deleting}
                class="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {#if deleteConfirm.deleting}
                  Deleting...
                {:else}
                  Delete
                {/if}
              </button>
            </div>
          </div>
        </div>
      {/if}
    </main>

    <Footer />
  </div>
</ProtectedRoute>
