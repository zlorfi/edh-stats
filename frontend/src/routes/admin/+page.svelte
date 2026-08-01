<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { authenticatedFetch, currentUser } from "$stores/auth";
  import NavBar from "$components/NavBar.svelte";
  import ProtectedRoute from "$components/ProtectedRoute.svelte";
  import Footer from "$components/Footer.svelte";

  let users = [];
  let loading = true;
  let serverError = "";

  let allowRegistration = false;
  let registrationLoading = true;
  let registrationSaving = false;

  async function loadUsers() {
    loading = true;
    serverError = "";
    try {
      const response = await authenticatedFetch("/api/auth/admin/users");
      if (response.ok) {
        const data = await response.json();
        users = data.users || [];
      } else if (response.status === 403) {
        // Not an admin - send them back to the dashboard.
        goto("/dashboard");
      } else {
        serverError = "Failed to load users.";
      }
    } catch (error) {
      if (error.message !== "Authentication required") {
        serverError = "Failed to load users.";
      }
    } finally {
      loading = false;
    }
  }

  async function loadRegistrationSetting() {
    registrationLoading = true;
    try {
      const response = await authenticatedFetch(
        "/api/auth/admin/settings/registration",
      );
      if (response.ok) {
        const data = await response.json();
        allowRegistration = data.allowRegistration;
      }
    } catch (error) {
      if (error.message !== "Authentication required") {
        serverError = "Failed to load registration setting.";
      }
    } finally {
      registrationLoading = false;
    }
  }

  async function toggleRegistration() {
    const next = !allowRegistration;
    registrationSaving = true;
    serverError = "";
    try {
      const response = await authenticatedFetch(
        "/api/auth/admin/settings/registration",
        {
          method: "PUT",
          body: JSON.stringify({ allowRegistration: next }),
        },
      );
      if (response.ok) {
        const data = await response.json();
        allowRegistration = data.allowRegistration;
      } else {
        serverError = "Failed to update registration setting.";
      }
    } catch (error) {
      if (error.message !== "Authentication required") {
        serverError = "Failed to update registration setting.";
      }
    } finally {
      registrationSaving = false;
    }
  }

  function formatDate(value) {
    if (!value) return "\u2014";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "\u2014" : d.toLocaleDateString();
  }

  onMount(() => {
    loadUsers();
    loadRegistrationSetting();
  });
</script>

<ProtectedRoute>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <NavBar />

    <main class="container mx-auto px-4 py-8 max-w-4xl flex-1">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">Admin</h1>

      {#if serverError}
        <div class="rounded-md bg-red-50 p-4 mb-6">
          <p class="text-sm font-medium text-red-800">{serverError}</p>
        </div>
      {/if}

      <!-- Registration toggle -->
      <div class="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-900">New user registration</p>
          <p class="text-xs text-gray-500">
            {#if registrationLoading}
              Loading…
            {:else if allowRegistration}
              New users can currently sign up.
            {:else}
              Sign-ups are currently disabled.
            {/if}
          </p>
        </div>
        <button
          type="button"
          on:click={toggleRegistration}
          disabled={registrationLoading || registrationSaving}
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 {allowRegistration
            ? 'bg-indigo-600'
            : 'bg-gray-300'}"
          role="switch"
          aria-checked={allowRegistration}
          aria-label="Toggle new user registration"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {allowRegistration
              ? 'translate-x-6'
              : 'translate-x-1'}"
          ></span>
        </button>
      </div>

      {#if loading}
        <div class="flex items-center justify-center py-16">
          <div class="loading-spinner w-12 h-12"></div>
        </div>
      {:else}
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Username
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Admin
                  </th>
                  <th
                    class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Commanders
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each users as user (user.id)}
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">
                      {user.username}
                      {#if user.id === $currentUser?.id}
                        <span class="text-xs text-gray-400">(you)</span>
                      {/if}
                    </td>
                    <td class="px-4 py-3 text-sm">
                      {#if user.isAdmin}
                        <span
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-medium"
                        >
                          Admin
                        </span>
                      {:else}
                        <span class="text-gray-400 text-xs">&mdash;</span>
                      {/if}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-900 text-right">
                      {user.commanderCount}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                {/each}
                {#if users.length === 0}
                  <tr>
                    <td
                      colspan="4"
                      class="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      No users found.
                    </td>
                  </tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>

        <p class="mt-4 text-sm text-gray-500">
          {users.length} user{users.length === 1 ? "" : "s"} total
        </p>
      {/if}
    </main>

    <Footer />
  </div>
</ProtectedRoute>
