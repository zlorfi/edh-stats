<script>
  import { onMount, tick } from "svelte";
  import { authenticatedFetch, currentUser } from "$stores/auth";
  import NavBar from "$components/NavBar.svelte";
  import ProtectedRoute from "$components/ProtectedRoute.svelte";
  import Footer from "$components/Footer.svelte";
  import CommanderListSection from "$components/CommanderListSection.svelte";

  let showAddForm = false;
  let commanders = [];
  let loading = false;
  let loadingMore = false;
  let submitting = false;
  let serverError = "";
  let editingCommander = null;
  let formElement;
  let limit = 20;
  let offset = 0;
  let hasMore = false;

  let newCommander = {
    name: "",
    colors: [],
    archived: false,
  };

  $: formData = editingCommander || newCommander;
  $: activeCommanders = commanders.filter((cmd) => !cmd.archived);
  $: archivedCommanders = commanders.filter((cmd) => cmd.archived);

  const mtgColors = [
    { id: "W", name: "White", hex: "#F0E6D2" },
    { id: "U", name: "Blue", hex: "#0E68AB" },
    { id: "B", name: "Black", hex: "#2C2B2D" },
    { id: "R", name: "Red", hex: "#C44536" },
    { id: "G", name: "Green", hex: "#5A7A3B" },
  ];

  const pngColorIcons = {
    W: "/images/W.png",
    U: "/images/U.png",
    B: "/images/B.png",
    R: "/images/R.png",
    G: "/images/G.png",
    C: "/images/C.png",
  };

  const svgColorIcons = {
    W: "/images/W.svg",
    U: "/images/U.svg",
    B: "/images/B.svg",
    R: "/images/R.svg",
    G: "/images/G.svg",
    C: "/images/C.svg",
  };

  let colorIconMap = pngColorIcons;

  $: colorIconMap = $currentUser?.isAdmin ? svgColorIcons : pngColorIcons;

  onMount(async () => {
    await loadCommanders();
  });

  async function loadCommanders({ append = false } = {}) {
    if (append) {
      if (loadingMore || !hasMore) return;
      loadingMore = true;
    } else {
      loading = true;
      offset = 0;
      hasMore = false;
    }
    try {
      // Load commanders with pagination
      const queryOffset = append ? offset : 0;
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: queryOffset.toString(),
      });
      const response = await authenticatedFetch(
        `/api/commanders?${params.toString()}`,
      );
      if (response.ok) {
        const data = await response.json();
        const commandersList = data.commanders || [];

        const mappedCommanders = commandersList.map((cmd) => ({
          ...cmd,
          commanderId: cmd.id,
          totalGames: cmd.totalGames || 0,
          winRate: cmd.winRate || 0,
          avgRounds: cmd.avgRounds || 0,
          wins: cmd.totalWins || 0,
          archived: cmd.archived ?? false,
        }));

        if (append) {
          const existingIds = new Set(
            commanders.map((cmd) => cmd.id || cmd.commanderId),
          );
          const deduped = mappedCommanders.filter(
            (cmd) => !existingIds.has(cmd.id || cmd.commanderId),
          );
          commanders = [...commanders, ...deduped];
        } else {
          commanders = mappedCommanders;
        }

        hasMore = data.pagination?.hasMore ?? false;
        offset = queryOffset + commandersList.length;
      }
    } catch (error) {
      console.error("Load commanders error:", error);
      serverError = "Failed to load commanders";
    } finally {
      if (append) {
        loadingMore = false;
      } else {
        loading = false;
      }
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

  function normalizeColorsInput(colors) {
    if (!colors) return [];
    if (Array.isArray(colors)) return colors;
    if (typeof colors === "string") {
      return colors.split("").map((c) => c.toUpperCase());
    }
    return [];
  }

  async function startEdit(commander) {
    // Handle both array and string formats for colors
    const colorsArray = normalizeColorsInput(commander.colors);

    editingCommander = {
      id: commander.id || commander.commanderId,
      name: commander.name,
      colors: colorsArray,
      archived: commander.archived ?? false,
    };
    showAddForm = true;
    serverError = "";

    await tick();
    formElement?.scrollIntoView({ behavior: "smooth", block: "start" });
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
              archived: current.archived ?? false,
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
            archived: current.archived ?? false,
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
      archived: false,
    };
  }

  function getColorIcons(colors) {
    const normalized = normalizeColorsInput(colors);
    const list = normalized.length > 0 ? normalized : ["C"];

    return list
      .map((colorId) => ({
        id: colorId,
        src: colorIconMap[colorId] || null,
      }))
      .filter((icon) => Boolean(icon.src));
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

  function closeDeleteDialog() {
    if (!deleteConfirm.deleting) {
      deleteConfirm.show = false;
    }
  }

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) {
      closeDeleteDialog();
    }
  }

  function handleDeleteDialogKeydown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      closeDeleteDialog();
    }
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

  async function loadMoreCommanders() {
    await loadCommanders({ append: true });
  }
</script>

<svelte:head>
  <title>Commanders - EDH Stats Tracker</title>
  <meta name="description" content="Manage your EDH/Commander decks" />
</svelte:head>

<ProtectedRoute>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <NavBar />

    <main class="container mx-auto px-4 py-8 flex-1">
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

          <form
            on:submit={handleAddCommander}
            class="space-y-4"
            bind:this={formElement}
          >
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
              <p class="block text-sm font-medium text-gray-700 mb-2">
                Color Identity
              </p>
              <div class="flex gap-3">
                {#each mtgColors as color}
                  <button
                    type="button"
                    on:click={() => toggleColor(color.id)}
                    class="color-chip-button {formData.colors.includes(color.id)
                      ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900'
                      : 'border-gray-300 hover:border-gray-400'}"
                    title={color.name}
                  >
                    <img
                      src={colorIconMap[color.id]}
                      alt=""
                      class="color-chip-icon"
                      aria-hidden="true"
                      loading="lazy"
                    />
                    <span class="sr-only">{color.name}</span>
                  </button>
                {/each}
              </div>
              <p class="text-xs text-gray-500 mt-2">
                Leave empty for colorless commanders
              </p>
            </div>

            {#if editingCommander}
              <div class="rounded-md border border-gray-200 bg-gray-50 p-3">
                <label class="flex items-start gap-3 text-sm text-gray-900">
                  <input
                    type="checkbox"
                    bind:checked={formData.archived}
                    class="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span>
                    Archive this commander
                    <span class="block text-xs text-gray-500">
                      Archived commanders stay visible in this list but cannot
                      be selected when logging games.
                    </span>
                  </span>
                </label>
              </div>
            {/if}

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
        <div class="space-y-12">
          {#if activeCommanders.length > 0}
            <CommanderListSection
              commanders={activeCommanders}
              {getColorIcons}
              {formatDate}
              onEdit={startEdit}
              onDelete={(commander) =>
                showDeleteConfirm(
                  commander.id || commander.commanderId,
                  commander.name,
                )}
            />
          {/if}

          {#if archivedCommanders.length > 0}
            <div class="space-y-4">
              <div
                class="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800"
              >
                Archived commanders remain in your history but will not appear
                when logging new games.
              </div>
              <CommanderListSection
                commanders={archivedCommanders}
                archived={true}
                {getColorIcons}
                {formatDate}
                onEdit={startEdit}
                onDelete={(commander) =>
                  showDeleteConfirm(
                    commander.id || commander.commanderId,
                    commander.name,
                  )}
              />
            </div>
          {/if}

          {#if hasMore}
            <div class="flex justify-center pt-6">
              <button
                on:click={loadMoreCommanders}
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
          {:else if hasMore && commanders.length > 0}
            <p class="text-center text-gray-500 pt-6">
              You have reached the end of the line.
            </p>
          {/if}
        </div>
      {/if}

      <!-- Delete Confirmation Modal -->
      {#if deleteConfirm.show}
        <div
          class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
          on:click={handleOverlayClick}
          on:keydown={handleDeleteDialogKeydown}
          role="dialog"
          aria-modal="true"
          tabindex="-1"
        >
          <div
            class="bg-white rounded-lg p-6 max-w-sm w-full mx-4"
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

<style>
  :global(.color-icon) {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 9999px;
    object-fit: cover;
    padding: 0;
    background: transparent;
    background-color: #fff;
    padding: 0.2rem;
    border: none;
    box-shadow: none;
  }

  :global(.color-pill) {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    background-color: #f5f5f5;
    border: 1px solid #e5e7eb;
    border-radius: 9999px;
    padding: 0.3rem 0.6rem;
    width: fit-content;
  }

  .color-chip-icon {
    width: 90%;
    height: 90%;
    border-radius: 9999px;
    object-fit: cover;
    pointer-events: none;
    background-color: #fff;
    /*border: 1px solid #e5e7eb;*/
    padding: 0.2rem;
    /*box-shadow: inset 0 1px 1px rgba(15, 23, 42, 0.12);*/
  }

  .color-chip-button {
    width: 3rem;
    height: 3rem;
    border-radius: 9999px;
    border-width: 2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: #f3f4f6;
    box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.08);
    transition: all 0.2s ease;
    padding: 0;
  }
</style>
