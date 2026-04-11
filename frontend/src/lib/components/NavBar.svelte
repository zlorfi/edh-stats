<script>
  import { auth, currentUser } from "$stores/auth";

  let userMenuOpen = false;
  let mobileMenuOpen = false;

  function handleLogout() {
    auth.logout();
  }

  function closeMenus() {
    userMenuOpen = false;
    mobileMenuOpen = false;
  }
</script>

<header class="bg-slate-900 text-white shadow-lg">
  <nav class="container mx-auto px-4 py-4">
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-4">
        <a
          href="/dashboard"
          class="text-2xl font-bold font-mtg hover:text-edh-accent"
        >
          EDH Stats
        </a>
        <div class="hidden md:flex space-x-6">
          <a
            href="/commanders"
            class="text-white hover:text-edh-accent transition-colors"
          >
            Commanders
          </a>
          <a
            href="/round-counter"
            class="text-white hover:text-edh-accent transition-colors"
          >
            Round timer
          </a>
          <a
            href="/games"
            class="text-white hover:text-edh-accent transition-colors"
          >
            Game Log
          </a>
        </div>
      </div>

      <div class="flex items-center space-x-4">
        <!-- User Menu -->
        <div class="relative">
          <button
            on:click|stopPropagation={() => (userMenuOpen = !userMenuOpen)}
            class="flex items-center space-x-2 hover:text-edh-accent"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              ></path>
            </svg>
            <span>{$currentUser?.username || "User"}</span>
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </button>

          {#if userMenuOpen}
            <ul
              role="menu"
              class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
            >
              <li role="none">
                <a
                  href="/profile"
                  role="menuitem"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  on:click|stopPropagation={closeMenus}
                >
                  Profile
                </a>
              </li>
              <li role="none"><hr class="my-1" /></li>
              <li role="none">
                <button
                  role="menuitem"
                  on:click|stopPropagation={handleLogout}
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Logout
                </button>
              </li>
            </ul>
          {/if}
        </div>

        <!-- Mobile Menu Button -->
        <button
          on:click={() => (mobileMenuOpen = !mobileMenuOpen)}
          class="md:hidden"
          aria-label="Toggle navigation menu"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            ></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Menu -->
    {#if mobileMenuOpen}
      <div class="md:hidden mt-4 pb-4 space-y-2">
        <a
          href="/commanders"
          class="block py-2 hover:text-edh-accent transition-colors"
          on:click={closeMenus}
        >
          Commanders
        </a>
        <a
          href="/round-counter"
          class="block py-2 hover:text-edh-accent transition-colors"
          on:click={closeMenus}
        >
          Round timer
        </a>
        <a
          href="/games"
          class="block py-2 hover:text-edh-accent transition-colors"
          on:click={closeMenus}
        >
          Game Log
        </a>
      </div>
    {/if}
  </nav>
</header>

<svelte:window
  on:click={() => {
    if (userMenuOpen) userMenuOpen = false;
  }}
/>
