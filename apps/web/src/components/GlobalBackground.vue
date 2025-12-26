<template>
  <div class="global-animation-container">
    <div class="bokeh-field">
      <div class="bokeh bokeh-1"></div>
      <div class="bokeh bokeh-2"></div>
      <div class="bokeh bokeh-3"></div>
      <div class="bokeh bokeh-4"></div>
      <div class="bokeh bokeh-5"></div>
    </div>
    <div class="vignette"></div>
    <div class="noise-overlay"></div>
  </div>
</template>

<script setup lang="ts">
// Pure CSS implementation for smooth, atmospheric performance
</script>

<style scoped>
.global-animation-container {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background-color: #ffffff; /* Clean white canvas */
  pointer-events: none;
}

.bokeh-field {
  position: absolute;
  inset: -20%;
  filter: blur(150px);
  opacity: 0.45;
}

.bokeh {
  position: absolute;
  border-radius: 50%;
  mix-blend-mode: multiply;
  animation: bokeh-drift 40s ease-in-out infinite alternate;
}

.bokeh-1 {
  width: 90vw;
  height: 90vw;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.4), transparent 70%);
  top: -10%;
  left: -10%;
  animation-duration: 45s;
}

.bokeh-2 {
  width: 80vw;
  height: 80vw;
  background: radial-gradient(circle, rgba(244, 114, 182, 0.3), transparent 70%);
  bottom: -10%;
  right: -10%;
  animation-duration: 35s;
  animation-delay: -5s;
}

.bokeh-3 {
  width: 70vw;
  height: 70vw;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.25), transparent 70%);
  top: 20%;
  right: 15%;
  animation-duration: 50s;
  animation-delay: -10s;
}

.bokeh-4 {
  width: 60vw;
  height: 60vw;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent 70%);
  bottom: 15%;
  left: 10%;
  animation-duration: 42s;
  animation-delay: -15s;
}

.bokeh-5 {
  width: 100vw;
  height: 100vw;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.15), transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-duration: 60s;
  animation-delay: -20s;
}

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 30%, rgba(255, 255, 255, 0.8) 100%);
  pointer-events: none;
}

.noise-overlay {
  position: absolute;
  inset: 0;
  opacity: 0.02;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}

@keyframes bokeh-drift {
  0% { transform: translate(0, 0) scale(1) rotate(0deg); }
  50% { transform: translate(10%, 15%) scale(1.1) rotate(5deg); }
  100% { transform: translate(-5%, 8%) scale(0.9) rotate(-3deg); }
}
</style>
