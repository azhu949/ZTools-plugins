<!--文本拼接-->
<template>
  <div class="app">
    <el-form :inline="true">
      <el-form-item>
        <el-button type="primary" size="mini" @click="removeDuplicates">去重</el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" size="mini" @click="removeEmptyLines">去空行</el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" size="mini" @click="addQuotes('single')">前后加'单引号'</el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" size="mini" @click="addQuotes('double')">前后加"双引号"</el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" size="mini" @click="joinWithSeparator" class="join-separator-btn">
          <el-popover
              ref="separatorPopover"
              placement="bottom-start"
              width="200"
              trigger="manual"
              v-model="popoverVisible"
              popper-class="separator-popover">
            <el-tooltip
                slot="reference"
                class="item"
                effect="dark"
                content="点击选择分隔符"
                placement="bottom">
              <span class="separator-icon" @click.stop="togglePopover">
                {{ getSeparatorSymbol() }}
              </span>
            </el-tooltip>
            <div class="separator-selector">
                <div class="separator-options">
                <div
                  v-for="option in separatorOptions"
                  :key="option.value"
                  class="separator-option"
                  :class="{ 'active': selectedSeparator === option.value, 'custom': option.isCustom }"
                  @click="selectSeparator(option.value)">
                  <span class="option-text">{{ option.label }}</span>
                  <span class="option-symbol">{{ option.symbol }}</span>
                </div>
              </div>
              <el-input
                  v-if="selectedSeparator === 'custom'"
                  v-model="customSeparator"
                  placeholder="输入自定义分隔符"
                  size="mini"
                  class="custom-input"
                  @input="handleCustomSeparatorChange"
              />
              <div v-if="selectedSeparator === 'custom'" class="custom-confirm">
                <el-button type="primary" size="mini" @click="confirmCustomSeparator">确认</el-button>
              </div>
            </div>
          </el-popover>
          <span>{{ getSeparatorDisplayName() }}拼接&nbsp;&nbsp;</span>
          <el-tooltip
              class="item"
              effect="dark"
              :content="joinWithCommaConfig.mergeToSingleLine ? '☝️单行模式（点击切换）' : '✌️多行模式（点击切换）'"
              placement="bottom"
          >
            <i
                :class="joinWithCommaConfig.mergeToSingleLine ? 'el-icon-document-remove comma-join-icon' : 'el-icon-document comma-join-icon'"
                @click.stop="toggleMergeMode"
                style="color: #ffffff"
            />
          </el-tooltip>
        </el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" size="mini" @click="convertToJson">转JSON</el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" size="mini" @click="mergeLines">合一行</el-button>
      </el-form-item>
    </el-form>
    <div class="textArea">
      <CodeEditor
          ref="codeEditor"
          v-model="text"
          :autofocus="true"
      />
    </div>
  </div>
</template>

<script>
import CodeEditor from '@/components/CodeEditor.vue'

// 分隔符选项配置
const SEPARATOR_OPTIONS = [
  { value: ',', label: '英文逗号', symbol: ',', isCustom: false },
  { value: '，', label: '中文逗号', symbol: '，', isCustom: false },
  { value: '|', label: '竖线', symbol: '|', isCustom: false },
  { value: '、', label: '顿号', symbol: '、', isCustom: false },
  { value: ';', label: '分号', symbol: ';', isCustom: false },
  { value: ':', label: '冒号', symbol: ':', isCustom: false },
  { value: ' ', label: '空格', symbol: '空格', isCustom: false },
  { value: '\\t', label: '制表符', symbol: 'Tab', isCustom: false },
  { value: 'custom', label: '自定义', symbol: '...', isCustom: true }
];

export default {
  name: "textJoint",
  components: { CodeEditor },
  data() {
    return {
      text: '',
      selectedSeparator: ',',
      customSeparator: '',
      popoverVisible: false,
      separatorOptions: SEPARATOR_OPTIONS,
      joinWithCommaConfig: {
        mergeToSingleLine: JSON.parse(localStorage.getItem('mergeToSingleLine') || 'false'),
        separator: localStorage.getItem('separator') || ','
      }
    }
  },
  mounted() {
    this.initializeComponent();
    // 监听来自App.vue的regex payload事件
    this.$root.$on('set-regex-payload', this.handleUtoolsRegexPayload);

  },
  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside);
    // 移除事件监听器
    this.$root.$off('set-regex-payload', this.handleUtoolsRegexPayload);
  },
  watch: {
    'joinWithCommaConfig.mergeToSingleLine'(newVal) {
      localStorage.setItem('mergeToSingleLine', JSON.stringify(newVal))
    },
    'joinWithCommaConfig.separator'(newVal) {
      localStorage.setItem('separator', newVal)
    }
  },
  methods: {
    /**
     * 处理regex payload数据
     */
    handleUtoolsRegexPayload(payload) {
      console.log('handleUtoolsRegexPayload', payload)
      this.text = payload;
    },

    /**
     * 初始化组件
     */
    initializeComponent() {
      // 设置焦点
      this.$refs.codeEditor.focus();

      // 监听粘贴事件
      this.setupPasteListener();

      // 初始化选中的分隔符
      this.initSelectedSeparator();

      // 添加点击外部区域关闭弹出框的事件监听
      document.addEventListener('click', this.handleClickOutside);
    },

    /**
     * 设置粘贴事件监听器
     */
    setupPasteListener() {
      this.$refs.codeEditor.$el.addEventListener('paste', (event) => {
        setTimeout(() => {
          if (this.text.endsWith('\n')) {
            this.text = this.text.replace(/\n+$/, '');
          }
        }, 0);
      });
    },

    /**
     * 初始化选中的分隔符
     */
    initSelectedSeparator() {
      const separator = this.joinWithCommaConfig.separator;
      const presetSeparators = SEPARATOR_OPTIONS.filter(option => !option.isCustom).map(option => option.value);

      if (presetSeparators.includes(separator)) {
        this.selectedSeparator = separator;
      } else {
        this.selectedSeparator = 'custom';
        this.customSeparator = separator;
      }
    },

    /**
     * 切换弹出框显示状态
     */
    togglePopover() {
      this.popoverVisible = !this.popoverVisible;
    },

    /**
     * 点击外部区域关闭弹出框
     */
    handleClickOutside(event) {
      if (!this.popoverVisible) return;

      const popover = this.$refs.separatorPopover;
      const popoverEl = popover && popover.popper ? popover.popper : null;

      const isClickInside = popoverEl && popoverEl.contains(event.target);
      const isClickTrigger = event.target.closest('.separator-icon');

      if (!isClickInside && !isClickTrigger) {
        this.popoverVisible = false;
      }
    },

    /**
     * 切换合并模式（单行/多行）
     */
    toggleMergeMode() {
      this.joinWithCommaConfig.mergeToSingleLine = !this.joinWithCommaConfig.mergeToSingleLine;
    },

    /**
     * 去除重复行
     */
    removeDuplicates() {
      const lines = this.text.split('\n');
      const uniqueLines = [...new Set(lines)];
      this.text = uniqueLines.join('\n');
      this.copyText();
    },

    /**
     * 添加引号
     * @param {string} type - 引号类型：'single' 或 'double'
     */
    addQuotes(type) {
      if (!this.text) return;

      const quote = type === 'single' ? "'" : '"';
      const lines = this.text.split('\n');
      const updatedLines = lines.map(line =>
        line !== '' ? `${quote}${line}${quote},` : `${quote}${quote},`
      );

      this.text = updatedLines.join('\n').replace(/,\s*$/, '');
      this.copyText();
    },

    /**
     * 使用分隔符拼接
     */
    joinWithSeparator() {
      const lines = this.text.split('\n');
      const nonEmptyIndices = lines
        .map((line, index) => line.trim() ? index : -1)
        .filter(index => index !== -1);

      const lastNonEmptyIdx = nonEmptyIndices.at(-1);
      let separator = this.joinWithCommaConfig.separator;

      // 处理特殊字符
      if (separator === '\\t') {
        separator = '\t';
      }

      let result = lines.map((line, idx) => {
        return line.trim() ? (idx !== lastNonEmptyIdx ? line + separator : line) : line;
      }).join('\n');

      // 根据配置决定是否合并为一行
      if (this.joinWithCommaConfig.mergeToSingleLine) {
        result = result.replace(/\n/g, '');
      }

      this.text = result;
      this.copyText();
    },

    /**
     * 选择分隔符
     * @param {string} value - 分隔符值
     */
    selectSeparator(value) {
      this.selectedSeparator = value;

      if (value !== 'custom') {
        this.$nextTick(() => {
          this.joinWithCommaConfig.separator = value;
          this.customSeparator = '';
        });
        this.popoverVisible = false;
      }
    },

    /**
     * 确认自定义分隔符
     */
    confirmCustomSeparator() {
      if (this.customSeparator) {
        this.$nextTick(() => {
          this.joinWithCommaConfig.separator = this.customSeparator;
        });
      }
      this.popoverVisible = false;
    },

    /**
     * 处理自定义分隔符输入
     * @param {string} value - 输入值
     */
    handleCustomSeparatorChange(value) {
      if (value) {
        this.$nextTick(() => {
          this.joinWithCommaConfig.separator = value;
        });
      }
    },

    /**
     * 获取分隔符显示名称
     * @returns {string} 分隔符显示名称
     */
    getSeparatorDisplayName() {
      const separator = this.joinWithCommaConfig.separator;
      const option = SEPARATOR_OPTIONS.find(opt => opt.value === separator);

      return option ? option.label : `自定义(${separator})`;
    },

    /**
     * 获取分隔符符号
     * @returns {string} 分隔符符号
     */
    getSeparatorSymbol() {
      const separator = this.joinWithCommaConfig.separator;
      const option = SEPARATOR_OPTIONS.find(opt => opt.value === separator);

      // 处理特殊字符
      if (separator === '\t') {
        return 'Tab';
      }

      return option ? option.symbol : separator;
    },

    /**
     * 转换为JSON格式
     */
    convertToJson() {
      if (!this.text) return;

      this.text = JSON.stringify(this.text.split('\n').filter(line => line !== ''));
      this.copyText();
    },

    /**
     * 合并为一行
     */
    mergeLines() {
      this.text = this.text.replace(/\n/g, '');
      this.copyText();
    },

    /**
     * 去除空行
     */
    removeEmptyLines() {
      const lines = this.text.split('\n');
      const nonEmptyLines = lines.filter(line => line.trim() !== '');
      this.text = nonEmptyLines.join('\n');
      this.copyText();
    },

    /**
     * 复制文本到剪贴板
     */
    copyText() {
      if (!this.text) return;

      this.$refs.codeEditor.selectAll();
      navigator.clipboard.writeText(this.text);

      this.$notifyUtil.success('已自动复制');
    }
  }
}
</script>

<style scoped>
.textArea {
  flex-grow: 1;
  display: flex;
  overflow: hidden;
}

.el-form-item {
  margin-bottom: 10px !important;
}

/* 图标Q弹缩放效果 */
.comma-join-icon {
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-origin: center;
}

.comma-join-icon:hover {
  transform: scale(2);
}

.separator-selector {
  padding: 5px 0;
}

.separator-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}

.separator-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  background-color: #fff;
  min-height: 28px;
  white-space: nowrap;
}

.separator-option:hover {
  border-color: #409eff;
  color: #409eff;
}

.separator-option.active {
  background-color: #409eff;
  border-color: #409eff;
  color: #fff;
}

.separator-option.custom {
  grid-column: span 2;
}

.option-text {
  font-size: 12px;
  font-weight: 500;
  flex: 1;
  margin-right: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.option-symbol {
  font-size: 12px;
  font-weight: bold;
  font-family: monospace;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 1px 3px;
  border-radius: 3px;
  flex-shrink: 0;
  min-width: 20px;
  text-align: center;
}

.separator-option.active .option-symbol {
  background-color: rgba(255, 255, 255, 0.2);
}

.custom-input {
  margin-top: 6px;
  width: 100%;
}

.custom-confirm {
  margin-top: 8px;
  text-align: right;
}

.custom-confirm .el-button {
  padding: 5px 12px;
}

.join-separator-btn{
  height: 28px;
}

.join-separator-btn .separator-icon {
  display: inline-block;
  padding: 1px 4px;
  margin-right: 3px;
  background-color: transparent;
  border: 1px solid #ffffff;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  color: #ffffff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
  top: -1px;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
  font-size: 10px;
}

.separator-icon:hover {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: #ffffff;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.separator-icon:active {
  transform: scale(1.02);
  top: 1px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  background-color: rgba(255, 255, 255, 0.3);
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 深色模式样式 */
body.dark .separator-popover {
  background-color: #28282a !important;
  color: #a0a3a7 !important;
  border: 1px solid #424242 !important;
  box-shadow: 0 2px 12px 0 rgba(255,255,255,.1) !important;
}

body.dark .separator-option {
  background-color: #1D1D1D !important;
  border-color: #424242 !important;
  color: #a0a3a7 !important;
}

body.dark .separator-option:hover {
  border-color: #409eff !important;
  color: #409eff !important;
}

body.dark .separator-option.active {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: #fff !important;
}

body.dark .option-symbol {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

body.dark .separator-option.active .option-symbol {
  background-color: rgba(255, 255, 255, 0.2) !important;
}

body.dark .custom-confirm .el-button {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: #fff !important;
}

body.dark .custom-confirm .el-button:hover {
  background-color: #66b1ff !important;
  border-color: #66b1ff !important;
}

body.dark .separator-icon {
  background-color: transparent !important;
  border: 1px solid #ffffff !important;
  color: #ffffff !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 1px 2px rgba(0, 0, 0, 0.2) !important;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5) !important;
  border-radius: 3px !important;
  padding: 1px 4px !important;
  margin-right: 3px !important;
  font-size: 10px !important;
}

body.dark .separator-icon:hover {
  background-color: rgba(255, 255, 255, 0.15) !important;
  border-color: #ffffff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
  transform: scale(1.05) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

body.dark .separator-icon:active {
  transform: scale(1.02) !important;
  top: 1px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25) !important;
  background-color: rgba(255, 255, 255, 0.2) !important;
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1) !important;
}
</style>
