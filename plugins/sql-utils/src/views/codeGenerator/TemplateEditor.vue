<template>
  <el-drawer
    :title="drawerTitle"
    :visible.sync="dialogVisible"
    direction="rtl"
    size="85%"
    :modal="true"
    :modal-append-to-body="true"
    :append-to-body="true"
    :destroy-on-close="true"
    class="template-edit-drawer"
    @opened="onDrawerOpened"
  >
    <div class="drawer-container" v-if="currentTemplate">
      <!-- 上部：版本名称 -->
      <div class="drawer-header" v-if="!currentTemplate.isSystemDefault">
        <el-form :model="currentTemplate" label-width="100px">
          <el-form-item label="版本名称">
            <el-input v-model="currentTemplate.name" placeholder="请输入版本名称" :readonly="!isEditMode"/>
          </el-form-item>
        </el-form>
      </div>

      <!-- 中部：左右分栏布局 -->
      <div class="drawer-content">
        <!-- 左侧：代码编辑器 -->
        <div class="editor-section">
          <div class="section-title">模板代码</div>
          <div class="template-editor">
            <CodeEditor
              ref="codeEditor"
              v-model="currentTemplate.content"
              :mode="editorMode"
              height="100%"
              :readonly="!isEditMode"
              @input="onEditorInput"
            />
          </div>
        </div>

        <!-- 右侧：变量说明 -->
        <div class="help-section">
          <div class="section-title">可用变量说明</div>
          <div class="variables-table-container">
            <el-table
              :data="templateVariables"
              border
              style="width: 100%"
              height="100%"
              size="small"
              row-key="id"
              default-expand-all
              :tree-props="{children: 'children'}"
            >
              <el-table-column
                prop="variable"
                label="变量名"
              >
              </el-table-column>
              <el-table-column
                prop="description"
                label="说明">
              </el-table-column>
              <el-table-column
                prop="type"
                label="类型"
                width="80">
              </el-table-column>
              <el-table-column
                prop="example"
                label="示例"
                width="150">
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>

      <!-- 底部：按钮区域 -->
      <div class="drawer-footer">
        <el-button @click="closeDrawer" v-if="!isEditMode">关闭</el-button>
        <template v-else>
          <el-button type="primary" @click="saveTemplate">保存</el-button>
          <el-button @click="closeDrawer">取消</el-button>
        </template>
      </div>
    </div>
  </el-drawer>
</template>

<script>
import CodeEditor from '@/components/CodeEditor.vue'

export default {
  name: 'TemplateEditor',
  components: {
    CodeEditor
  },
  props: {
    // 控制抽屉显示/隐藏
    visible: {
      type: Boolean,
      default: false
    },
    // 当前编辑的模板数据
    template: {
      type: Object,
      default: () => ({})
    },
    // 是否为编辑模式
    isEdit: {
      type: Boolean,
      default: false
    },
    // 编辑器模式
    editorMode: {
      type: String,
      default: 'handlebars'
    }
  },
  data() {
    return {
      // 当前模板数据（内部副本）
      currentTemplate: null,
      // 抽屉标题
      drawerTitle: '查看模板版本',
      // 模板变量说明数据 - 树形结构
      templateVariables: [
        {
          id: 'package',
          variable: '包名相关',
          description: '包名相关变量',
          type: 'Object',
          example: '',
          children: [
            {
              id: 'package.fullPackage',
              variable: '{{fullPackage}}',
              description: '完整包名',
              type: 'String',
              example: 'com.example.system'
            },
            {
              id: 'package.basePackage',
              variable: '{{basePackage}}',
              description: '基础包名',
              type: 'String',
              example: 'com.example'
            },
            {
              id: 'package.subPackage',
              variable: '{{subPackage}}',
              description: '二级包名',
              type: 'String',
              example: 'system'
            }
          ]
        },
        {
          id: 'table',
          variable: 'tableInfo',
          description: '表信息对象',
          type: 'Object',
          example: '',
          children: [
            {
              id: 'table.tableName',
              variable: '{{tableName}}',
              description: '数据库表名',
              type: 'String',
              example: 'user_info'
            },
            {
              id: 'table.tableComment',
              variable: '{{tableComment}}',
              description: '表注释',
              type: 'String',
              example: '用户信息表'
            },
            {
              id: 'table.imports',
              variable: '{{imports}}',
              description: '导入语句',
              type: 'String',
              example: 'import java.util.Date;'
            },
            {
              id: 'table.fields',
              variable: '{{fields}}',
              description: '字段列表数组',
              type: 'Array',
              example: '字段对象数组',
              children: [
                {
                  id: 'field.fieldName',
                  variable: '{{fieldName}}',
                  description: '数据库字段名',
                  type: 'String',
                  example: 'user_name'
                },
                {
                  id: 'field.camelFieldName',
                  variable: '{{camelFieldName}}',
                  description: '驼峰命名字段名',
                  type: 'String',
                  example: 'userName'
                },
                {
                  id: 'field.comment',
                  variable: '{{comment}}',
                  description: '字段注释',
                  type: 'String',
                  example: '这是注释'
                },
                {
                  id: 'field.javaType',
                  variable: '{{javaType}}',
                  description: 'Java字段类型',
                  type: 'String',
                  example: 'String'
                },
                {
                  id: 'field.isPrimaryKey',
                  variable: '{{isPrimaryKey}}',
                  description: '是否为主键字段',
                  type: 'Boolean',
                  example: 'true/false'
                }
              ]
            }
          ]
        },
        {
          id: 'common',
          variable: '通用变量',
          description: '通用变量',
          type: 'Object',
          example: '',
          children: [
            {
              id: 'common.upperCamelTableName',
              variable: '{{upperCamelTableName}}',
              description: '大驼峰表名',
              type: 'String',
              example: 'UserInfo'
            },
            {
              id: 'common.lowerCamelTableName',
              variable: '{{lowerCamelTableName}}',
              description: '小驼峰表名',
              type: 'String',
              example: 'userInfo'
            },
            {
              id: 'common.author',
              variable: '{{author}}',
              description: '作者信息',
              type: 'String',
              example: '张三'
            },
            {
              id: 'common.currentDate',
              variable: '{{currentDate}}',
              description: '当前日期',
              type: 'String',
              example: '2024/1/1'
            },
            {
              id: 'common.mapperFullName',
              variable: '{{mapperFullName}}',
              description: 'Mapper类完整名',
              type: 'String',
              example: 'com.example.mapper.UserInfoMapper'
            }
          ]
        },
        {
          id: 'options',
          variable: '生成选项',
          description: '代码生成选项',
          type: 'Object',
          example: '',
          children: [
            {
              id: 'options.genComment',
              variable: '{{genComment}}',
              description: '是否生成注释',
              type: 'Boolean',
              example: 'true/false'
            },
            {
              id: 'options.genLombok',
              variable: '{{genLombok}}',
              description: '是否生成Lombok注解',
              type: 'Boolean',
              example: 'true/false'
            },
            {
              id: 'options.genSwagger',
              variable: '{{genSwagger}}',
              description: '是否生成Swagger注解',
              type: 'Boolean',
              example: 'true/false'
            }
          ]
        }
      ]
    }
  },
  computed: {
    // 计算属性，控制抽屉显示/隐藏
    dialogVisible: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      }
    },
    // 计算属性，控制编辑模式
    isEditMode: {
      get() {
        return this.isEdit
      },
      set(val) {
        this.$emit('update:isEdit', val)
      }
    }
  },
  watch: {
    // 监听模板数据变化
    template: {
      handler(newVal) {
        if (newVal) {
          this.currentTemplate = {...newVal}
        }
      },
      immediate: true,
      deep: true
    },
    // 监听编辑模式变化
    isEdit: {
      handler(newVal) {
        this.drawerTitle = newVal ? '编辑模板版本' : '查看模板版本'
      },
      immediate: true
    }
  },
  methods: {
    // 关闭抽屉
    closeDrawer() {
      this.dialogVisible = false
      this.$emit('close')
    },
    // 保存模板
    saveTemplate() {
      if (!this.currentTemplate.name) {
        this.$notifyUtil.warning('提示', '请输入版本名称')
        return
      }

      // 发送保存事件，传递当前模板数据
      this.$emit('save', {...this.currentTemplate})
    },
    // 编辑器输入事件
    onEditorInput(value) {
      this.currentTemplate.content = value
    },
    // 抽屉打开后的回调
    onDrawerOpened() {
      // 抽屉打开后的一些初始化操作
      this.$emit('opened')
    }
  }
}
</script>

<style scoped>
/* 抽屉样式 */
.template-edit-drawer .el-drawer__body {
  padding: 0;
  height: 100%;
}

.drawer-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 上部：版本名称 */
.drawer-header .el-form-item {
  margin-bottom: 18px;
}

/* 中部：左右分栏布局 */
.drawer-content {
  flex: 1;
  display: flex;
  padding: 20px;
  gap: 20px;
  overflow: hidden;
}

/* 左侧：代码编辑器区域（占55%） */
.editor-section {
  flex: 5.5;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 右侧：帮助说明区域（占45%） */
.help-section {
  flex: 4.5;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 区域标题 */
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}

/* 深色模式（.dark 激活时）样式 */
.dark .section-title {
  color: #C0C4CC; /* 深色模式下的文字颜色 */
}

/* 模板编辑器 */
.template-editor {
  flex: 1;
  border-radius: 4px;
  overflow: hidden;
}

/* 变量表格容器 */
.variables-table-container {
  flex: 1;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 10px;
}

.variables-table-container ::v-deep .el-table__row {
  cursor: default;
}

.variables-table-container ::v-deep .el-table__row .el-table__expand-icon {
  color: #409EFF;
}

.variables-table-container ::v-deep .el-table__row.level-1 td:first-child {
  padding-left: 24px;
}

.variables-table-container ::v-deep .el-table__row.level-2 td:first-child {
  padding-left: 48px;
}

.drawer-footer {
  padding: 10px;
  text-align: left;
}
</style>
