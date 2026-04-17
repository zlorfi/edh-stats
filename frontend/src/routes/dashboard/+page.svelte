<script>
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import { authenticatedFetch } from "$stores/auth";
  import NavBar from "$components/NavBar.svelte";
  import ProtectedRoute from "$components/ProtectedRoute.svelte";
  import Footer from "$components/Footer.svelte";

  let Chart;
  let stats = {
    totalGames: 0,
    winRate: 0,
    totalCommanders: 0,
    inactiveCommanders: 0,
    avgRounds: 0,
  };

  let recentGames = [];
  let topCommanders = [];
  let loading = true;
  let charts = {};
  let colorWinRateTotals = null;

  const colorMeta = {
    W: { label: "White", color: "#F9F5E3" },
    U: { label: "Blue", color: "#B7DBF6" },
    B: { label: "Black", color: "#C7C0BC" },
    R: { label: "Red", color: "#F8B4A6" },
    G: { label: "Green", color: "#A9D5B8" },
    C: { label: "Colorless", color: "#D9D9D9" },
  };

  function normalizeColorsInput(colors) {
    if (!colors) return ["C"];
    if (Array.isArray(colors)) {
      return colors.length
        ? colors.map((color) => String(color).toUpperCase())
        : ["C"];
    }
    if (typeof colors === "string" && colors.trim().length > 0) {
      try {
        const parsed = JSON.parse(colors);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((color) => String(color).toUpperCase());
        }
      } catch (error) {
        // not JSON, fall back to splitting characters
      }
      return colors.split("").map((c) => c.toUpperCase());
    }
    return ["C"];
  }

  function computeColorWinRatesFromRaw(entries = []) {
    const totals = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    entries.forEach((entry) => {
      const key = colorMeta[entry.color]?.label ? entry.color : "C";
      totals[key] += Number(entry.value) || 0;
    });
    return totals;
  }

  function computeColorWinRatesFromCommanders(commanders = []) {
    const totals = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    commanders.forEach((commander) => {
      const colors = normalizeColorsInput(commander.colors);
      const winRate = Number(commander.winRate) || 0;
      const slice = colors.length > 0 ? colors.length : 1;
      colors.forEach((color) => {
        const key = colorMeta[color]?.label ? color : "C";
        totals[key] += winRate / slice;
      });
    });
    return totals;
  }

  function computeColorWinRatesFromChartData(chartColors) {
    if (!chartColors) return null;
    const { labels = [], data = [] } = chartColors;
    if (!labels.length) return null;
    const totals = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    labels.forEach((label, index) => {
      const colors = normalizeColorsInput(label);
      const slice = colors.length > 0 ? colors.length : 1;
      const value = Number(data[index]) || 0;
      colors.forEach((color) => {
        const key = colorMeta[color]?.label ? color : "C";
        totals[key] += value / slice;
      });
    });
    return totals;
  }

  function hasColorData(winRates) {
    if (!winRates) return false;
    return Object.values(winRates).some((value) => Number(value) > 0.01);
  }

  function buildColorChartDataset(winRates) {
    if (!winRates) return { labels: [], data: [], colors: [] };
    const entries = Object.keys(colorMeta)
      .map((key) => ({ key, value: Number(winRates[key] || 0) }))
      .filter((entry) => entry.value > 0.01);

    const total = entries.reduce((sum, entry) => sum + entry.value, 0);

    return {
      labels: entries.map((entry) => colorMeta[entry.key].label),
      data: entries.map((entry) =>
        total > 0 ? Number(((entry.value / total) * 100).toFixed(2)) : 0,
      ),
      colors: entries.map((entry) => colorMeta[entry.key].color),
    };
  }

  onMount(async () => {
    if (browser) {
      // Dynamically import Chart.js
      const ChartModule = await import("chart.js/auto");
      Chart = ChartModule.default;
    }
    await loadDashboardData();
  });

  onDestroy(() => {
    // Clean up charts
    if (charts.colorWinRate) charts.colorWinRate.destroy();
    if (charts.playerCount) charts.playerCount.destroy();
  });

  async function loadDashboardData() {
    loading = true;
    try {
      // Load user stats
      const statsResponse = await authenticatedFetch("/api/stats/overview");
      if (statsResponse.ok) {
        stats = await statsResponse.json();
      }

      // Load recent games
      const gamesResponse = await authenticatedFetch("/api/games?limit=5");
      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json();
        recentGames = gamesData.games || [];
      }

      // Load top commanders and chart data
      const commandersResponse = await authenticatedFetch(
        "/api/stats/commanders",
      );
      if (commandersResponse.ok) {
        const commandersData = await commandersResponse.json();
        const commanders = Array.isArray(commandersData.stats)
          ? commandersData.stats
          : [];
        topCommanders = commanders.slice(0, 5);

        const colorEntriesRaw = commandersData.charts?.colors?.raw || [];
        let aggregatedColors = computeColorWinRatesFromRaw(colorEntriesRaw);

        if (!hasColorData(aggregatedColors)) {
          aggregatedColors = computeColorWinRatesFromChartData(
            commandersData.charts?.colors,
          );
        }

        if (!hasColorData(aggregatedColors)) {
          aggregatedColors = computeColorWinRatesFromCommanders(commanders);
        }

        colorWinRateTotals = aggregatedColors;

        // Initialize charts after data is loaded
        setTimeout(() => initCharts(commandersData.charts), 100);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      loading = false;
    }
  }

  function initCharts(chartData) {
    if (!browser || !Chart) return;

    // Destroy existing charts if any
    if (charts.colorWinRate) charts.colorWinRate.destroy();
    if (charts.playerCount) charts.playerCount.destroy();

    // Pastel color palette (15 colors)
    const pastelColors = [
      "#FFD93D",
      "#D4A5FF",
      "#FF9E9E",
      "#B4E7FF",
      "#FFA94D",
      "#9D84B7",
      "#FF85B3",
      "#4D96FF",
      "#FFCB69",
      "#56AB91",
      "#FF6B6B",
      "#FFB3D9",
      "#A8E6CF",
      "#6BCB77",
      "#C7CEEA",
    ];

    // Color Win Rate Chart (aggregated by individual colors)
    let filteredLabels = [];
    let filteredData = [];
    let filteredColors = [];

    let dataset = buildColorChartDataset(colorWinRateTotals);

    if (dataset.data.length === 0 && Array.isArray(chartData?.colors?.labels)) {
      const fallback = buildColorChartDataset(
        computeColorWinRatesFromChartData(chartData.colors),
      );
      dataset = fallback.data.length > 0 ? fallback : dataset;
    }

    filteredLabels = dataset.labels;
    filteredData = dataset.data;
    filteredColors = dataset.colors.length
      ? dataset.colors
      : filteredLabels.map((_, index) => pastelColors[index % pastelColors.length]);

    const colorCanvas = document.getElementById("colorWinRateChart");
    if (colorCanvas) {
      const colorCtx = colorCanvas.getContext("2d");
      charts.colorWinRate = new Chart(colorCtx, {
        type: "doughnut",
        data: {
          labels: filteredLabels,
          datasets: [
            {
              data: filteredData,
              backgroundColor: filteredColors.length
                ? filteredColors
                : pastelColors.slice(0, filteredLabels.length),
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "right" },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || "";
                  const value = context.parsed || 0;
                  return `${label}: ${value.toFixed(2)}%`;
                },
              },
            },
          },
        },
      });
    }

    // Player Count Win Rate Chart
    const playerLabels = chartData?.playerCounts?.labels || [];
    const playerData = chartData?.playerCounts?.data || [];
    const playerFilteredIndices = playerData
      .map((value, index) => (value > 0 ? index : -1))
      .filter((index) => index !== -1);

    const playerFilteredLabels = playerFilteredIndices.map(
      (i) => playerLabels[i],
    );
    const playerFilteredData = playerFilteredIndices.map((i) => playerData[i]);

    const playerCanvas = document.getElementById("playerCountChart");
    if (playerCanvas) {
      const playerCtx = playerCanvas.getContext("2d");
      charts.playerCount = new Chart(playerCtx, {
        type: "bar",
        data: {
          labels: playerFilteredLabels,
          datasets: [
            {
              label: "Win Rate (%)",
              data: playerFilteredData,
              backgroundColor: "#6366f1",
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
            },
          },
        },
      });
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
</script>

<svelte:head>
  <title>Dashboard - EDH Stats Tracker</title>
  <meta
    name="description"
    content="Your EDH/Commander game statistics dashboard"
  />
</svelte:head>

<ProtectedRoute>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <NavBar />

    <main class="container mx-auto px-4 py-8 flex-1">
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <div class="loading-spinner w-12 h-12"></div>
        </div>
      {:else}
        <!-- Stats Overview -->
        <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <!-- Total Games -->
          <div class="card">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">Total Games</p>
                <p class="text-3xl font-bold text-gray-900">
                  {stats.totalGames}
                </p>
              </div>
            </div>
          </div>

          <!-- Win Rate -->
          <div class="card">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">Win Rate</p>
                <p class="text-3xl font-bold text-gray-900">{stats.winRate}%</p>
              </div>
            </div>
          </div>

          <!-- Commanders -->
          <div class="card">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">Commanders</p>
                <div class="flex items-baseline gap-2">
                  <p class="text-3xl font-bold text-gray-900">
                    {stats.totalCommanders}
                  </p>
                  {#if stats.inactiveCommanders > 0}
                    <span class="text-sm text-gray-500">
                      ({stats.inactiveCommanders} archived)
                    </span>
                  {/if}
                </div>
              </div>
            </div>
          </div>

          <!-- Avg Rounds -->
          <div class="card">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">Avg Rounds</p>
                <p class="text-3xl font-bold text-gray-900">
                  {stats.avgRounds}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <!-- Color Win Rate Chart -->
          <div class="card">
            <h3 class="text-lg font-semibold mb-6">Win Rate by Color</h3>
            <div class="h-64 relative">
              <canvas id="colorWinRateChart"></canvas>
            </div>
          </div>

          <!-- Player Count Chart -->
          <div class="card">
            <h3 class="text-lg font-semibold mb-6">Win Rate by Player Count</h3>
            <div class="h-64 relative">
              <canvas id="playerCountChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Recent Games and Top Commanders -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Recent Games -->
          <div class="card">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold text-gray-900">Recent Games</h2>
              <a
                href="/games"
                class="text-sm text-indigo-600 hover:text-indigo-800"
              >
                View All →
              </a>
            </div>

            {#if recentGames.length === 0}
              <div class="text-center py-8 text-gray-500">
                <p>No games logged yet</p>
                <a
                  href="/games"
                  class="text-indigo-600 hover:text-indigo-800 mt-2 inline-block"
                >
                  Log your first game
                </a>
              </div>
            {:else}
              <div class="space-y-3">
                {#each recentGames as game}
                  <div
                    class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div class="flex-1">
                      <p class="font-medium text-gray-900">
                        {game.commanderName}
                      </p>
                      <p class="text-sm text-gray-600">
                        {formatDate(game.date)} • {game.rounds} rounds • {game.playerCount}
                        players
                      </p>
                    </div>
                    <div class="ml-4">
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
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Top Commanders -->
          <div class="card">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold text-gray-900">Top Commanders</h2>
              <a
                href="/commanders"
                class="text-sm text-indigo-600 hover:text-indigo-800"
              >
                View All →
              </a>
            </div>

            {#if topCommanders.length === 0}
              {#if stats.totalCommanders > 0}
                <div class="text-center py-8 text-gray-500">
                  <p>
                    Keep playing with your commanders to unlock detailed stats.
                  </p>
                  <a
                    href="/commanders"
                    class="text-indigo-600 hover:text-indigo-800 mt-2 inline-block"
                  >
                    View your commander list
                  </a>
                </div>
              {:else}
                <div class="text-center py-8 text-gray-500">
                  <p>No commanders yet</p>
                  <a
                    href="/commanders"
                    class="text-indigo-600 hover:text-indigo-800 mt-2 inline-block"
                  >
                    Add your first commander
                  </a>
                </div>
              {/if}
            {:else}
              <div class="space-y-3">
                {#each topCommanders as commander}
                  <div
                    class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div class="flex-1">
                      <p class="font-medium text-gray-900">{commander.name}</p>
                      <p class="text-sm text-gray-600">
                        {commander.totalGames} games • {commander.winRate}% win
                        rate
                      </p>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </main>

    <Footer />
  </div>
</ProtectedRoute>
