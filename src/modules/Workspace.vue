<script setup lang="ts">
import { computed } from "vue";
import {
  STORAGE_KEY as TODO_KEY,
  validateData as validateTodo,
} from "./todo/todo";
import {
  STORAGE_KEY as PRAC_KEY,
  validateState as validatePrac,
  finishedCount,
  totalCount,
} from "./leetcode/leetcode";
import {
  ArrowUpRight,
  ArrowRight,
  Layers3,
  MousePointer2,
  FolderOpen,
} from "lucide-vue-next";
import { tools } from "../app/router";

const todos = computed(() => {
  try {
    const raw = localStorage.getItem(TODO_KEY);
    return raw ? validateTodo(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
});
const practice = computed(() => {
  try {
    const raw = localStorage.getItem(PRAC_KEY);
    return raw ? validatePrac(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
});
</script>

<template>
  <div class="page workspace">
    <div class="page-heading">
      <div>
        <h1>一张桌面，几件称手的小工具</h1>
        <p class="page-description">
          用 AI 一点点打造，把散落各处的实用小工具，收拢到自己的桌面上
        </p>
      </div>
      <span class="outline-emblem" aria-hidden="true">
        <Layers3 :size="34" stroke-width="1.2" />
      </span>
    </div>

    <div class="section-heading">
      <h2>从这里开始</h2>
      <span>{{ tools.length }} 件工具，慢慢添置</span>
    </div>
    <div class="tool-grid">
      <RouterLink
        v-for="tool in tools"
        :key="tool.id"
        :to="tool.path"
        class="tool-card"
        :class="tool.color"
      >
        <div class="tool-card-top">
          <span class="tool-icon">
            <component :is="tool.icon" :size="25" stroke-width="1.7" />
          </span>
          <ArrowUpRight :size="19" class="card-arrow" />
        </div>
        <h3>{{ tool.name }}</h3>
        <p>{{ tool.description }}</p>
        <div class="feature-list">
          <span v-for="feature in tool.features" :key="feature">{{
            feature
          }}</span>
        </div>
        <div class="card-action">
          {{ tool.action }}
          <ArrowRight :size="16" />
        </div>
      </RouterLink>
    </div>

    <section class="continuation">
      <div class="section-heading">
        <h2>接着上次的事</h2>
      </div>

      <div v-if="todos" class="lc-home-resume todo-home-resume">
        <div>
          <h3>待办事项</h3>
          <p>
            还有
            {{ todos.tasks.filter((t) => !t.completed).length }} 件待办，已完成
            {{ todos.tasks.filter((t) => t.completed).length }} 件
          </p>
        </div>
        <RouterLink to="/todo" class="text-link"
          >继续处理
          <ArrowRight :size="15" />
        </RouterLink>
      </div>

      <div v-if="practice" class="lc-home-resume">
        <div>
          <h3>力扣热题 · 第 {{ practice.round }} 轮</h3>
          <p>
            已完成 {{ finishedCount(practice) }}/{{
              totalCount(practice)
            }}
            题<span v-if="finishedCount(practice) < totalCount(practice)"
              >，下一题题号：{{
                practice.order.find((id) => !practice!.records[id]?.completed)
              }}</span
            ><span v-else>，本轮已全部完成</span>
          </p>
        </div>
        <RouterLink to="/leetcode" class="text-link"
          >继续刷题
          <ArrowRight :size="15" />
        </RouterLink>
      </div>

      <div v-if="!practice && !todos" class="empty-workspace">
        <span class="empty-art" aria-hidden="true">
          <FolderOpen :size="32" stroke-width="1.3" />
          <MousePointer2 class="pointer" :size="18" />
        </span>
        <h3>桌面已经备好</h3>
        <p>力扣热题已经准备好，从第一道题开始，进度会留在这里</p>
        <RouterLink to="/leetcode" class="text-link"
          >开始刷题
          <ArrowRight :size="15" />
        </RouterLink>
      </div>
    </section>

    <div class="workspace-note">
      <span class="note-mark">✓</span>
      <p>
        <strong>轻装上桌</strong
        ><span>无需注册，打开即用。个人记录与偏好仅保存在当前浏览器中，支持备份与恢复</span>
      </p>
    </div>
  </div>
</template>
