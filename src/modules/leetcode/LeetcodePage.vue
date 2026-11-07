<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import {
  ArrowUpRight,
  Check,
  Shuffle,
  RotateCcw,
  Trophy,
  CodeXml,
  Clock3,
} from "lucide-vue-next";
import {
  STORAGE_KEY,
  freshState,
  validateState,
  finishedCount,
  currentProblem,
  elapsedDays,
  shuffle,
  fetchProblems,
  type Problem,
  type PracticeState,
} from "./leetcode";
import "./leetcode.css";

const error = ref("");
const message = ref("");
const problems = ref<Problem[]>([]);
const loading = ref(true),
  loadError = ref(""),
  ready = ref(false);
let recoveryRequired = false;
const state = ref<PracticeState>({
  version: 1,
  round: 1,
  order: [],
  records: {},
  daysOffset: 0,
});
let controller: AbortController | undefined;

async function load() {
  if (controller) return;
  loading.value = true;
  loadError.value = "";
  ready.value = false;
  const request = new AbortController();
  controller = request;
  const timer = setTimeout(() => request.abort(), 10000);
  try {
    const fetched = await fetchProblems(request.signal);
    if (request.signal.aborted) throw new Error("题库请求已取消");
    problems.value = fetched;
    let loaded = freshState(fetched);
    recoveryRequired = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = validateState(JSON.parse(raw), fetched);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
    } catch {
      recoveryRequired = true;
      error.value =
        "无法读取或匹配保存的进度，原数据未改动。请检查浏览器存储权限、前往“备份与恢复”导入全量备份或明确重置后继续";
    }
    state.value = loaded;
    ready.value = true;
  } catch {
    loadError.value = "题库加载失败，请检查网络后重试";
  } finally {
    clearTimeout(timer);
    loading.value = false;
    controller = undefined;
  }
}
onMounted(() => {
  void load();
});
onUnmounted(() => controller?.abort());
const current = computed(() => currentProblem(state.value, problems.value));
const count = computed(() => finishedCount(state.value));
const days = computed(() => elapsedDays(state.value));
const sorted = computed(() => [...problems.value].sort((a, b) => a.id - b.id));
const completed = computed(() =>
  problems.value
    .filter((p) => state.value.records[p.id]?.completed)
    .sort(
      (a, b) =>
        state.value.records[b.id]!.time - state.value.records[a.id]!.time,
    ),
);
const lastCompleted = ref<number | null>(null);
function commit(next: PracticeState, recovery = false): boolean {
  if (!ready.value) return false;
  if (recoveryRequired && !recovery) {
    error.value =
      "原进度读取失败。请先前往“备份与恢复”导入全量备份，或明确重置数据后再继续";
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    state.value = next;
    recoveryRequired = false;
    error.value = "";
    return true;
  } catch {
    error.value =
      "保存失败，进度未更新。请检查浏览器存储权限或剩余空间，再重试";
    return false;
  }
}
function complete() {
  if (!current.value) return;
  const id = current.value.id;
  if (
    commit({
      ...state.value,
      records: {
        ...state.value.records,
        [id]: { completed: true, time: Date.now() },
      },
    })
  ) {
    lastCompleted.value = id;
    message.value = "已标记完成，下一题已准备好";
  }
}
function undo(id: number) {
  const records = { ...state.value.records };
  delete records[id];
  if (commit({ ...state.value, records })) {
    lastCompleted.value = null;
    message.value = "已撤销完成记录";
  }
}
function reshuffle() {
  if (!window.confirm("重新随机排列本轮题序？已完成记录和轮次进度会保留"))
    return;
  if (commit({ ...state.value, order: shuffle(state.value.order) })) {
    lastCompleted.value = null;
    message.value = "题序已重新排列，完成进度已保留";
  }
}
function nextRound() {
  if (count.value !== 100) return;
  if (commit(freshState(problems.value, state.value.round + 1))) {
    lastCompleted.value = null;
    message.value = "已开始新一轮，题序已重新随机排列";
  }
}
function reset() {
  if (
    !window.confirm(
      "清空本工具的轮次和完成记录，回到第 1 轮？此操作不可撤销，建议先前往“备份与恢复”导出全量备份",
    )
  )
    return;
  if (commit(freshState(problems.value), true)) {
    lastCompleted.value = null;
    message.value = "刷题数据已重置";
  }
}
const difficultyClass = (difficulty: string) =>
  ({ 简单: "easy", 中等: "medium", 困难: "hard" })[difficulty];
const formatTime = (time: number) =>
  new Date(time).toLocaleString("zh-CN", { hour12: false });
</script>

<template>
  <div class="page lc-page">
    <div class="page-heading lc-heading">
      <div>
        <div class="lc-heading-title">
          <CodeXml :size="27" />
          <h1>力扣热题</h1>
        </div>
        <p class="page-description">
          一道一道来，慢慢也很快
        </p>
      </div>
    </div>
    <div v-if="error" class="lc-alert" role="alert">
      {{ error
      }}<button @click="error = ''" aria-label="关闭错误提示">×</button>
    </div>
    <section
      v-if="loading"
      class="lc-tool-status"
      role="status"
      aria-busy="true"
    >
      <h2>正在加载题库…</h2>
      <p>从在线题库获取本轮练习所需的题目</p>
    </section>
    <section v-else-if="loadError" class="lc-tool-status" role="alert">
      <h2>暂时无法加载题库</h2>
      <p>{{ loadError }}</p>
      <button class="lc-button primary" @click="load">重新加载</button>
    </section>
    <template v-if="ready">
      <div class="lc-layout">
        <section class="lc-current">
          <div class="lc-panel-label">
            <span>当前练习</span><span>第 {{ state.round }} 轮</span>
          </div>
          <template v-if="current">
            <div class="lc-problem-meta">
              <span>题号 {{ current.id }}</span
              ><span
                class="lc-difficulty"
                :class="difficultyClass(current.difficulty)"
                >{{ current.difficulty }}</span
              >
            </div>
            <h2 :key="current.id" class="lc-problem-title">
              {{ current.title }}
            </h2>
            <p class="lc-current-description">
              题目已为你选好。前往力扣完成练习，回来记录这次进步
            </p>
            <div class="lc-main-actions">
              <a
                :href="current.url"
                target="_blank"
                rel="noopener noreferrer"
                class="lc-button primary"
                >前往力扣做题 <ArrowUpRight :size="16" /> </a
              ><button class="lc-button" @click="complete">
                <Check :size="16" />标记完成
              </button>
            </div>
          </template>
          <div v-else class="lc-celebration">
            <Trophy :size="42" />
            <h2>这一轮，100 题全部完成</h2>
            <p>给坚持留个纪念，再开始一轮新的练习</p>
            <button class="lc-button primary" @click="nextRound">
              开始第 {{ state.round + 1 }} 轮
            </button>
          </div>
          <div class="lc-current-footer">
            <span>
              <Clock3 :size="14" />本轮用时
              {{ days === null ? "—" : `${days} 天` }} </span
            ><button class="lc-text-button" @click="reshuffle">
              <Shuffle :size="14" />重新洗牌
            </button>
          </div>
        </section>
        <section class="lc-progress">
          <div class="lc-panel-label">
            <h2>本轮进度</h2>
            <span>{{ count }}%</span>
          </div>
          <div class="lc-count">
            <strong>{{ count }}</strong
            ><span>/ 100 题</span>
          </div>
          <progress
            :value="count"
            max="100"
            :aria-label="`本轮已完成 ${count} 题，共 100 题`"
          ></progress>
          <p>还剩 {{ 100 - count }} 题，每一道都算数</p>
          <div class="lc-difficulty-summary">
            <span
              v-for="difficulty in ['简单', '中等', '困难']"
              :key="difficulty"
              ><i :class="difficultyClass(difficulty)"></i>{{ difficulty
              }}<strong
                >{{
                  completed.filter((p) => p.difficulty === difficulty).length
                }}/{{
                  problems.filter((p) => p.difficulty === difficulty).length
                }}</strong
              ></span
            >
          </div>
        </section>
      </div>
      <div class="lc-feedback" role="status" aria-live="polite">
        <template v-if="message"
          >{{ message
          }}<button
            v-if="lastCompleted !== null"
            class="lc-text-button"
            @click="undo(lastCompleted)"
          >
            撤销
          </button></template
        ><span v-else
          >进度自动保存在当前浏览器。打开力扣不会自动标记完成</span
        >
      </div>
      <section class="lc-overview">
        <div class="section-heading">
          <h2>100 题，一点点点亮</h2>
          <div class="lc-legend">
            <span><i></i>待完成</span><span><i class="done"></i>已完成</span>
          </div>
        </div>
        <div class="lc-grid">
          <a
            v-for="problem in sorted"
            :key="problem.id"
            :href="problem.url"
            target="_blank"
            rel="noopener noreferrer"
            :title="`${problem.id}. ${problem.title}（${state.records[problem.id]?.completed ? '已完成' : '待完成'}）`"
            :aria-label="`${problem.id}. ${problem.title}，${state.records[problem.id]?.completed ? '已完成' : '待完成'}，在新标签页打开`"
            :class="{
              done: state.records[problem.id]?.completed,
              current: current?.id === problem.id,
            }"
            >{{ problem.id }}</a
          >
        </div>
        <p class="lc-grid-note">
          按题号排列；点击题号可前往力扣查看题目。描边表示当前练习
        </p>
      </section>
      <section class="lc-history">
        <div class="section-heading">
          <h2>
            完成记录 <span class="lc-history-count">{{ count }}</span>
          </h2>
          <span>最近完成的排在前面</span>
        </div>
        <div v-if="!completed.length" class="lc-history-empty">
          <Check :size="24" />
          <p>完成第一道题，记录就从这里开始</p>
        </div>
        <ul v-else class="lc-history-list">
          <li v-for="problem in completed" :key="problem.id">
            <Check :size="16" class="lc-check" /><a
              :href="problem.url"
              target="_blank"
              rel="noopener noreferrer"
              >{{ problem.id }}. {{ problem.title }}</a
            ><span
              class="lc-difficulty"
              :class="difficultyClass(problem.difficulty)"
              >{{ problem.difficulty }}</span
            ><time
              :datetime="
                new Date(state.records[problem.id]!.time).toISOString()
              "
              >{{ formatTime(state.records[problem.id]!.time) }}</time
            ><button
              class="lc-text-button"
              :aria-label="`撤销 ${problem.title} 的完成记录`"
              @click="undo(problem.id)"
            >
              撤销
            </button>
          </li>
        </ul>
      </section>
      <div class="lc-bottom">
        <span>用时从本轮第一次完成记录起，按自然日计算</span
        ><button class="lc-text-button danger" @click="reset">
          <RotateCcw :size="13" />重置刷题数据
        </button>
      </div>
    </template>
  </div>
</template>
