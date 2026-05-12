<template>
  <div
    class="code-editor-box"
    @mouseenter="showCopyIcon = true"
    @mouseleave="handleEditorMouseLeave"
    :data-theme="$store.state.codeEditorThemeMode"
  >
    <codemirror
        ref="codemirrorEditor"
        class="code-editor"
        v-model="localValue"
        :options="codemirrorOptions"
        @input="handleInput"
    />

    <!-- 提示文字 -->
    <transition name="fade">
      <div v-if="!localValue && placeholder" class="codemirror-placeholder">
        {{ placeholder }}
      </div>
    </transition>

    <!-- 操作按钮组 -->
    <div class="action-buttons" v-show="localValue && showCopyIcon">
      <!-- 清空按钮 -->
      <div
        class="clear-container"
        @click="clear"
        @mouseleave="handleClearContainerMouseLeave"
      >
        <i class="el-icon-delete"></i>
        <span class="clear-text">清空</span>
      </div>

      <!-- 复制按钮 -->
      <div
        class="copy-container"
        @click="copyToClipboard"
        @mouseleave="handleCopyContainerMouseLeave"
      >
        <i :class="copyIconClass"></i>
        <span class="copy-text">{{ copyText }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CodeEditor',
  props: {
    value: {
      type: String,
      default: ''
    },
    mode: {
      type: String,
      default: 'text'
    },
    autofocus: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: String,
      default: ''
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      localValue: this.value || '',
      codemirrorOptions: {
        theme: this.$store.state.codeEditorThemeMode,
        mode: this.mode,
        autofocus: this.autofocus,
        readOnly: this.readonly,
        lineNumbers: true,
        styleActiveLine: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        tabSize: 2,
        indentUnit: 2,
        smartIndent: true,
        lineWrapping: true
      },
      showCopyIcon: false,
      copyText: '复制',
      copyIconClass: 'el-icon-copy-document',
      isCopied: false,
      copyTimeout: null
    }
  },

  watch: {
    '$store.state.codeEditorThemeMode': {
      handler(newTheme) {
        this.codemirrorOptions.theme = newTheme;
        // 更新CodeMirror实例的主题
        if (this.$refs.codemirrorEditor && this.$refs.codemirrorEditor.codemirror) {
          this.$refs.codemirrorEditor.codemirror.setOption('theme', newTheme);
        }
      },
      immediate: true
    },
    value: {
      handler(newVal) {
        this.localValue = newVal || '';
      },
      immediate: true
    },
    readonly: {
      handler(newVal) {
        this.codemirrorOptions.readOnly = newVal;
        // 更新CodeMirror实例的只读状态
        if (this.$refs.codemirrorEditor && this.$refs.codemirrorEditor.codemirror) {
          this.$refs.codemirrorEditor.codemirror.setOption('readOnly', newVal);
        }
      },
      immediate: true
    },
    mode: {
      handler(newMode) {
        this.codemirrorOptions.mode = newMode;
        // 更新CodeMirror实例的模式
        if (this.$refs.codemirrorEditor && this.$refs.codemirrorEditor.codemirror) {
          this.$refs.codemirrorEditor.codemirror.setOption('mode', newMode);
        }
      },
      immediate: true
    }
  },

  mounted() {
    // 确保CodeMirror实例正确初始化
    this.$nextTick(() => {
      if (this.autofocus && this.$refs.codemirrorEditor && this.$refs.codemirrorEditor.codemirror) {
        this.$refs.codemirrorEditor.codemirror.focus();
      }
    });
  },

  beforeDestroy() {
    // 清理定时器
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
  },

  methods: {
    /**
     * 处理输入事件
     */
    handleInput(value) {
      this.localValue = value;
      // 发出标准input事件以支持v-model
      this.$emit('input', value);
      // 发出change事件
      this.$emit('change', value);
    },

    /**
     * 复制内容到剪贴板
     */
    copyToClipboard() {
      if (!this.localValue) return;

      navigator.clipboard.writeText(this.localValue).then(() => {
        this.copyText = '复制成功';
        this.copyIconClass = 'el-icon-success';
        this.isCopied = true;

        // 获取焦点
        if (this.$refs.codemirrorEditor && this.$refs.codemirrorEditor.codemirror) {
          this.$refs.codemirrorEditor.codemirror.focus();
        }

        // 1.5秒后自动恢复原始状态
        this.copyTimeout = setTimeout(() => {
          this.resetCopyState();
        }, 1500);
      }).catch(err => {
        console.error('复制失败:', err);
        this.$message.error('复制失败');
      });
    },

    /**
     * 处理鼠标离开编辑器区域
     */
    handleEditorMouseLeave() {
      // 延迟隐藏，避免鼠标从编辑器移动到复制按钮时立即消失
      setTimeout(() => {
        // 只有在未复制状态下才隐藏
        if (!this.isCopied) {
          this.showCopyIcon = false;
        }
      }, 100);
    },

    /**
     * 处理鼠标离开复制容器
     */
    handleCopyContainerMouseLeave() {
      // 不再需要在此处处理，因为已改为定时恢复
    },

    /**
     * 处理鼠标离开清空容器
     */
    handleClearContainerMouseLeave() {
      // 不再需要在此处处理
    },

    /**
     * 重置复制状态
     */
    resetCopyState() {
      // 清理之前的定时器
      if (this.copyTimeout) {
        clearTimeout(this.copyTimeout);
        this.copyTimeout = null;
      }

      // 恢复原始状态
      this.copyText = '复制';
      this.copyIconClass = 'el-icon-copy-document';
      this.isCopied = false;
    },

    /**
     * 获取CodeMirror实例
     * @returns {Object|null} CodeMirror实例
     */
    getCodeMirrorInstance() {
      return this.$refs.codemirrorEditor ? this.$refs.codemirrorEditor.codemirror : null;
    },

    /**
     * 设置焦点
     */
    focus() {
      const cm = this.getCodeMirrorInstance();
      if (cm) {
        cm.focus();
      }
    },

    /**
     * 全选内容
     */
    selectAll() {
      const cm = this.getCodeMirrorInstance();
      if (cm) {
        cm.execCommand('selectAll');
        cm.focus();
      }
    },

    /**
     * 清空内容
     */
    clear() {
      this.localValue = '';
      this.$emit('input', '');
      this.$emit('change', '');
      this.focus();
    }
  }
}
</script>

<style scoped>
.code-editor-box {
  width: 100%;
  height: 100%;
  position: relative;
}

.code-editor {
  height: 100%;
}

.codemirror-placeholder {
  position: absolute;
  top: 2px;
  left: 33px;
  color: #999;
  pointer-events: none;
  font-size: 14px;
  z-index: 1;
  font-style: italic;
  transition: opacity 0.3s ease;
  opacity: 0.7;
}

/* 深色主题下的提示文字样式 */
.code-editor-box[data-theme="dracula"] .codemirror-placeholder {
  color: #666;
}

/* 浅色主题下的提示文字样式 */
.code-editor-box[data-theme="base16-light"] .codemirror-placeholder {
  color: #aaa;
}

/* fade transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

.action-buttons {
  position: absolute;
  top: 6px;
  right: 12px;
  z-index: 2;
  display: flex;
  gap: 5px;
}

.copy-container, .clear-container {
  cursor: pointer;
  background-color: #E5E6EB;
  border-radius: 4px;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  font-size: 12px;
  transition: all 0.3s ease;
}

/* 深色主题样式 */
.code-editor-box[data-theme="dracula"] .copy-container,
.code-editor-box[data-theme="dracula"] .clear-container {
  background-color: #424242;
  color: #fff;
}

.code-editor-box[data-theme="dracula"] .copy-container:hover,
.code-editor-box[data-theme="dracula"] .clear-container:hover {
  background-color: #555555;
}

/* 浅色主题样式 */
.code-editor-box[data-theme="base16-light"] .copy-container,
.code-editor-box[data-theme="base16-light"] .clear-container {
  background-color: #E5E6EB;
  color: #000;
}

.code-editor-box[data-theme="base16-light"] .copy-container:hover,
.code-editor-box[data-theme="base16-light"] .clear-container:hover {
  background-color: #D0D2D9;
}

.copy-text {
  margin-left: 4px;
  font-size: 12px;
}

/* 复制成功图标颜色 */
.copy-container .el-icon-success {
  color: #4A902D;
  font-size: 14px;
}
</style>
