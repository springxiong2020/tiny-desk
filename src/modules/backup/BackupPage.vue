<script setup lang="ts">
import { ref } from "vue";
import { theme, applyRestoredTheme } from "../../app/theme";
import {
  createBackup,
  restoreBackup,
  validateBackup,
  MAX_BACKUP_BYTES,
  type WorkspaceBackup,
} from "../../app/backup";
import "./backup.css";
import { Database, Download, Upload } from "lucide-vue-next";

const fileInput = ref<HTMLInputElement | null>(null);
const importing = ref<WorkspaceBackup | null>(null);
const busy = ref(false);
const error = ref("");
const notice = ref("");
const appVersion = __APP_VERSION__;

function exportAll() {
  error.value = "";
  notice.value = "";
  try {
    const backup = createBackup(localStorage, theme.value, appVersion);
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    if (blob.size > MAX_BACKUP_BYTES) {
      error.value = "全量备份超过 10 MB，暂时无法导出";
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tiny-desk-backup-${backup.exportedAt.slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice.value = "全量备份文件已生成";
  } catch {
    error.value =
      "无法读取或校验完整的本地记录，未生成备份。请检查浏览器存储权限；如本地数据损坏，请导入有效的全量备份恢复";
  }
}
async function readBackup(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  busy.value = true;
  error.value = "";
  notice.value = "";
  importing.value = null;
  try {
    if (file.size > MAX_BACKUP_BYTES)
      throw new Error("请选择小于 10 MB 的全量备份文件");
    importing.value = validateBackup(JSON.parse(await file.text()));
  } catch (e) {
    error.value =
      e instanceof SyntaxError
        ? "文件不是有效的 JSON，请选择全量备份文件"
        : (e as Error).message;
  } finally {
    busy.value = false;
    input.value = "";
  }
}
function confirmImport() {
  if (!importing.value || busy.value) return;
  busy.value = true;
  error.value = "";
  notice.value = "";
  try {
    const restored = restoreBackup(importing.value, localStorage);
    applyRestoredTheme(restored.data.theme);
    importing.value = null;
    notice.value = "已恢复全部记录和主题。打开各工具即可查看";
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="page backup-page">
    <div class="page-heading">
      <div>
        <h1>备份与恢复</h1>
        <p class="page-description">导出个人记录与偏好，或从备份文件中恢复</p>
      </div>
    </div>

    <div class="backup-layout">
      <section
        class="backup-panel"
        aria-labelledby="backup-heading"
        :aria-busy="busy"
      >
        <div class="backup-panel-heading">
          <Database :size="19" aria-hidden="true" />
          <h2 id="backup-heading">全量备份</h2>
        </div>
        <div class="backup-options">
          <div class="backup-option">
            <h3>保存一份备份</h3>
            <p>清理浏览器数据或更换设备前，请先进行备份</p>
            <button
              class="secondary-button backup-export"
              :disabled="busy"
              @click="exportAll"
            >
              <Download :size="15" />导出全部数据
            </button>
          </div>
          <div class="backup-option">
            <h3>从备份恢复</h3>
            <p>选择全量备份文件，确认后再进行覆盖</p>
            <button
              class="secondary-button"
              :disabled="busy || !!importing"
              @click="fileInput?.click()"
            >
              <Upload :size="15" />{{ busy ? "正在读取…" : "导入全量备份" }}
            </button>
            <input
              ref="fileInput"
              type="file"
              accept=".json,application/json"
              hidden
              @change="readBackup"
            />
          </div>
        </div>

        <p class="backup-format">
          仅支持 10 MB 以内的全量 JSON 备份文件
        </p>
        <p v-if="error" class="backup-feedback backup-error" role="alert">
          {{ error }}
        </p>
        <p v-if="notice" class="backup-feedback backup-notice" role="status">
          {{ notice }}
        </p>

        <section
          v-if="importing"
          class="backup-preview"
          aria-labelledby="backup-preview-heading"
        >
          <h3 id="backup-preview-heading">确认恢复这份全量备份？</h3>
          <p>
            导出于 {{ new Date(importing.exportedAt).toLocaleString() }}，来自
            v{{ importing.appVersion }} 版本
          </p>
          <ul>
            <li>
              待办：{{
                importing.data.todo
                  ? `${importing.data.todo.tasks.length} 项任务，${importing.data.todo.groups.length} 个分组`
                  : "无记录，将清空当前待办"
              }}
            </li>
            <li>
              网址：{{
                importing.data.sites
                  ? `${Object.keys(importing.data.sites.visits).length} 个网站有访问记录，${importing.data.sites.pinned.length} 个置顶`
                  : "无记录，将清空当前网址偏好"
              }}
            </li>
            <li>
              刷题：{{
                importing.data.leetcode
                  ? `第 ${importing.data.leetcode.round} 轮，已完成 ${Object.values(importing.data.leetcode.records).filter((record) => record.completed).length} 道题`
                  : "无记录，将清空当前刷题进度"
              }}
            </li>
            <li>
              主题：{{ importing.data.theme === "dark" ? "深色" : "浅色" }}
            </li>
          </ul>
          <p>
            以上内容将整体替换当前记录，无法撤销。建议先点击“导出全部数据”保留现有记录。备份中无记录的工具也会清空
          </p>

          <div class="backup-actions">
            <button
              class="secondary-button"
              :disabled="busy"
              @click="importing = null"
            >
              取消
            </button>
            <button
              class="secondary-button backup-confirm"
              :disabled="busy"
              @click="confirmImport"
            >
              确认覆盖并导入
            </button>
          </div>
        </section>
      </section>

      <section class="backup-panel" aria-labelledby="data-storage-heading">
        <h2 id="data-storage-heading">关于你的数据</h2>
        <dl class="storage-details">
          <div>
            <dt>保存在当前浏览器</dt>
            <dd>个人记录与偏好仅保存在当前浏览器中，无需注册与登录</dd>
          </div>
          <div>
            <dt>部分资源需要联网</dt>
            <dd>在线资源需联网加载，加载过程中不会上传你的个人记录</dd>
          </div>
          <div>
            <dt>数据不会自动同步</dt>
            <dd>更换设备或浏览器时，通过备份迁移数据，建议定期备份</dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>
