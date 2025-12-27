<template>
  <div class="global-bg">
    <!-- Aurora Gradient Mesh -->
    <div class="aurora">
      <div class="aurora-blob a1"></div>
      <div class="aurora-blob a2"></div>
      <div class="aurora-blob a3"></div>
      <div class="aurora-blob a4"></div>
    </div>

    <!-- Subtle vignette -->
    <div class="vignette"></div>
    
    <!-- Fine noise texture -->
    <div class="noise"></div>
  </div>
</template>

<script setup lang="ts">
// Pure CSS animation - zero JavaScript overhead
</script>

<style scoped>
.global-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background: linear-gradient(135deg, #fafbff 0%, #f0f4ff 50%, #fdf4ff 100%);
  pointer-events: none;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* AURORA GRADIENT MESH */
/* ═══════════════════════════════════════════════════════════════════════════ */

.aurora {
  position: absolute;
  inset: -30%;
  filter: blur(80px);
  opacity: 0.7;
}

.aurora-blob {
  position: absolute;
  border-radius: 50%;
}

.a1 {
  width: 60vmax;
  height: 60vmax;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.5) 0%, transparent 70%);
  top: -15%;
  left: -15%;
  animation: aurora-drift 20s ease-in-out infinite;
}

.a2 {
  width: 50vmax;
  height: 50vmax;
  background: radial-gradient(circle, rgba(244, 114, 182, 0.45) 0%, transparent 70%);
  bottom: -15%;
  right: -10%;
  animation: aurora-drift 25s ease-in-out infinite reverse;
  animation-delay: -5s;
}

.a3 {
  width: 45vmax;
  height: 45vmax;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%);
  top: 40%;
  right: 5%;
  animation: aurora-drift 30s ease-in-out infinite;
  animation-delay: -10s;
}

.a4 {
  width: 55vmax;
  height: 55vmax;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, transparent 70%);
  bottom: 0%;
  left: 15%;
  animation: aurora-drift 28s ease-in-out infinite reverse;
  animation-delay: -15s;
}

@keyframes aurora-drift {
  0%, 100% {
    transform: translate(0, 0) scale(1) rotate(0deg);
  }
  25% {
    transform: translate(8%, -5%) scale(1.05) rotate(3deg);
  }
  50% {
    transform: translate(-5%, 10%) scale(0.95) rotate(-2deg);
  }
  75% {
    transform: translate(10%, 5%) scale(1.08) rotate(4deg);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* OVERLAYS */
/* ═══════════════════════════════════════════════════════════════════════════ */

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 60% at 50% 40%,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 100%
  );
}

.noise {
  position: absolute;
  inset: 0;
  opacity: 0.015;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .aurora-blob {
    animation: none;
  }
  
  .aurora {
    opacity: 0.4;
  }
}
</style>
