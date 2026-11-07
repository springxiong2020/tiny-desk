<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  CheckCheck,
  Plus,
  Search,
  Check,
  Pencil,
  Trash2,
  X,
  Folder,
  Repeat2,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from "lucide-vue-next";
import {
  STORAGE_KEY,
  defaults,
  validateData,
  priorities,
  recurrences,
  today,
  toggleTask,
  removeGroup,
  selectTasks,
  reorder,
  type TodoData,
  type Task,
  type Group,
} from "./todo";
import "./todo.css";

const route = useRoute(),
  router = useRouter(),
  data = ref(defaults()),
  error = ref(""),
  message = ref(""),
  quick = ref(""),
  search = ref(""),
  priority = ref("all"),
  sort = ref("order"),
  showCompleted = ref(true);
const searchInput = ref<HTMLInputElement | null>(null),
  dialog = ref<HTMLDialogElement | null>(null),
  groupDialog = ref<HTMLDialogElement | null>(null);
const undoData = ref<TodoData | null>(null),
  dragging = ref<number | null>(null);
let recoveryRequired = false;
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) data.value = validateData(JSON.parse(raw));
} catch {
  recoveryRequired = true;
  error.value =
    "待办数据读取失败，原记录未改动。请前往“备份与恢复”导入全量备份后继续";
}
const group = computed(() =>
  typeof route.query.group === "string" &&
  data.value.groups.some((g) => g.id === route.query.group)
    ? route.query.group
    : "all",
);
const visible = computed(() =>
  selectTasks(
    data.value,
    group.value,
    search.value,
    priority.value,
    sort.value,
    showCompleted.value,
  ),
);
const completed = computed(
  () => data.value.tasks.filter((t) => t.completed).length,
);
const groupName = computed(
  () => data.value.groups.find((g) => g.id === group.value)?.name ?? "全部任务",
);
function commit(value: TodoData, notice: string) {
  if (recoveryRequired) {
    error.value = "请先前往“备份与恢复”导入全量备份，避免覆盖原记录";
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    undoData.value = JSON.parse(JSON.stringify(data.value)) as TodoData;
    data.value = value;
    recoveryRequired = false;
    error.value = "";
    message.value = notice;
    return true;
  } catch {
    error.value = "保存失败，数据未更新。请检查浏览器存储权限和可用空间";
    return false;
  }
}
function undo() {
  if (!undoData.value) return;
  const previous = undoData.value;
  if (commit(previous, "已撤销上一步操作")) undoData.value = null;
}
function newTask(title = ""): Task {
  return {
    id: Math.max(0, ...data.value.tasks.map((t) => t.id)) + 1,
    title,
    description: "",
    notes: "",
    groupId: group.value === "all" ? data.value.groups[0]!.id : group.value,
    priority: "medium",
    dueDate: null,
    recurring: null,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    order: Math.max(-1, ...data.value.tasks.map((t) => t.order)) + 1,
  };
}
function addQuick() {
  const title = quick.value.trim();
  if (
    title &&
    commit(
      { ...data.value, tasks: [...data.value.tasks, newTask(title)] },
      "任务已添加",
    )
  )
    quick.value = "";
}
const draft = ref<Task>(newTask()),
  editing = ref(false);
let returnFocus: HTMLElement | null = null;
async function openTask(task?: Task) {
  returnFocus = document.activeElement as HTMLElement;
  editing.value = !!task;
  draft.value = task ? { ...task } : newTask();
  dialog.value?.showModal();
  await nextTick();
  dialog.value?.querySelector<HTMLInputElement>("input")?.focus();
}
function closeTask() {
  dialog.value?.close();
  returnFocus?.focus();
}
function closeGroupOnBackdrop(event: MouseEvent) {
  const element = groupDialog.value;
  if (!element || event.target !== element) return;
  // 原生 dialog 的遮罩点击也以 dialog 为目标，通过坐标排除弹框内部留白。
  const bounds = element.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    element.close();
}
function saveTask() {
  const t = {
    ...draft.value,
    title: draft.value.title.trim(),
    dueDate: draft.value.dueDate || null,
    recurring: draft.value.recurring || null,
  };
  if (!t.title) return;
  if (t.recurring && !t.dueDate) {
    error.value = "请为重复任务设置首次截止日期";
    return;
  }
  try {
    const next = validateData({
      ...data.value,
      tasks: editing.value
        ? data.value.tasks.map((item) => (item.id === t.id ? t : item))
        : [...data.value.tasks, t],
    });
    if (commit(next, editing.value ? "任务已更新" : "任务已创建")) closeTask();
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function toggle(t: Task) {
  commit(
    toggleTask(data.value, t.id),
    t.recurring && !t.completed
      ? "重复任务已延续到下一次日期"
      : t.completed
        ? "已取消完成"
        : "任务已完成",
  );
}
function deleteTask(t: Task) {
  if (
    commit(
      { ...data.value, tasks: data.value.tasks.filter((v) => v.id !== t.id) },
      "任务已删除，可撤销",
    )
  )
    closeTask();
}
function move(t: Task, direction: number) {
  const active = visible.value.filter((v) => !v.completed),
    index = active.findIndex((v) => v.id === t.id),
    target = active[index + direction];
  if (!target) return;
  const next = reorder(data.value, t.id, target.id, direction > 0);
  commit(next, "任务顺序已更新");
}
function drop(target: Task) {
  if (
    dragging.value !== null &&
    !target.completed &&
    ["order", "priority"].includes(sort.value)
  )
    commit(reorder(data.value, dragging.value, target.id), "任务顺序已更新");
  dragging.value = null;
}
const groupDraft = ref<Group>({
    id: "",
    name: "",
    color: "#245ddd",
    icon: "fa-folder",
  }),
  editingGroup = ref<string | null>(null);
function editGroup(g?: Group) {
  editingGroup.value = g?.id ?? null;
  groupDraft.value = g
    ? { ...g }
    : {
        id: `group_${Date.now()}`,
        name: "",
        color: "#245ddd",
        icon: "fa-folder",
      };
}
function saveGroup() {
  const g = { ...groupDraft.value, name: groupDraft.value.name.trim() };
  if (!g.name) return;
  const groups = editingGroup.value
    ? data.value.groups.map((item) =>
        item.id === editingGroup.value ? g : item,
      )
    : [...data.value.groups, g];
  if (commit({ ...data.value, groups }, "分组已保存")) editGroup();
}
function deleteGroup(g: Group) {
  if (data.value.groups.length <= 1) {
    error.value = "至少保留一个分组";
    return;
  }
  const fallback = data.value.groups.find((v) => v.id !== g.id)!;
  if (
    !window.confirm(
      `删除“${g.name}”？其中的任务会移到“${fallback.name}”，任务不会删除`,
    )
  )
    return;
  if (commit(removeGroup(data.value, g.id), "分组已删除，任务已保留"))
    editGroup();
}
function keyboard(event: KeyboardEvent) {
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "k" &&
    !dialog.value?.open &&
    !groupDialog.value?.open &&
    !document.querySelector(".sidebar.open")
  ) {
    event.preventDefault();
    searchInput.value?.focus();
  }
}
onMounted(() => document.addEventListener("keydown", keyboard));
onUnmounted(() => document.removeEventListener("keydown", keyboard));
</script>

<template>
  <div class="page todo-page">
    <div class="page-heading">
      <div>
        <div class="todo-title">
          <CheckCheck :size="27" />
          <h1>待办事项</h1>
        </div>
        <p class="page-description">把想做的事，变成完成的事</p>
      </div>
      <div class="todo-actions">
        <button class="todo-button primary" @click="openTask()">
          <Plus :size="16" />新建任务
        </button>
      </div>
    </div>
    <div v-if="error" class="todo-error" role="alert">
      {{ error
      }}<button class="todo-icon" aria-label="关闭错误提示" @click="error = ''">
        <X :size="17" />
      </button>
    </div>
    <div class="todo-layout">
      <aside class="todo-groups" aria-label="任务分组">
        <div class="todo-group-heading">
          <h2>任务分组</h2>
          <button
            class="todo-icon"
            aria-label="管理分组"
            @click="
              editGroup();
              groupDialog?.showModal();
            "
          >
            <Pencil :size="15" />
          </button>
        </div>
        <button
          class="todo-group"
          :class="{ selected: group === 'all' }"
          @click="router.push({ query: { group: undefined } })"
        >
          <CheckCheck :size="17" />全部任务<span>{{
            data.tasks.filter((t) => !t.completed).length
          }}</span></button
        ><button
          v-for="g in data.groups"
          :key="g.id"
          class="todo-group"
          :class="{ selected: group === g.id }"
          @click="router.push({ query: { group: g.id } })"
        >
          <i :style="{ background: g.color }"></i>{{ g.name
          }}<span>{{
            data.tasks.filter((t) => t.groupId === g.id && !t.completed).length
          }}</span>
        </button>
        <div class="todo-progress">
          <span
            >全部进度<strong
              >{{ completed }} / {{ data.tasks.length }}</strong
            ></span
          ><progress
            :value="completed"
            :max="data.tasks.length || 1"
            aria-label="全部任务完成进度"
          ></progress>
          <p>每完成一件，就少一件挂念</p>
        </div>
      </aside>

      <section class="todo-work">
        <div class="section-heading">
          <h2>{{ groupName }}</h2>
          <span>{{ visible.length }} 个任务</span>
        </div>
        <form class="todo-quick" @submit.prevent="addQuick">
          <Plus :size="19" /><input
            v-model="quick"
            aria-label="快速新增任务"
            placeholder="有什么要做的？输入后按回车"
            maxlength="300"
          /><button class="todo-button" :disabled="!quick.trim()">添加</button>
        </form>
        <div class="todo-filters">
          <label class="todo-search">
            <Search :size="16" /><input
              ref="searchInput"
              v-model="search"
              placeholder="搜索标题、描述或备注"
              aria-label="搜索任务"
            /> </label
          ><select v-model="priority" aria-label="筛选优先级">
            <option value="all">全部优先级</option>
            <option v-for="(label, key) in priorities" :key="key" :value="key">
              {{ label }}
            </option></select
          ><select v-model="sort" aria-label="任务排序">
            <option value="order">自定义排序</option>
            <option value="dueDate">截止日期</option>
            <option value="priority">优先级</option>
            <option value="createdAt">创建时间</option></select
          ><label class="todo-show"
            ><input v-model="showCompleted" type="checkbox" />显示已完成</label
          >
        </div>
        <div v-if="!visible.length" class="todo-empty">
          <CheckCheck :size="37" stroke-width="1.3" />
          <h3>
            {{
              data.tasks.length ? "没有符合条件的任务" : "把第一件事，放到这里"
            }}
          </h3>
          <p>
            {{
              data.tasks.length
                ? "切换分组，或调整搜索和筛选条件"
                : "从一件小事开始。可以直接输入，也可以新建详细任务"
            }}
          </p>
        </div>
        <ul v-else class="todo-list">
          <li
            v-for="t in visible"
            :key="t.id"
            class="todo-row"
            :class="{ completed: t.completed }"
            @dragover.prevent
            @drop.prevent="drop(t)"
          >
            <span
              class="todo-drag"
              :draggable="!t.completed && ['order', 'priority'].includes(sort)"
              @dragstart="
                dragging = t.id;
                $event.dataTransfer?.setData('text/plain', String(t.id));
              "
              @dragend="dragging = null"
              aria-hidden="true"
            >
              <GripVertical :size="15" /> </span
            ><button
              class="todo-check"
              :class="{ checked: t.completed }"
              :aria-label="`${t.completed ? '取消完成' : '完成'} ${t.title}`"
              :aria-pressed="t.completed"
              @click="toggle(t)"
            >
              <Check v-if="t.completed" :size="13" /></button
            ><button class="todo-task-content" @click="openTask(t)">
              <strong>{{ t.title }}</strong>
              <p v-if="t.description">{{ t.description }}</p>
              <div class="todo-meta">
                <span class="todo-priority" :class="t.priority">{{
                  priorities[t.priority]
                }}</span
                ><span>{{
                  data.groups.find((g) => g.id === t.groupId)?.name
                }}</span
                ><span
                  v-if="t.dueDate"
                  :class="{ overdue: !t.completed && t.dueDate < today() }"
                >
                  <CalendarDays :size="12" />{{ t.dueDate
                  }}{{
                    !t.completed && t.dueDate < today() ? " 已逾期" : ""
                  }}</span
                ><span v-if="t.recurring">
                  <Repeat2 :size="12" />{{ recurrences[t.recurring] }} </span
                ><span v-if="t.completedAt"
                  >完成于
                  {{ new Date(t.completedAt).toLocaleString("zh-CN") }}</span
                >
              </div>
            </button>
            <div class="todo-row-actions">
              <template
                v-if="!t.completed && ['order', 'priority'].includes(sort)"
                ><button
                  class="todo-icon"
                  :aria-label="`上移 ${t.title}`"
                  @click="move(t, -1)"
                >
                  <ArrowUp :size="14" /></button
                ><button
                  class="todo-icon"
                  :aria-label="`下移 ${t.title}`"
                  @click="move(t, 1)"
                >
                  <ArrowDown :size="14" /></button></template
              ><button
                class="todo-icon"
                :aria-label="`编辑 ${t.title}`"
                @click="openTask(t)"
              >
                <Pencil :size="14" />
              </button>
            </div>
          </li>
        </ul>
        <div class="todo-feedback" role="status" aria-live="polite">
          {{ message || "任务自动保存在当前浏览器"
          }}<button v-if="undoData" class="todo-text-button" @click="undo">
            撤销上一步
          </button>
        </div>
      </section>
    </div>

    <dialog
      ref="dialog"
      class="todo-dialog"
      @click="
        (e) => {
          if (e.target === dialog) closeTask();
        }
      "
    >
      <form @submit.prevent="saveTask">
        <div class="todo-dialog-heading">
          <h2>{{ editing ? "编辑任务" : "新建任务" }}</h2>
          <button
            type="button"
            class="todo-icon"
            aria-label="关闭任务编辑"
            @click="closeTask"
          >
            <X :size="19" />
          </button>
        </div>
        <p v-if="error" class="todo-error" role="alert">{{ error }}</p>
        <label
          >任务标题<input
            v-model="draft.title"
            required
            maxlength="300"
            autofocus /></label
        ><label
          >描述<textarea v-model="draft.description" rows="2"></textarea>
        </label>
        <div class="todo-form-grid">
          <label
            >分组<select v-model="draft.groupId">
              <option v-for="g in data.groups" :key="g.id" :value="g.id">
                {{ g.name }}
              </option>
            </select></label
          ><label
            >优先级<select v-model="draft.priority">
              <option
                v-for="(label, key) in priorities"
                :key="key"
                :value="key"
              >
                {{ label }}
              </option>
            </select></label
          ><label
            >截止日期<input
              v-model="draft.dueDate"
              type="date"
              :required="!!draft.recurring" /></label
          ><label
            >重复规则<select v-model="draft.recurring">
              <option :value="null">不重复</option>
              <option
                v-for="(label, key) in recurrences"
                :key="key"
                :value="key"
              >
                {{ label }}
              </option>
            </select></label
          >
        </div>
        <label>备注<textarea v-model="draft.notes" rows="3"></textarea></label>
        <p v-if="draft.recurring" class="todo-form-note">
          完成后延续到下一次日期。按月重复时，日期超出下月天数会取该月最后一天
        </p>
        <div class="todo-dialog-footer">
          <button
            v-if="editing"
            type="button"
            class="todo-text-button danger"
            @click="deleteTask(draft)"
          >
            <Trash2 :size="14" />删除任务
          </button>
          <div class="todo-actions">
            <button type="button" class="todo-button" @click="closeTask">
              取消</button
            ><button class="todo-button primary">保存任务</button>
          </div>
        </div>
      </form>
    </dialog>

    <dialog ref="groupDialog" class="todo-dialog" @click="closeGroupOnBackdrop">
      <div class="todo-dialog-heading">
        <h2>管理分组</h2>
        <button
          class="todo-icon"
          aria-label="关闭分组管理"
          @click="groupDialog?.close()"
        >
          <X :size="19" />
        </button>
      </div>
      <p v-if="error" class="todo-error" role="alert">{{ error }}</p>
      <ul class="todo-group-manager">
        <li v-for="g in data.groups" :key="g.id">
          <Folder :size="17" :style="{ color: g.color }" /><span>{{
            g.name
          }}</span
          ><button
            class="todo-icon"
            :aria-label="`编辑分组 ${g.name}`"
            @click="editGroup(g)"
          >
            <Pencil :size="14" /></button
          ><button
            class="todo-icon"
            :disabled="data.groups.length <= 1"
            :aria-label="`删除分组 ${g.name}`"
            @click="deleteGroup(g)"
          >
            <Trash2 :size="14" />
          </button>
        </li>
      </ul>
      <form @submit.prevent="saveGroup">
        <h3>{{ editingGroup ? "编辑分组" : "添加分组" }}</h3>
        <label
          >分组名称<input
            v-model="groupDraft.name"
            required
            maxlength="50" /></label
        ><label
          >分组颜色<input v-model="groupDraft.color" type="color"
        /></label>
        <div class="todo-dialog-footer">
          <button
            v-if="editingGroup"
            type="button"
            class="todo-text-button"
            @click="editGroup()"
          >
            改为新增</button
          ><button class="todo-button primary">
            {{ editingGroup ? "保存分组" : "添加分组" }}
          </button>
        </div>
      </form>
    </dialog>
  </div>
</template>
