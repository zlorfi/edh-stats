<script>
  import { auth, currentUser } from "$stores/auth";
  import { authenticatedFetch } from "$stores/auth";
  import NavBar from "$components/NavBar.svelte";
  import ProtectedRoute from "$components/ProtectedRoute.svelte";
  import Footer from "$components/Footer.svelte";

  let usernameLoading = false;
  let passwordLoading = false;
  let deleteLoading = false;
  let usernameError = "";
  let usernameSuccess = "";
  let passwordError = "";
  let passwordSuccess = "";
  let deleteError = "";
  let showPasswordForm = false;
  let showUsernameForm = false;
  let showDeleteConfirm = false;
  let deleteConfirmText = "";

  let newUsername = "";

  let passwordData = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };

  let errors = {};

  function validateUsername() {
    errors = {};

    if (!newUsername) {
      errors.username = "Username is required";
      return false;
    }

    if (newUsername.length < 3) {
      errors.username = "Username must be at least 3 characters";
      return false;
    }

    if (newUsername.length > 50) {
      errors.username = "Username must be less than 50 characters";
      return false;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(newUsername)) {
      errors.username =
        "Username can only contain letters, numbers, underscores, and hyphens";
      return false;
    }

    if (newUsername === $currentUser?.username) {
      errors.username = "New username must be different from current username";
      return false;
    }

    return true;
  }

  async function handleUpdateUsername(e) {
    e.preventDefault();
    usernameError = "";
    usernameSuccess = "";

    if (!validateUsername()) return;

    usernameLoading = true;
    try {
      const response = await authenticatedFetch("/api/auth/update-username", {
        method: "PUT",
        body: JSON.stringify({
          newUsername: newUsername.toLowerCase().trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        usernameSuccess = "Username updated successfully!";

        // Update the auth store with new user data
        auth.updateUser(data.user);

        newUsername = "";
        showUsernameForm = false;
      } else {
        const errorData = await response.json();
        usernameError = errorData.message || "Failed to update username";
      }
    } catch (error) {
      console.error("Update username error:", error);
      usernameError = "Network error occurred";
    } finally {
      usernameLoading = false;
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== $currentUser?.username) return;

    deleteLoading = true;
    deleteError = "";
    try {
      const response = await authenticatedFetch("/api/auth/me", {
        method: "DELETE",
      });

      if (response.ok) {
        // Logout clears the store and redirects to /login
        auth.logout();
      } else {
        const errorData = await response.json();
        deleteError = errorData.message || "Failed to delete account";
      }
    } catch (error) {
      console.error("Delete account error:", error);
      deleteError = "Network error occurred";
    } finally {
      deleteLoading = false;
    }
  }

  function validatePasswords() {
    errors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])/.test(passwordData.newPassword)) {
      errors.newPassword =
        "Password must contain at least one lowercase letter";
    } else if (!/(?=.*[A-Z])/.test(passwordData.newPassword)) {
      errors.newPassword =
        "Password must contain at least one uppercase letter";
    } else if (!/(?=.*\d)/.test(passwordData.newPassword)) {
      errors.newPassword = "Password must contain at least one number";
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    return Object.keys(errors).length === 0;
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    passwordError = "";
    passwordSuccess = "";

    if (!validatePasswords()) return;

    passwordLoading = true;
    try {
      const response = await authenticatedFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        passwordSuccess = "Password changed successfully!";
        passwordData = {
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        };
        showPasswordForm = false;
      } else {
        const errorData = await response.json();
        passwordError = errorData.message || "Failed to change password";
      }
    } catch (error) {
      console.error("Change password error:", error);
      passwordError = "Network error occurred";
    } finally {
      passwordLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Profile - EDH Stats Tracker</title>
  <meta name="description" content="Manage your profile and settings" />
</svelte:head>

<ProtectedRoute>
  <div class="min-h-screen bg-gray-50">
    <NavBar />

    <main class="container mx-auto px-4 py-8 max-w-2xl">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">Profile Settings</h1>

      <!-- Global Success Messages -->
      {#if usernameSuccess && !showUsernameForm}
        <div class="rounded-md bg-green-50 p-4 mb-6">
          <p class="text-sm font-medium text-green-800">{usernameSuccess}</p>
        </div>
      {/if}

      {#if passwordSuccess && !showPasswordForm}
        <div class="rounded-md bg-green-50 p-4 mb-6">
          <p class="text-sm font-medium text-green-800">{passwordSuccess}</p>
        </div>
      {/if}

      <!-- User Info -->
      <div class="card mb-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Account Information</h2>
          {#if !showUsernameForm}
            <button
              on:click={() => {
                showUsernameForm = true;
                newUsername = $currentUser?.username || "";
                usernameError = "";
                usernameSuccess = "";
                errors = {};
              }}
              class="btn btn-primary btn-sm"
            >
              Edit Username
            </button>
          {/if}
        </div>

        {#if showUsernameForm}
          <form on:submit={handleUpdateUsername} class="space-y-4 mb-4">
            <div>
              <label
                for="newUsername"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                New Username
              </label>
              <input
                id="newUsername"
                type="text"
                bind:value={newUsername}
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 {errors.username
                  ? 'border-red-500'
                  : ''}"
                placeholder="Enter new username"
              />
              {#if errors.username}
                <p class="mt-1 text-sm text-red-600">{errors.username}</p>
              {/if}
              <p class="mt-1 text-xs text-gray-500">
                3-50 characters, letters, numbers, underscores, and hyphens only
              </p>
            </div>

            {#if usernameSuccess}
              <div class="rounded-md bg-green-50 p-4">
                <p class="text-sm font-medium text-green-800">
                  {usernameSuccess}
                </p>
              </div>
            {/if}

            {#if usernameError}
              <div class="rounded-md bg-red-50 p-4">
                <p class="text-sm font-medium text-red-800">{usernameError}</p>
              </div>
            {/if}

            <div class="flex gap-3">
              <button
                type="submit"
                disabled={usernameLoading}
                class="flex-1 btn btn-primary disabled:opacity-50"
              >
                {#if usernameLoading}
                  <div class="loading-spinner w-5 h-5 mx-auto"></div>
                {:else}
                  Update Username
                {/if}
              </button>
              <button
                type="button"
                on:click={() => {
                  showUsernameForm = false;
                  newUsername = "";
                  errors = {};
                  usernameError = "";
                }}
                class="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        {/if}

        <div class="space-y-3">
          <div>
            <p class="text-sm text-gray-600">Current Username</p>
            <p class="text-lg font-medium text-gray-900">
              {$currentUser?.username || "User"}
            </p>
          </div>
          {#if $currentUser?.email}
            <div>
              <p class="text-sm text-gray-600">Email</p>
              <p class="text-lg font-medium text-gray-900">
                {$currentUser.email}
              </p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Change Password -->
      <div class="card">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Change Password</h2>
          {#if !showPasswordForm}
            <button
              on:click={() => {
                showPasswordForm = true;
                passwordError = "";
                passwordSuccess = "";
                errors = {};
              }}
              class="btn btn-primary btn-sm"
            >
              Change Password
            </button>
          {/if}
        </div>

        {#if showPasswordForm}
          <form on:submit={handleChangePassword} class="space-y-4">
            <div>
              <label
                for="currentPassword"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                bind:value={passwordData.currentPassword}
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 {errors.currentPassword
                  ? 'border-red-500'
                  : ''}"
              />
              {#if errors.currentPassword}
                <p class="mt-1 text-sm text-red-600">
                  {errors.currentPassword}
                </p>
              {/if}
            </div>

            <div>
              <label
                for="newPassword"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                bind:value={passwordData.newPassword}
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 {errors.newPassword
                  ? 'border-red-500'
                  : ''}"
              />
              {#if errors.newPassword}
                <p class="mt-1 text-sm text-red-600">{errors.newPassword}</p>
              {:else}
                <p class="mt-1 text-xs text-gray-500">
                  At least 8 characters with uppercase, lowercase, and a number
                </p>
              {/if}
            </div>

            <div>
              <label
                for="confirmPassword"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                bind:value={passwordData.confirmPassword}
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 {errors.confirmPassword
                  ? 'border-red-500'
                  : ''}"
              />
              {#if errors.confirmPassword}
                <p class="mt-1 text-sm text-red-600">
                  {errors.confirmPassword}
                </p>
              {/if}
            </div>

            {#if passwordSuccess}
              <div class="rounded-md bg-green-50 p-4">
                <p class="text-sm font-medium text-green-800">
                  {passwordSuccess}
                </p>
              </div>
            {/if}

            {#if passwordError}
              <div class="rounded-md bg-red-50 p-4">
                <p class="text-sm font-medium text-red-800">{passwordError}</p>
              </div>
            {/if}

            <div class="flex gap-3">
              <button
                type="submit"
                disabled={passwordLoading}
                class="flex-1 btn btn-primary disabled:opacity-50"
              >
                {#if passwordLoading}
                  <div class="loading-spinner w-5 h-5 mx-auto"></div>
                {:else}
                  Update Password
                {/if}
              </button>
              <button
                type="button"
                on:click={() => {
                  showPasswordForm = false;
                  passwordData = {
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  };
                  errors = {};
                }}
                class="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        {/if}
      </div>

      <!-- Danger Zone -->
      <div class="card mt-6 border border-red-200">
        <h2 class="text-xl font-bold text-red-600 mb-4">Danger Zone</h2>
        <p class="text-sm text-gray-600 mb-4">
          Permanently delete your account and all associated data including
          games, commanders, and statistics. This action cannot be undone.
        </p>
        <button
          class="btn btn-danger"
          on:click={() => {
            showDeleteConfirm = true;
            deleteError = "";
            deleteConfirmText = "";
          }}
        >
          Delete Account
        </button>
      </div>

      <!-- Delete Confirmation Modal -->
      {#if showDeleteConfirm}
        <div
          class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
        >
          <button
            class="absolute inset-0 w-full h-full cursor-default"
            aria-label="Close dialog"
            on:click={() => !deleteLoading && (showDeleteConfirm = false)}
          ></button>
          <div class="relative bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-bold text-gray-900 mb-2">Delete Account</h3>
            <p class="text-gray-600 mb-4">
              This will permanently delete your account and all your data. This
              action <strong>cannot be undone</strong>.
            </p>
            <p class="text-sm text-gray-700 mb-2">
              Type your username <strong>{$currentUser?.username}</strong> to confirm:
            </p>
            <input
              type="text"
              bind:value={deleteConfirmText}
              placeholder="Enter your username"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 mb-4"
            />

            {#if deleteError}
              <div class="rounded-md bg-red-50 p-3 mb-4">
                <p class="text-sm font-medium text-red-800">{deleteError}</p>
              </div>
            {/if}

            <div class="flex gap-3">
              <button
                on:click={handleDeleteAccount}
                disabled={deleteLoading ||
                  deleteConfirmText !== $currentUser?.username}
                class="flex-1 btn btn-danger disabled:opacity-50"
              >
                {#if deleteLoading}
                  <div class="loading-spinner w-5 h-5 mx-auto"></div>
                {:else}
                  Delete My Account
                {/if}
              </button>
              <button
                on:click={() => {
                  showDeleteConfirm = false;
                  deleteConfirmText = "";
                  deleteError = "";
                }}
                disabled={deleteLoading}
                class="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      {/if}
    </main>

    <Footer />
  </div>
</ProtectedRoute>
