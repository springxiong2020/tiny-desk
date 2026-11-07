<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppSidebar from "./AppSidebar.vue";
import AppHeader from "./AppHeader.vue";
import AppFooter from "./AppFooter.vue";

const route = useRoute();
// 宽屏侧栏常驻；窄屏侧栏改为抽屉，menuOpen 只控制抽屉是否展开。
const menuOpen = ref(false);
// 与 main.css 中的响应式断点保持一致，初次渲染就使用正确的屏幕状态。
const media = window.matchMedia("(max-width: 960px)");
const narrow = ref(media.matches);

// 子组件通过 defineExpose 暴露操作入口：顶栏提供 focusMenu，侧栏提供根元素 element。
const header = ref<InstanceType<typeof AppHeader> | null>(null);
const sidebar = ref<InstanceType<typeof AppSidebar> | null>(null);

function syncWidth() {
  narrow.value = media.matches;
  // 切回宽屏时重置抽屉，避免再次缩窄窗口后菜单自动展开。
  if (!narrow.value) menuOpen.value = false;
}

function closeMenu() {
  menuOpen.value = false;
  // 关闭后将键盘焦点还给打开菜单的按钮，方便继续操作。
  header.value?.focusMenu();
}

function onKeydown(event: KeyboardEvent) {
  // 只有窄屏抽屉展开时才接管键盘，桌面侧栏使用浏览器默认行为。
  if (!menuOpen.value || !narrow.value) return;
  if (event.key === "Escape") closeMenu();
  if (event.key === "Tab") {
    const items =
      sidebar.value?.element?.querySelectorAll<HTMLElement>("a, button");
    if (!items?.length) return;
    const first = items[0]!,
      last = items[items.length - 1]!;
    // 在首尾循环焦点：Shift+Tab 从第一项跳到最后，Tab 从最后跳到第一。
    // 防止焦点离开抽屉；新增其他类型的可聚焦控件时，需同步扩展上面的选择器。
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

onMounted(() => {
  syncWidth();
  media.addEventListener("change", syncWidth);
  document.addEventListener("keydown", onKeydown);
});
onUnmounted(() => {
  // 布局卸载时移除全局监听，避免重复注册或残留事件处理。
  media.removeEventListener("change", syncWidth);
  document.removeEventListener("keydown", onKeydown);
});

watch(menuOpen, async (open) => {
  if (open) {
    // 等 Vue 更新抽屉的显示状态及 inert 属性后，再聚焦第一个导航链接。
    await nextTick();
    // 等待期间可能已经关闭菜单或切到宽屏，需重新确认状态。
    if (menuOpen.value && narrow.value) {
      sidebar.value?.element?.querySelector<HTMLElement>("a")?.focus();
    }
  }
});

// 点击导航或通过浏览器前进、后退切换页面后，自动收起抽屉。
watch(
  () => route.path,
  () => {
    menuOpen.value = false;
  },
);
</script>

<template>
  <!-- 键盘用户可直接跳过导航；main 的 tabindex="-1" 允许聚焦但不参与 Tab 顺序。 -->
  <a class="skip-link" href="#main-content">跳至内容</a>
  <div class="app-shell">
    <!-- 遮罩覆盖背景内容，点击可关闭抽屉。 -->
    <button
      v-if="menuOpen"
      class="sidebar-backdrop"
      aria-label="关闭导航"
      @click="closeMenu"
    ></button>
    <AppSidebar
      ref="sidebar"
      :menu-open="menuOpen"
      :narrow="narrow"
      @close="closeMenu"
    />
    <!-- 抽屉展开时，inert 禁止背景区域接收点击和焦点，并将其移出无障碍树。 -->
    <div class="main-shell" :inert="narrow && menuOpen">
      <AppHeader
        ref="header"
        :menu-open="menuOpen"
        @open-menu="menuOpen = true"
      />
      <main id="main-content" tabindex="-1">
        <!-- App.vue 将 RouterView 传入这里；布局本身不依赖具体工具页面。 -->
        <slot />
      </main>
      <AppFooter />
    </div>
  </div>
</template>
