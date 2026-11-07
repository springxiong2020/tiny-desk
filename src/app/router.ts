import { CheckCheck, Compass, CodeXml } from "lucide-vue-next";
import {
  createRouter,
  createWebHashHistory,
  type RouteRecordRaw,
} from "vue-router";

const toolRoutes = [
  {
    path: "/sites",
    name: "sites",
    component: () => import("../modules/sites/SitesPage.vue"),
    meta: {
      title: "网址导航",
      tool: {
        icon: Compass,
        color: "teal",
        description: "好网站，放在顺手的地方",
        action: "浏览网址",
        features: ["分类浏览", "快速搜索", "常用置顶"],
      },
    },
  },
  {
    path: "/todo",
    name: "todo",
    component: () => import("../modules/todo/TodoPage.vue"),
    meta: {
      title: "待办事项",
      tool: {
        icon: CheckCheck,
        color: "blue",
        description: "把想做的事，变成完成的事",
        action: "打开待办",
        features: ["任务分组", "快捷录入", "周期任务"],
      },
    },
  },
  {
    path: "/leetcode",
    name: "leetcode",
    component: () => import("../modules/leetcode/LeetcodePage.vue"),
    meta: {
      title: "力扣热题",
      tool: {
        icon: CodeXml,
        color: "violet",
        description: "一道一道来，慢慢也很快",
        action: "进入刷题",
        features: ["随机题序", "轮次管理", "进度记录"],
      },
    },
  },
] satisfies RouteRecordRaw[];

// Navigation and workspace cards share the same registration as the router.
export const tools = toolRoutes.map((route) => ({
  id: route.name,
  path: route.path,
  name: route.meta.title,
  ...route.meta.tool,
}));

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: () => import("../modules/Workspace.vue"),
      meta: { title: "工作台" },
    },
    ...toolRoutes,
    {
      path: "/backup",
      component: () => import("../modules/backup/BackupPage.vue"),
      meta: { title: "备份与恢复" },
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
  document.title = `${String(to.meta.title)} - 小桌`;
});
