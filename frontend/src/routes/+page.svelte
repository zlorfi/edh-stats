<script>
  import { onMount } from "svelte";
  import { auth } from "$stores/auth";

  let allowRegistration = true;
  let activeSlide = 0;
  let slideshowInterval;

  const slides = [
    { src: "/images/commanders.png", alt: "Commanders management screenshot" },
    { src: "/images/logs.png", alt: "Game log screenshot" },
    { src: "/images/stats.png", alt: "Statistics dashboard screenshot" },
    { src: "/images/timer.png", alt: "Round timer screenshot" },
  ];

  function nextSlide() {
    activeSlide = (activeSlide + 1) % slides.length;
  }

  function goToSlide(index) {
    const newIndex = (index + slides.length) % slides.length;
    activeSlide = newIndex;
    resetInterval();
  }

  function resetInterval() {
    clearInterval(slideshowInterval);
    slideshowInterval = setInterval(nextSlide, 6000);
  }

  onMount(() => {
    (async () => {
      await auth.checkRegistrationConfig();
    })();

    const unsubscribe = auth.subscribe(($auth) => {
      allowRegistration = $auth.allowRegistration;
    });

    slideshowInterval = setInterval(nextSlide, 6000);

    return () => {
      unsubscribe();
      clearInterval(slideshowInterval);
    };
  });
</script>

<svelte:head>
  <title>EDH Stats Tracker</title>
  <meta
    name="description"
    content="Track your Magic: The Gathering EDH/Commander games and statistics"
  />
</svelte:head>

<div class="min-h-full flex flex-col py-12 px-4 sm:px-6 lg:px-8">
  <div class="flex items-center justify-center flex-1">
    <div class="w-full space-y-8 text-center">
      <div class="max-w-md mx-auto">
        <h1 class="text-4xl font-bold font-mtg text-edh-primary mb-4">
          EDH Stats
        </h1>
        <p class="text-xl text-gray-600 mb-8">
          Track your Commander games and statistics
        </p>

        <div class="space-y-4">
          <a href="/login" class="btn btn-primary w-full block"
            >Login to Track Games</a
          >
          {#if allowRegistration}
            <a href="/register" class="btn btn-secondary w-full block"
              >Create New Account</a
            >
          {/if}
        </div>
      </div>

      <!-- Slideshow -->
      <div class="mt-12 max-w-4xl mx-auto">
        <div class="carousel">
          {#each slides as slide, index}
            <figure
              class="carousel-slide {index === activeSlide ? 'is-active' : ''}"
            >
              <img src={slide.src} alt={slide.alt} loading="lazy" />
            </figure>
          {/each}
          <div class="carousel-dots">
            {#each slides as _, dotIndex}
              <button
                class:active-dot={dotIndex === activeSlide}
                aria-label={`Go to slide ${dotIndex + 1}`}
                on:click={() => goToSlide(dotIndex)}
              ></button>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .carousel {
    position: relative;
    overflow: hidden;
    border-radius: 1rem;
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
    max-width: 70%;
    margin-left: auto;
    margin-right: auto;
  }

  .carousel-slide {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 700ms ease;
    margin: 0;
    pointer-events: none;
  }

  .carousel-slide.is-active {
    opacity: 1;
    position: relative;
  }

  .carousel-slide img {
    width: 100%;
    display: block;
  }

  .carousel-dots {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 0;
  }

  .carousel-dots button {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 9999px;
    border: none;
    background: #d1d5db;
  }

  .carousel-dots button.active-dot {
    background: #4338ca;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
