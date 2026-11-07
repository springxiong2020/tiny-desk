<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Compass,
  Search,
  X,
  ArrowUpRight,
  Pin,
  RefreshCw,
  Globe2,
} from "lucide-vue-next";
import {
  defaults,
  normalizeCatalog,
  selectSites,
  validatePreferences,
  STORAGE_KEY,
  ENDPOINT,
  type Preferences,
  type Catalog,
} from "./sites";
import "./sites.css";

const route = useRoute(),
  router = useRouter();
const catalog = ref<Catalog>({ categories: [], sites: [] }),
  prefs = ref(defaults());
const search = ref<HTMLInputElement | null>(null);
const error = ref(""),
  status = ref(""),
  loading = ref(true),
  notice = ref("");
const loadError = ref("");
const failedIcons = ref(new Set<string>());
let recoveryRequired = false;
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) prefs.value = validatePreferences(JSON.parse(raw));
} catch {
  recoveryRequired = true;
  error.value =
    "本地偏好读取失败。原数据未改动，请前往“备份与恢复”导入全量备份后继续";
}
const query = computed(() =>
  typeof route.query.q === "string" ? route.query.q : "",
);
const category = computed(() =>
  typeof route.query.category === "string" &&
  catalog.value.categories.some((c) => c.id === route.query.category)
    ? route.query.category
    : "all",
);
const visible = computed(() =>
  selectSites(catalog.value, prefs.value, category.value, query.value),
);
const activeName = computed(
  () =>
    catalog.value.categories.find((c) => c.id === category.value)?.name ??
    (prefs.value.visitedOnly ? "访问过的" : "全部网站"),
);
function updateQuery(value: string) {
  void router.replace({ query: { ...route.query, q: value || undefined } });
}
function clearFilters() {
  void router.push({ query: {} });
  if (prefs.value.visitedOnly) save({ ...prefs.value, visitedOnly: false });
}
function changeCategory(id: string) {
  void router.push({
    query: { ...route.query, category: id === "all" ? undefined : id },
  });
}
function save(next: Preferences) {
  if (recoveryRequired) {
    error.value =
      "请先前往“备份与恢复”导入全量备份，避免覆盖无法读取的原记录";
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    prefs.value = next;
    recoveryRequired = false;
    error.value = "";
    return true;
  } catch {
    error.value =
      "本地保存失败。请检查浏览器存储权限或剩余空间；网站仍可正常打开";
    return false;
  }
}
function visit(id: string) {
  const count = prefs.value.visits[id] ?? 0;
  if (count < Number.MAX_SAFE_INTEGER)
    save({
      ...prefs.value,
      visits: { ...prefs.value.visits, [id]: count + 1 },
    });
}
function pin(id: string) {
  const pinned = prefs.value.pinned.includes(id)
    ? prefs.value.pinned.filter((v) => v !== id)
    : [...prefs.value.pinned, id];
  if (save({ ...prefs.value, pinned }))
    notice.value = pinned.includes(id) ? "已置顶网站" : "已取消置顶";
}
function hostname(href: string) {
  return new URL(href).hostname;
}
function iconUrl(icon: string) {
  return icon.startsWith("sites/")
    ? `${import.meta.env.BASE_URL}${icon}`
    : icon;
}
let controller: AbortController | undefined;
async function refresh() {
  if (controller) return;
  loading.value = true;
  loadError.value = "";
  notice.value = "";
  catalog.value = { categories: [], sites: [] };
  controller = new AbortController();
  const timer = setTimeout(() => controller?.abort(), 8000);
  try {
    const response = await fetch(ENDPOINT, {
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) throw new Error("加载失败");
    const result = await response.json();
    if (result.code !== 0) throw new Error("接口返回异常");
    catalog.value = normalizeCatalog(result.data);
    failedIcons.value = new Set();
    status.value = "已更新在线目录";
  } catch {
    loadError.value = "网址目录加载失败，请检查网络后重试";
    status.value = "";
  } finally {
    clearTimeout(timer);
    loading.value = false;
    controller = undefined;
  }
}
function onKey(event: KeyboardEvent) {
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "k" &&
    !document.querySelector(".sidebar.open")
  ) {
    event.preventDefault();
    search.value?.focus();
  }
  if (event.key === "Escape" && document.activeElement === search.value) {
    updateQuery("");
    search.value?.blur();
  }
}
onMounted(() => {
  void refresh();
  document.addEventListener("keydown", onKey);
});
onUnmounted(() => {
  controller?.abort();
  document.removeEventListener("keydown", onKey);
});
</script>

<template>
  <div class="page sites-page">
    <div class="page-heading sites-heading">
      <div>
        <div class="sites-title">
          <Compass :size="27" />
          <h1>网址导航</h1>
        </div>
        <p class="page-description">好网站，放在顺手的地方</p>
      </div>
    </div>
    <div v-if="error" class="sites-alert" role="alert">
      {{ error
      }}<button aria-label="关闭错误提示" @click="error = ''">
        <X :size="16" />
      </button>
    </div>
    <div
      v-if="loading"
      class="sites-empty"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <RefreshCw :size="30" />
      <h2>正在加载网址目录…</h2>
      <p>正在从接口获取分类和网站</p>
    </div>
    <div v-else-if="loadError" class="sites-empty" role="alert">
      <Globe2 :size="34" />
      <h2>暂时无法加载目录</h2>
      <p>{{ loadError }}</p>
      <button class="sites-button" @click="refresh">重新加载</button>
    </div>
    <template v-else>
      <div class="sites-search">
        <Search :size="19" /><input
          ref="search"
          type="search"
          :value="query"
          placeholder="搜索网站名称、介绍或网址"
          aria-label="搜索网站名称、介绍或网址"
          @input="updateQuery(($event.target as HTMLInputElement).value)"
        /><button
          v-if="query"
          class="sites-clear"
          aria-label="清空搜索"
          @click="
            updateQuery('');
            search?.focus();
          "
        >
          <X :size="17" /></button
        ><kbd v-else>Ctrl / ⌘ K</kbd>
      </div>
      <nav class="sites-categories" aria-label="网站分类">
        <button
          :class="{ selected: category === 'all' }"
          :aria-pressed="category === 'all'"
          @click="changeCategory('all')"
        >
          全部网站<span>{{ catalog.sites.length }}</span></button
        ><button
          v-for="c in catalog.categories"
          :key="c.id"
          :class="{ selected: category === c.id }"
          :aria-pressed="category === c.id"
          @click="changeCategory(c.id)"
        >
          {{ c.name
          }}<span>{{
            catalog.sites.filter((s) => s.category === c.id).length
          }}</span>
        </button>
      </nav>
      <div class="sites-result-bar">
        <div>
          <h2>{{ activeName }}</h2>
          <span
            >{{ visible.length }} 个网站<span v-if="query"
              >，搜索“{{ query }}”</span
            ></span
          >
        </div>
        <label v-if="category === 'all'" class="sites-visited"
          ><input
            type="checkbox"
            :checked="prefs.visitedOnly"
            @change="
              save({
                ...prefs,
                visitedOnly: ($event.target as HTMLInputElement).checked,
              })
            "
          />只看访问过的</label
        >
      </div>
      <div v-if="visible.length" class="sites-grid">
        <article
          v-for="site in visible"
          :key="site.id"
          class="site-card"
          :class="{ pinned: prefs.pinned.includes(site.id) }"
        >
          <a
            class="site-link"
            :href="site.href"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`${site.name}，在新标签页打开`"
            @click="visit(site.id)"
            @auxclick="
              (e) => {
                if (e.button === 1) visit(site.id);
              }
            "
          >
            <div class="site-icon">
              <img
                v-if="site.icon && !failedIcons.has(site.id)"
                :src="iconUrl(site.icon)"
                alt=""
                loading="lazy"
                referrerpolicy="no-referrer"
                @error="failedIcons.add(site.id)"
              /><span v-else>{{ site.name.slice(0, 1) }}</span>
            </div>
            <div class="site-text">
              <h3>{{ site.name }}</h3>
              <p>{{ site.description || hostname(site.href) }}</p>
            </div>
            <ArrowUpRight :size="15" class="site-external" />
          </a>
          <div class="site-card-footer">
            <span>{{
              catalog.categories.find((c) => c.id === site.category)?.name
            }}</span
            ><span class="site-visits"
              >访问 {{ prefs.visits[site.id] ?? 0 }} 次</span
            ><button
              class="site-pin"
              :class="{ active: prefs.pinned.includes(site.id) }"
              :aria-label="`${prefs.pinned.includes(site.id) ? '取消置顶' : '置顶'} ${site.name}`"
              :aria-pressed="prefs.pinned.includes(site.id)"
              @click="pin(site.id)"
            >
              <Pin :size="14" />
            </button>
          </div>
        </article>
      </div>
      <div v-else class="sites-empty">
        <Globe2 :size="34" stroke-width="1.3" />
        <h2>
          {{
            !catalog.sites.length
              ? "目录暂无网站"
              : query
                ? "没有找到匹配的网站"
                : prefs.visitedOnly && category === "all"
                  ? "这里还没有访问记录"
                  : "这个分类暂无网站"
          }}
        </h2>
        <p>
          {{
            query
              ? "换个关键词，或清除筛选再试试"
              : prefs.visitedOnly && category === "all"
                ? "打开一个网站后，就能在这里快速找到它"
                : "切换其他分类，或更新目录后再试试"
          }}
        </p>
        <button class="sites-button" @click="clearFilters">查看全部网站</button>
      </div>
      <div class="sites-bottom">
        <span role="status"
          >{{ notice || status }} · 置顶优先，其次按访问次数排序</span
        ><button class="sites-text-button" :disabled="loading" @click="refresh">
          <RefreshCw :size="13" :class="{ spinning: loading }" />{{
            loading ? "更新中" : "更新目录"
          }}
        </button>
      </div>
    </template>
  </div>
</template>
