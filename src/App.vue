<script setup>
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner' // 👈 Import the new library
</script>

<template>
  <RouterView />
  
  <Toaster position="top-center" richColors closeButton /> 
</template>