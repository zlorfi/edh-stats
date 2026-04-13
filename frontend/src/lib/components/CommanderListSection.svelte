<script>
  export let commanders = [];
  export let archived = false;
  export let getColorIcons;
  export let formatDate;
  export let onEdit = () => {};
  export let onDelete = () => {};
</script>

{#if commanders.length > 0}
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    {#each commanders as commander}
      <div
        class="card hover:shadow-lg transition-shadow {archived ? 'opacity-80' : ''}"
      >
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-xl font-bold text-gray-900">{commander.name}</h3>
              {#if archived}
                <span
                  class="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700"
                >
                  Archived
                </span>
              {/if}
            </div>
          </div>
          <div class="flex gap-2">
            <button
              on:click={() => onEdit(commander)}
              class="text-indigo-600 hover:text-indigo-800 text-xl font-medium opacity-100"
            >
              Edit
            </button>
            <button
              on:click={() => onDelete(commander)}
              class="text-red-600 hover:text-red-800 text-xl font-medium opacity-100"
            >
              Delete
            </button>
          </div>
        </div>

        <div class="color-pill">
          {#each getColorIcons(commander.colors) as icon}
            <img
              src={icon.src}
              alt={`${icon.id} color icon`}
              class="color-icon"
              loading="lazy"
            />
          {/each}
        </div>

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
            <div class="text-sm text-gray-700">{formatDate(commander.createdAt)}</div>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}
