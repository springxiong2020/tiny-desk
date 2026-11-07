<script setup lang="ts">
const copyrightYear = new Date().getFullYear();
const appVersion = __APP_VERSION__;
</script>

<template>
  <footer class="footer">
    <div class="shell-container footer-inner">
      <span class="copyright"
        >© {{ copyrightYear }}
        <a
          href="https://springxiong.cn/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="春天熊的个人网站"
          >SpringXiong</a
        ></span
      >
      <div class="footer-meta">
        <span>TinyDesk <span class="version">v{{ appVersion }}</span></span>
      </div>
    </div>
  </footer>
</template>
