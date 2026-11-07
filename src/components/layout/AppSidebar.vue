<script setup lang="ts">
import { ref } from "vue";
import { LayoutGrid, DatabaseBackup, X } from "lucide-vue-next";
import { tools } from "../../app/router";

defineProps<{ menuOpen: boolean; narrow: boolean }>();
const emit = defineEmits<{ close: [] }>();
const element = ref<HTMLElement | null>(null);
const logoUrl = `${import.meta.env.BASE_URL}logo.svg`;
defineExpose({ element });
</script>

<template>
  <aside
    ref="element"
    :inert="narrow && !menuOpen"
    class="sidebar"
    :class="{ open: menuOpen }"
    aria-label="主导航"
  >
    <RouterLink class="brand" to="/">
      <span class="brand-symbol">
        <img :src="logoUrl" width="40" height="40" alt="" />
      </span>
      <span><strong>小桌</strong><small>TinyDesk</small></span>
    </RouterLink>

    <button
      class="mobile-close icon-button"
      aria-label="关闭导航"
      @click="emit('close')"
    >
      <X :size="20" />
    </button>

    <nav class="main-nav">
      <RouterLink class="nav-item" to="/" exact-active-class="selected">
        <LayoutGrid :size="19" />工作台
      </RouterLink>
      <p class="nav-caption">工具列表</p>
      <RouterLink
        v-for="tool in tools"
        :key="tool.id"
        class="nav-item"
        :to="tool.path"
        active-class="selected"
      >
        <component :is="tool.icon" :size="19" />{{ tool.name }}
      </RouterLink>
    </nav>

    <div class="sidebar-bottom">
      <RouterLink class="nav-item" to="/backup" active-class="selected">
        <DatabaseBackup :size="19" />备份与恢复
      </RouterLink>
    </div>
  </aside>
</template>
