<script setup>
import { RouterView } from 'vue-router'
import ToastContainer from './components/ToastContainer.vue' // 👈 Import
</script>

<template>
  <RouterView />
  <ToastContainer /> </template>