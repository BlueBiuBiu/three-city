<template>
  <div class="three-city"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { initScene, initSkyBox } from '../hooks/initForThree'

onMounted(async () => {
  const { scene, camera } = initScene(document.querySelector('.three-city')!)
  // const box = initSkyBox('../assets/imgs/white-bg.png', 5000)
  // scene.add(box)
})
</script>
