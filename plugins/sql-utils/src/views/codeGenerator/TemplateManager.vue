<template>
  <div class="template-manager">
    <!-- 模板说明 -->
    <div class="template-description">
      <div class="template-description-content">
        <h4 class="description-title">
          <i class="el-icon-info"></i> 模板使用说明
        </h4>
        <p><strong>1. 模板语法：</strong>本系统使用 Handlebars 模板引擎，支持条件判断、循环等功能。详细文档请参考：<a
            href="https://handlebarsjs.com/zh/guide/" target="_blank">Handlebars 中文指南</a></p>
        <p><strong>2. 数据存储：</strong>自定义模板保存在浏览器的本地存储中（localStorage）。</p>
        <p><strong>3. 数据清除：</strong>清除浏览器缓存或本地存储数据会导致自定义模板丢失。系统默认模板不受影响，会自动重新加载。
        </p>
      </div>
    </div>

    <!-- 模板类型选择 -->
    <div class="template-type-selector">
      <el-tabs v-model="activeTemplateType" type="card" @tab-click="handleTemplateTypeChange">
        <el-tab-pane
            v-for="template in templateTypes"
            :key="template.key"
            :label="template.name"
            :name="template.key"
        >
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 模板版本列表 -->
    <div class="template-list">
      <div class="list-header">
        <el-button type="text" icon="el-icon-download" @click="exportTemplates">导出模板</el-button>
        <el-button type="text" icon="el-icon-upload2" @click="importTemplates">导入模板</el-button>
      </div>

      <el-table :data="getCurrentTemplateVersions()" size="small" height="calc(100vh - 300px)">
        <el-table-column prop="name" label="版本名称" width="250">
          <template slot-scope="scope">
            {{ scope.row.name }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="200">
          <template slot-scope="scope">
            {{ scope.row.isSystemDefault ? '' : scope.row.createTime }}
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="220">
          <template slot-scope="scope">
            <div class="table-actions">
              <!-- 编辑按钮：仅对非系统默认模板显示 -->
              <el-link
                  v-if="!scope.row.isSystemDefault"
                  type="primary"
                  :underline="false"
                  @click="editTemplate(scope.row, true)"
              >编辑
              </el-link>

              <!-- 查看按钮：仅对系统默认模板显示 -->
              <el-link
                  v-if="scope.row.isSystemDefault"
                  type="primary"
                  :underline="false"
                  @click="editTemplate(scope.row, false)"
              >查看
              </el-link>

              <!-- 复制按钮：对所有模板显示 -->
              <el-link
                  type="primary"
                  :underline="false"
                  @click="copyTemplate(scope.row)"
              >复制
              </el-link>

              <!-- 删除按钮：仅对非系统默认模板显示 -->
              <el-popconfirm
                  v-if="!scope.row.isSystemDefault"
                  title="确定要删除这个模板版本吗？"
                  @confirm="deleteTemplate(scope.row)"
              >
                <el-link
                    slot="reference"
                    type="danger"
                    :underline="false"
                >删除
                </el-link>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 使用独立的模板编辑组件 -->
    <template-editor
      :visible.sync="dialogVisible"
      :template="currentTemplate"
      :is-edit="isEditMode"
      :editor-mode="editorMode"
      @save="saveTemplate"
      @close="dialogVisible = false"
    />

    <!-- 模板导入对话框 -->
    <el-dialog
        title="导入模板"
        :visible.sync="importDialogVisible"
        width="400px"
        :modal="true"
        :append-to-body="true"
    >
      <div class="import-dialog-content">
        <el-upload
            ref="upload"
            class="upload-demo"
            drag
            action=""
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :file-list="importFileList"
            accept=".json"
            :limit="1"
            :on-exceed="handleExceed"
        >
          <i class="el-icon-upload"></i>
          <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
          <div class="el-upload__tip" slot="tip">只能上传JSON文件，且只能上传一个文件</div>
        </el-upload>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="importDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="confirmImport" :loading="importLoading">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import TemplateEditor from './TemplateEditor.vue' // 引入独立的模板编辑组件
import {templateConfigs} from '@/config/templateConfig'
import templateLoader from '@/utils/TemplateLoader'
import simpleTemplateManager, {
  SYSTEM_TEMPLATE_PREFIX,
  TEMPLATE_VERSIONS_STORAGE_KEY
} from '@/utils/SimpleTemplateManager'

export default {
  name: 'TemplateManager',
  components: {
    TemplateEditor  // 注册独立的模板编辑组件
  },
  data() {
    return {
      // 当前选中的模板类型
      activeTemplateType: 'javaBean',

      // 模板类型
      templateTypes: templateConfigs,

      // 各模板类型的版本列表
      templateVersionsByType: {},

      // 当前编辑的模板
      currentTemplate: {
        id: '',
        name: '',
        description: '',
        content: ''
      },

      // 对话框状态
      dialogVisible: false,

      // 编辑器模式 - 所有模板都是Handlebars格式
      editorMode: 'handlebars',

      // 默认模板内容
      defaultTemplates: {},

      // 是否为编辑模式
      isEditMode: false,

      // 模板变量说明数据 - 树形结构
      // 注意：这部分数据现在在TemplateEditor组件中维护，这里可以移除
      // 为了保持兼容性，暂时保留空数组
      templateVariables: [],

      // 复制模板相关
      copyTemplateDialogVisible: false,
      copyTemplateForm: {
        name: '',
        template: null
      },

      // 导入模板相关
      importDialogVisible: false,
      importFileList: [],
      importLoading: false
    }
  },
  async created() {
    // 只需加载一次模板
    await templateLoader.loadAllTemplates()
    await this.initTemplateVersions()
  },
  mounted() {
    // 移除事件监听器，改为在打开抽屉时主动刷新数据
  },
  beforeDestroy() {
    // 移除事件监听器
  },
  methods: {
    // 初始化各模板类型的版本列表
    async initTemplateVersions() {
      const savedVersions = localStorage.getItem(TEMPLATE_VERSIONS_STORAGE_KEY)
      if (savedVersions) {
        try {
          const parsedVersions = JSON.parse(savedVersions)

          this.templateVersionsByType = {}
          Object.keys(parsedVersions).forEach(type => {
            this.$set(this.templateVersionsByType, type, parsedVersions[type].map(version => {
              return {
                ...version,
                isSystemDefault: false
              }
            }))
          })
        } catch (error) {
          console.error('解析模板版本失败:', error)
          this.templateVersionsByType = {}
        }
      } else {
        this.templateVersionsByType = {}
      }

      for (const type of this.templateTypes) {
        if (!this.templateVersionsByType[type.key]) {
          this.$set(this.templateVersionsByType, type.key, [])
        }

        const systemDefaultVersion = {
          id: SYSTEM_TEMPLATE_PREFIX + type.key,
          name: '默认',
          description: '系统默认模板，不可删除',
          isSystemDefault: true,
          createTime: new Date().toLocaleString(),
          content: this.getSystemTemplateContent(type.key)
        }

        this.templateVersionsByType[type.key].unshift(systemDefaultVersion)
      }
    },

    // 为指定类型创建默认模板版本
    async createDefaultVersionForType(typeKey) {
      let content = ''
      try {
        // 从文件中获取模板内容
        content = this.getSystemTemplateContent(typeKey)
      } catch (error) {
        console.error(`加载 ${typeKey} 模板失败:`, error)
        content = `// 模板加载失败: ${error.message}`
      }

      const defaultVersion = {
        id: SYSTEM_TEMPLATE_PREFIX + typeKey,  // 使用system-前缀
        name: '默认',
        description: '系统默认模板，不可删除',
        isSystemDefault: true,
        createTime: new Date().toLocaleString(),
        content: content
      }

      if (!this.templateVersionsByType[typeKey]) {
        this.$set(this.templateVersionsByType, typeKey, [])
      }

      this.templateVersionsByType[typeKey].unshift(defaultVersion)
    },

    initDefaultVersions() {
      this.templateVersionsByType = {}

      for (const type of this.templateTypes) {
        let content = ''
        try {
          content = this.getSystemTemplateContent(type.key)
        } catch (error) {
          console.error(`加载 ${type.key} 模板失败:`, error)
          content = `// 模板加载失败: ${error.message}`
        }

        const defaultVersion = {
          id: SYSTEM_TEMPLATE_PREFIX + type.key,
          name: '默认',
          description: '系统默认模板，不可删除',
          isSystemDefault: true,
          createTime: new Date().toLocaleString(),
          content: content
        }

        this.$set(this.templateVersionsByType, type.key, [defaultVersion])
      }

      this.saveTemplateVersions()
    },

    // 保存模板版本列表
    saveTemplateVersions() {
      // 使用SimpleTemplateManager来保存所有模板版本
      try {
        // 遍历所有模板类型，保存用户自定义的模板版本
        for (const templateType in this.templateVersionsByType) {
          const versions = this.templateVersionsByType[templateType];

          // 过滤出用户自定义的模板版本（排除系统默认模板）
          const customVersions = versions.filter(version => !version.isSystemDefault);

          // 如果有用户自定义模板，保存到localStorage
          if (customVersions.length > 0) {
            // 为每个模板类型调用SimpleTemplateManager的upsertTemplateVersion方法
            for (const version of customVersions) {
              simpleTemplateManager.upsertTemplateVersion(templateType, version);
            }
          }
        }
      } catch (error) {
        console.error('保存模板版本到localStorage失败:', error);
      }
    },

    // 获取当前模板类型的名称
    getCurrentTemplateName() {
      const template = this.templateTypes.find(t => t.key === this.activeTemplateType)
      return template ? template.name : ''
    },

    // 获取当前模板类型的版本列表
    getCurrentTemplateVersions() {
      return this.templateVersionsByType[this.activeTemplateType] || []
    },

    // 处理模板类型切换
    handleTemplateTypeChange() {
      // 模板类型切换时的处理逻辑（当前无需特殊处理）
    },
    // 获取系统模板文件内容
    getSystemTemplateContent(templateType) {
      try {
        const template = templateLoader.getTemplate(templateType)
        // 直接返回模板内容（现在是字符串格式）
        return template
      } catch (error) {
        console.error(`获取模板文件内容失败:`, error)
        throw new Error(`无法加载模板类型 ${templateType} 的文件内容`)
      }
    },

    // 更新系统默认模板内容
    updateSystemDefaultTemplates() {
      // 为每种模板类型更新系统默认模板内容
      for (const type of this.templateTypes) {
        const versions = this.templateVersionsByType[type.key] || []
        const systemDefaultVersion = versions.find(v => v.isSystemDefault)

        if (systemDefaultVersion) {
          try {
            // 从文件中获取最新的模板内容
            const content = this.getSystemTemplateContent(type.key)
            // 更新系统默认模板内容
            systemDefaultVersion.content = content
            // 更新时间戳
            systemDefaultVersion.updateTime = new Date().toLocaleString()
          } catch (error) {
            console.error(`更新 ${type.key} 系统默认模板失败:`, error)
          }
        }
      }
    },

    // 确保默认模板内容正确加载
    ensureDefaultTemplateContent() {
      for (const type of Object.keys(this.templateVersionsByType)) {
        const versions = this.templateVersionsByType[type] || []
        const systemDefaultVersion = versions.find(v => v.isSystemDefault)

        // 如果系统默认模板存在但内容为空，则从文件中重新加载内容
        if (systemDefaultVersion) {
          // 确保content是字符串类型
          if (typeof systemDefaultVersion.content !== 'string') {
            systemDefaultVersion.content = ''
          }

          // 检查内容是否为空
          if (!systemDefaultVersion.content || systemDefaultVersion.content.trim() === '') {
            try {
              // 从文件中重新加载模板内容
              systemDefaultVersion.content = this.getSystemTemplateContent(type)
            } catch (error) {
              console.error(`重新加载模板 ${type} 失败:`, error)
              systemDefaultVersion.content = `// 模板加载失败: ${error.message}`
            }
          }
        }
      }
      this.saveTemplateVersions()
    },

    // 编辑模板
    editTemplate(template, isEdit) {
      // 从最新的templateVersionsByType中获取对应模板数据，确保显示最新内容
      const versions = this.templateVersionsByType[this.activeTemplateType]
      const latestTemplate = versions.find(v => v.id === template.id)

      if (latestTemplate) {
        // 使用最新的模板数据
        this.currentTemplate = {...latestTemplate}
      } else {
        // 如果找不到对应模板，使用传入的模板数据
        this.currentTemplate = {...template}
      }

      // 设置编辑模式
      this.isEditMode = isEdit

      // 显示抽屉
      this.dialogVisible = true
    },

    // 保存模板
    saveTemplate(template) {
      if (!template.name) {
        this.$notifyUtil.warning('提示', '请输入版本名称');
        return
      }

      // 使用SimpleTemplateManager统一管理模板版本的保存
      const success = simpleTemplateManager.upsertTemplateVersion(this.activeTemplateType, template);
      if (!success) {
        this.$notifyUtil.error('保存失败', '模板版本保存失败');
        return;
      }

      // 重新初始化模板版本数据
      this.initTemplateVersions();

      this.dialogVisible = false
      this.$notifyUtil.success('成功', '模板保存成功');

      // 通知父组件模板已更新
      this.$emit('template-updated')

      // 只有在编辑当前选中的模板版本时才重新生成代码
      if (this.$parent && this.$parent.activeTemplateVersion === template.id) {
        // 直接调用convert方法重新生成代码，无需切换版本
        if (this.$parent.convert && this.$parent.ddl) {
          this.$parent.convert();
        }
      }
    },


    // 删除模板
    deleteTemplate(template) {
      // 不允许删除系统默认模板
      if (template.isSystemDefault) {
        this.$notifyUtil.warning('提示', '系统默认模板不能删除');
        return
      }

      // 使用SimpleTemplateManager统一管理模板版本的删除
      const success = simpleTemplateManager.deleteTemplateVersion(this.activeTemplateType, template.id);
      if (!success) {
        this.$notifyUtil.error('删除失败', '模板版本删除失败');
        return;
      }

      // 重新初始化模板版本数据
      this.initTemplateVersions();

      this.$notifyUtil.success('成功', '模板删除成功');
    },

    // 复制模板
    copyTemplate(template) {
      // 设置要复制的模板
      this.copyTemplateForm.template = template;
      // 默认新版本名称为原版本名称 + " - 副本"
      this.copyTemplateForm.name = template.name + ' - 副本';
      // 显示Popconfirm确认框
      this.$prompt('请输入新版本名称', '复制模板', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: this.copyTemplateForm.name,
        inputPattern: /^.{1,50}$/,
        inputErrorMessage: '版本名称长度应在1-50个字符之间'
      }).then(({value}) => {
        // 用户点击确定，创建新版本
        this.createCopyTemplate(value);
      }).catch(() => {
        // 用户点击取消或关闭对话框
        this.copyTemplateForm.template = null;
        this.copyTemplateForm.name = '';
      });
    },

    // 创建复制的模板
    createCopyTemplate(name) {
      if (!name) {
        this.$notifyUtil.warning('提示', '请输入版本名称');
        return;
      }

      // 创建新版本
      const newVersion = {
        id: 'custom_' + Date.now(),
        name: name,
        description: '',
        isSystemDefault: false,
        createTime: new Date().toLocaleString(),
        content: this.copyTemplateForm.template.content
      };

      // 使用SimpleTemplateManager统一管理模板版本的保存
      const success = simpleTemplateManager.upsertTemplateVersion(this.activeTemplateType, newVersion);
      if (!success) {
        this.$notifyUtil.error('保存失败', '模板版本保存失败');
        return;
      }

      // 重新初始化模板版本数据
      this.initTemplateVersions();

      this.$notifyUtil.success('成功', '新版本创建成功');

      // 清空表单
      this.copyTemplateForm.template = null;
      this.copyTemplateForm.name = '';

      // 通知父组件模板已更新
      this.$emit('template-updated');
    },

    // 导出模板功能
    exportTemplates() {
      try {
        // 检查是否有自定义模板
        let hasCustomTemplates = false;
        const exportData = {};

        for (let type in this.templateVersionsByType) {
          const versions = this.templateVersionsByType[type];
          // 过滤掉系统默认模板，只导出自定义模板
          const customVersions = versions.filter(version => !version.isSystemDefault);

          if (customVersions.length > 0) {
            hasCustomTemplates = true;
            // 导出时不包含isSystemDefault字段
            exportData[type] = customVersions.map(version => {
              const {isSystemDefault, ...exportVersion} = version;
              return exportVersion;
            });
          }
        }

        if (!hasCustomTemplates) {
          this.$notifyUtil.info('提示', '当前没有可导出的自定义模板');
          return;
        }

        // 创建要导出的数据对象
        const exportObj = {
          version: '1.0',
          exportTime: new Date().toISOString(),
          templates: exportData
        };

        // 转换为JSON字符串
        const jsonData = JSON.stringify(exportObj, null, 2);

        // 创建Blob对象
        const blob = new Blob([jsonData], {type: 'application/json;charset=utf-8;'});

        // 创建下载链接
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        // 设置下载文件名
        const fileName = `templates-export-${new Date().getTime()}.json`;

        // 设置链接属性
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);

        // 触发下载
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.$notifyUtil.success('成功', '模板导出成功');
      } catch (error) {
        console.error('导出模板失败:', error);
        this.$notifyUtil.error('导出失败', '模板导出过程中发生错误: ' + error.message);
      }
    },

    // 导入模板功能
    importTemplates() {
      this.importDialogVisible = true
    },

    // 处理文件选择变化
    handleFileChange(file, fileList) {
      this.importFileList = fileList
    },

    // 处理文件移除
    handleFileRemove(file, fileList) {
      this.importFileList = fileList
    },

    // 处理文件数量超出限制
    handleExceed(files, fileList) {
      this.$notifyUtil.warning('提示', '只能上传一个文件');
    },

    // 确认导入模板
    confirmImport() {
      if (this.importFileList.length === 0) {
        this.$notifyUtil.warning('提示', '请选择要导入的文件');
        return
      }

      this.importLoading = true

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result)

          // 验证导入数据格式
          if (importedData.version !== '1.0' || !importedData.templates) {
            throw new Error('导入数据格式不正确')
          }

          // 验证模板数据
          const importedTemplates = importedData.templates;
          for (let type in importedTemplates) {
            if (!Array.isArray(importedTemplates[type])) {
              throw new Error('模板数据格式不正确')
            }

            // 验证每个模板版本的数据结构
            for (let version of importedTemplates[type]) {
              if (!version.id || !version.name || version.content === undefined) {
                throw new Error('模板版本数据不完整')
              }
            }
          }


          // 合并导入的模板和现有的模板
          // 对于每种模板类型，保留现有的版本，并添加导入的新版本
          for (let type in importedTemplates) {
            // 如果当前没有这种模板类型，则直接添加
            if (!this.templateVersionsByType[type]) {
              // 导入的模板默认isSystemDefault为false
              this.templateVersionsByType[type] = importedTemplates[type].map(version => ({
                ...version,
                isSystemDefault: false
              }))
            } else {
              // 合并现有版本和导入版本
              const existingVersions = this.templateVersionsByType[type]
              const importedVersions = importedTemplates[type]

              // 创建一个映射来跟踪现有的版本ID
              const existingVersionMap = {}
              existingVersions.forEach(version => {
                existingVersionMap[version.id] = version
              })

              // 处理导入的版本
              importedVersions.forEach(importedVersion => {
                // 如果导入的版本ID已存在，则更新内容（但保持系统默认状态不变）
                if (existingVersionMap[importedVersion.id]) {
                  const existingVersion = existingVersionMap[importedVersion.id]
                  // 更新版本内容，但保持系统默认状态不变
                  const wasSystemDefault = existingVersion.isSystemDefault
                  // 更新版本内容（排除isSystemDefault字段）
                  Object.assign(existingVersion, {
                    ...importedVersion,
                    isSystemDefault: wasSystemDefault
                  })
                } else {
                  // 如果是新的版本，则直接添加，默认isSystemDefault为false
                  existingVersions.push({
                    ...importedVersion,
                    isSystemDefault: false
                  })
                }
              })
            }
          }


          // 保存到localStorage
          this.saveTemplateVersions()

          this.$notifyUtil.success('成功', '模板导入成功');

          // 关闭对话框
          this.importDialogVisible = false

          // 清空文件列表
          this.importFileList = []

          // 通知父组件模板已更新
          this.$emit('template-updated')
        } catch (error) {
          console.error('导入模板失败:', error);
          this.$notifyUtil.error('导入失败', '模板导入过程中发生错误: ' + error.message);
        } finally {
          this.importLoading = false
        }
      }

      reader.onerror = () => {
        this.$notifyUtil.error('导入失败', '文件读取失败');
        this.importLoading = false
      }

      reader.readAsText(this.importFileList[0].raw)
    },

    // 编辑器输入事件
    onEditorInput(value) {
      this.currentTemplate.content = value
    }
  }
}
</script>

<style scoped>
.template-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.template-list {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex
}

.list-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  color: #303133;
}

/* 深色模式（.dark 激活时）样式 */
.dark .list-header h3 {
  color: #C0C4CC; /* 深色模式下的文字颜色 */
}

.list-header button {
  margin-left: 10px;
}

/* 模板说明样式 */
.template-description-content {
  padding: 15px;
  font-size: 13px;
  margin-bottom: 10px;
  background-color: #f4f4f5;
  border-radius: 4px;
  line-height: 1.6;
  border-left: 4px solid #409EFF;
}

/* 深色模式样式 */
.dark .template-description-content {
  background-color: #2d2d2d;
  color: #c0c4cc;
}

.description-title {
  margin-top: 0;
  margin-bottom: 15px;
  color: #409EFF;
  font-weight: bold;
  display: flex;
  align-items: center;
}

.description-title i {
  margin-right: 8px;
}

.template-description-content p {
  margin: 8px 0;
}

.template-description-content a {
  color: #409EFF;
  text-decoration: none;
}

.template-description-content a:hover {
  text-decoration: underline;
}

/* 表格操作列样式 */
.table-actions {
  display: flex;
  align-items: center;
}

.table-actions .el-link {
  font-size: 12px;
  margin-right: 10px;
}

/* 新建版本抽屉样式 */
.new-version-drawer .el-drawer__body {
  padding: 0;
  display: flex;
  flex-direction: column;
}

.new-version-form {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.el-drawer__header {
  margin-bottom: 10px !important;
}

.import-dialog-content {
  padding: 20px 0;
}

.upload-demo {
  width: 100%;
}

.dialog-footer {
  text-align: right;
  padding: 10px 20px 20px;
}
</style>
