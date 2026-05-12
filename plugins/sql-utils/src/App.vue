<template>
  <div id="main">
    <div class="main-top">
      <el-tabs ref="tabs" v-model="activeName" @tab-click="handleClick">
        <el-tab-pane label="文本拼接" name="textJoint">
          <span slot="label"><i class="ali-icon-txt"/> 文本拼接</span>
        </el-tab-pane>
        <el-tab-pane label="Excel转SQL" name="excelToSql">
          <span slot="label"><i class="ali-icon-excel"/> Excel转SQL</span>
        </el-tab-pane>
        <el-tab-pane label="生成测试数据" name="generateTestData">
          <span slot="label"><i class="ali-icon-shujuxiang"/> 生成测试数据</span>
        </el-tab-pane>
        <el-tab-pane label="代码生成" name="codeGenerator">
          <span slot="label"><i class="ali-icon-daima"/> 代码生成</span>
        </el-tab-pane>
      </el-tabs>
      <!-- 固定在右上角的深/浅色主题切换开关 -->
      <div class="toggle-theme-button">
        <ThemeSwitch/>
      </div>
    </div>

    <div class="main-bottom">
      <router-view v-slot="{ Component }" ref="routerView">
        <transition name="fade" mode="out-in">
          <component :is="Component"/>
        </transition>
      </router-view>
    </div>
  </div>
</template>

<script>
import ThemeSwitch from '@/components/ThemeSwitch.vue';

function handlePluginEnter(vue, action) {
  if (action.type === 'regex') {
    vue.activeName = 'textJoint';
    vue.$router.push('textJoint');
    vue.$nextTick(() => {
      vue.$root.$emit('set-regex-payload', action.payload);
    });
  }
}

export default {
  name: 'App',
  components: {ThemeSwitch},
  created() {
    this.activeName = this.$route.name || 'textJoint';
  },
  data() {
    return {
      activeName: 'textJoint'
    }
  },
  mounted() {
    this.initializePlugin();
  },
  methods: {
    initializePlugin() {
      if (window.ztools) {
        window.ztools.onPluginEnter((action) => handlePluginEnter(this, action));
        window.ztools.onPluginOut(() => {});
      }
      if (navigator.userAgent.includes('uTools')) {
        utools.onPluginEnter((action) => handlePluginEnter(this, action));
      }
    },
    handleClick(tab) {
      this.$router.push(tab.name);
    }
  }
}
</script>

<style>
/* 视口高度设置 */
html, body {
  height: 100%;
  overflow: hidden; /* 禁用全局滚动 */
}

/* 主容器 */
#main {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 上层容器，高度由内容决定 */
.main-top {
  flex-shrink: 0; /* 禁止收缩 */
}

/* 下层容器，使用 flex-grow: 1 来占据剩余的所有空间 */
.main-bottom {
  flex: 1; /* 占据剩余空间 */
  min-height: 0; /* 修复旧版本浏览器兼容问题 */
  overflow-y: auto; /* 垂直滚动 */
  display: flex;
  padding-bottom: 15px;
}

.toggle-theme-button {
  position: absolute;
  top: 12px;
  right: 10px;
}
</style>
