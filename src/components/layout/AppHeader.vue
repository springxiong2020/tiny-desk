<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";
import { Menu, ChevronRight, Moon, Sun, Github } from "lucide-vue-next";
import { theme, toggleTheme } from "../../app/theme";

defineProps<{ menuOpen: boolean }>();
const emit = defineEmits<{ openMenu: [] }>();
const route = useRoute();
const githubUrl = "https://github.com/springxiong2020/tiny-desk";
const menuButton = ref<HTMLButtonElement | null>(null);
defineExpose({ focusMenu: () => menuButton.value?.focus() });
</script>

<template>
  <header class="topbar">
    <div class="shell-container topbar-inner">
      <div class="breadcrumb">
        <button
          ref="menuButton"
          class="icon-button mobile-menu"
          :aria-expanded="menuOpen"
          aria-label="打开导航"
          @click="emit('openMenu')"
        >
          <Menu :size="21" />
        </button>
        <RouterLink v-if="route.path !== '/'" to="/" class="breadcrumb-root"
          >工作台</RouterLink
        >
        <ChevronRight
          v-if="route.path !== '/'"
          :size="14"
          class="breadcrumb-root"
        />
        <span>{{ route.meta.title }}</span>
      </div>

      <div class="topbar-actions">
        <button
          class="shell-action"
          :aria-label="theme === 'dark' ? '切换为浅色主题' : '切换为深色主题'"
          :title="theme === 'dark' ? '切换为浅色主题' : '切换为深色主题'"
          :aria-pressed="theme === 'dark'"
          @click="toggleTheme"
        >
          <Sun v-if="theme === 'dark'" :size="17" />
          <Moon v-else :size="17" />
          <span class="action-label">{{
            theme === "dark" ? "深色" : "浅色"
          }}</span>
        </button>
        <a
          class="shell-action"
          :href="githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="在新标签页打开 GitHub 仓库"
          title="GitHub 仓库"
        >
          <Github :size="17" /><span class="action-label">GitHub</span>
        </a>
      </div>
    </div>
  </header>
</template>
