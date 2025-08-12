<template>
  <div class="grid place-content-center h-screen gap-5">
    <ULink v-for="route in otherRoutes" :key="route.name" :to="route.path">{{ route.name }}</ULink>
  </div>
</template>

<script lang="ts" setup>
  const router = useRouter();
  const routes = router.getRoutes();
  const otherRoutes = routes.filter(route => route.name !== router.currentRoute.value.name)
  console.log(otherRoutes);


</script>

<style>

</style>