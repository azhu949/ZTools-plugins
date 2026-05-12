<template>
  <div class="app">
    <div class="cgLeft">
      <div class="cgLeftTop">
        <CodeEditor
            ref="ddlEditor"
            mode="sql"
            v-model="ddl"
            :autofocus="true"
            placeholder="请输入DDL建表语句"
            @change="ddlChange"
        />
      </div>
      <div class="cgLeftBottom">
        <el-table
            :data="tableInfo.fields"
            height="100%"
            size="mini"
        >
          <el-table-column :label="tableTitle">
            <el-table-column
                prop="fieldName"
                label="字段名"/>
            <el-table-column
                prop="fieldType"
                label="数据类型"/>
            <el-table-column
                prop="javaType"
                label="Java类型"/>
            <el-table-column
                prop="comment"
                label="字段说明"
                show-overflow-tooltip
            />
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="cgRight">
      <div class="cgRightTop">
        <div class="function-buttons">
          <el-button type="primary" size="small" icon="el-icon-set-up" @click="showTypeMapping">类型映射</el-button>
          <el-button type="primary" size="small" icon="el-icon-setting" @click="showGenerationConfig">生成配置
          </el-button>
          <el-button type="primary" size="small" icon="el-icon-document" @click="showTemplateManager">模板管理
          </el-button>
          <el-button type="danger" size="small" icon="el-icon-delete" @click="clearTemplateCache">清除缓存</el-button>
        </div>
      </div>
      <div class="cgRightBottom">
        <el-tabs v-model="genType" tab-position="left" class="left-tabs">
          <el-tab-pane
              v-for="template in templates"
              :key="template.key"
              :label="template.name"
              :name="template.key"
          >
            <div class="template-container">
              <template-options
                  :options="template.options"
                  :model="templateData[template.key]"
                  @change="onTemplateOptionsChange"
              />

              <!-- 使用单选按钮组替换模板版本标签页 -->
              <div v-if="templateVersions && templateVersions.length > 0" class="template-version-selector">
                <div class="template-version-buttons">
                  <el-button
                      v-for="version in templateVersions"
                      :key="version.id"
                      plain
                      size="mini"
                      class="template-version-button"
                      :class="{ 'active': activeTemplateVersion === version.id }"
                      @click="handleVersionChange(version.id)"
                  >
                    {{ version.name }}
                    <i
                        v-if="!simpleTemplateManager.isSystemDefaultVersion(version.id)"
                        class="el-icon-edit-outline edit-icon"
                        @click.stop.prevent.self="editTemplateVersion(version)"
                        @mousedown.prevent
                    ></i>
                  </el-button>
                </div>

                <!-- 单一代码编辑器实例 -->
                <div class="template-content">
                  <CodeEditor
                      ref="resultCodeEditor"
                      mode="text/x-java"
                      v-model="templateData[template.key].genResult"
                  />
                </div>
              </div>

            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 类型映射抽屉 -->
    <type-mapping-drawer
        :visible.sync="typeMappingVisible"
        @saved="onTypeMappingSaved"
    ></type-mapping-drawer>

    <!-- 生成配置抽屉 -->
    <generation-config-drawer
        :visible.sync="generationConfigVisible"
        @saved="onGenerationConfigSaved"
    ></generation-config-drawer>

    <!-- 模板管理抽屉 -->
    <el-drawer
        title="模板管理"
        :visible.sync="templateManagerVisible"
        direction="rtl"
        size="90%"
        :before-close="handleTemplateManagerClose"
    >
      <template-manager
          ref="templateManager"
          @template-updated="onTemplateUpdated"
      />
    </el-drawer>

    <!-- 模板编辑抽屉 -->
    <template-editor
        :visible.sync="templateEditVisible"
        :template="currentEditingTemplate"
        :is-edit="templateEditIsEditable"
        @save="saveTemplateVersion"
        @close="templateEditVisible = false"
    />
  </div>
</template>

<script>
import CodeEditor from '@/components/CodeEditor.vue'
import TemplateOptions from './TemplateOptions.vue'
import TypeMappingDrawer from './TypeMappingDrawer.vue'
import GenerationConfigDrawer from './GenerationConfigDrawer.vue'
import TemplateManager from './TemplateManager.vue'
import TemplateEditor from './TemplateEditor.vue'
import debounce from 'lodash/debounce';
import simpleTemplateManager, {
  ACTIVE_TEMPLATE_VERSION_PREFIX,
  SYSTEM_TEMPLATE_PREFIX,
  TEMPLATE_VERSIONS_STORAGE_KEY
} from '@/utils/SimpleTemplateManager';

export default {
  components: {CodeEditor, TemplateOptions, TypeMappingDrawer, GenerationConfigDrawer, TemplateManager, TemplateEditor},
  data() {
    return {
      ddl: '',
      tableTitle: '输入DDL建表语句自动解析',
      tableInfo: {
        tableName: '',
        tableComment: '',
        fields: [],
        imports: ''
      },
      genType: 'javaBean',
      genResult: '',
      currentDate: new Date().toLocaleDateString(),
      templates: [],
      templateData: {},
      currentResult: '',
      typeMappingVisible: false,
      generationConfigVisible: false,
      templateManagerVisible: false,
      // 添加模板版本相关数据
      templateVersions: [],
      activeTemplateVersion: '',
      // 模板编辑抽屉相关数据
      templateEditVisible: false,
      templateEditIsEditable: false,
      currentEditingTemplate: null,
      // 生成配置，默认值
      generationConfig: {
        basePackage: 'com.example.demo',
        author: 'Developer',
        subPackages: {}
      },
      // 定义防抖通知函数
      debouncedNotify: null,
      // 添加simpleTemplateManager引用
      simpleTemplateManager: simpleTemplateManager
    };
  },
  created() {
    // 在 created 钩子中初始化防抖函数
    this.debouncedNotify = debounce(() => {
      this.$notifyUtil.error('DDL解析失败', '请检查语句是否正确');
    }, 500); // 500 毫秒防抖时间
  },
  mounted() {
    // 初始化简化版模板管理器
    this.initSimpleTemplateManager().then(() => {
      // 加载生成配置
      this.loadGenerationConfig();

      // 初始化模板版本数据
      this.initTemplateVersions();
    });
  },
  watch: {
    genType() {
      // 当切换标签页时重新生成代码
      this.convert();

      // 当切换模板类型时，重新加载对应的模板版本
      this.initTemplateVersions();
    }
  },
  methods: {
    /**
     * 初始化简化版模板管理器
     */
    async initSimpleTemplateManager() {
      try {
        // 设置工具实例
        simpleTemplateManager.setUtils(this.$handlebarsUtil, this.$strUtil);

        // 初始化系统默认模板
        await simpleTemplateManager.initSystemTemplates();

        // 获取所有模板配置
        this.templates = simpleTemplateManager.getAllTemplateConfigs();

        // 初始化模板数据
        this.initTemplateData();
      } catch (error) {
        console.error('初始化简化版模板管理器失败:', error);
        this.$notifyUtil.error('初始化失败', '模板管理器初始化失败，请刷新页面重试');
      }
    },

    /**
     * 初始化模板数据
     */
    initTemplateData() {
      this.templates.forEach(template => {
        this.$set(this.templateData, template.key, {});

        // 设置默认值
        template.options.forEach(option => {
          if (option.type === 'checkbox') {
            // 明确检查 option.default 是否存在，而不是使用 || 运算符
            if (option.default !== undefined) {
              this.$set(this.templateData[template.key], option.key, option.default);
            } else {
              this.$set(this.templateData[template.key], option.key, false);
            }
          } else if (option.type === 'input') {
            // 明确检查 option.default 是否存在，而不是使用 || 运算符
            if (option.default !== undefined) {
              this.$set(this.templateData[template.key], option.key, option.default);
            } else {
              this.$set(this.templateData[template.key], option.key, '');
            }
          }
        });

        // 初始化genResult
        this.$set(this.templateData[template.key], 'genResult', '');
      });
    },

    /**
     * 初始化模板版本数据
     */
    async initTemplateVersions() {
      try {
        // 获取当前模板类型的版本列表（总是包含系统默认模板）
        this.templateVersions = simpleTemplateManager.getTemplateVersions(this.genType);

        // 设置当前激活的模板版本
        this.activeTemplateVersion = simpleTemplateManager.getActiveTemplateVersion(this.genType);

        // 如果没有选中的版本，但有版本列表，则默认选中第一个（应该是系统默认模板）
        if (!this.activeTemplateVersion && this.templateVersions.length > 0) {
          this.activeTemplateVersion = this.templateVersions[0].id;
        }

        // 确保simpleTemplateManager中的当前模板内容正确
        if (this.activeTemplateVersion) {
          simpleTemplateManager.switchTemplateVersion(this.genType, this.activeTemplateVersion);
        } else if (this.templateVersions.length > 0) {
          // 如果没有激活的版本但有模板版本，则默认激活第一个（系统默认模板）
          this.activeTemplateVersion = this.templateVersions[0].id;
          simpleTemplateManager.switchTemplateVersion(this.genType, this.activeTemplateVersion);
        }
      } catch (error) {
        console.error('初始化模板版本数据失败:', error);
      }
    },
    /**
     * 模板选项更改处理
     */
    onTemplateOptionsChange() {
      // 重新生成代码
      this.convert();
    },

    /**
     * 处理版本切换
     */
    handleVersionChange(versionId) {
      // 切换模板版本
      const success = simpleTemplateManager.switchTemplateVersion(this.genType, versionId);
      if (success) {
        this.activeTemplateVersion = versionId;
        // 重新生成代码
        this.convert();
      }
    },
    /**
     * DDL变更处理
     */
    ddlChange(val) {
      this.ddl = val
      if (this.ddl === '') {
        this.tableTitle = '输入DDL建表语句自动解析'
        this.tableInfo = {
          tableName: '',
          tableComment: '',
          fields: []
        }
        // 清空所有模板的genResult
        this.templates.forEach(template => {
          this.$set(this.templateData[template.key], 'genResult', '');
        });
      } else {
        this.convert()
      }
    },
    /**
     * 代码转换
     */
    convert() {
      if (!this.ddl) {
        return;
      }

      let parseResult = this.$ddlParser.parseDDL(this.ddl);
      if (this.ddl && null == parseResult) {
        this.tableTitle = '输入DDL建表语句自动解析'
        this.tableInfo = {
          tableName: '',
          tableComment: '',
          fields: []
        }
        this.debouncedNotify()
        return
      }

      this.tableInfo = parseResult;
      let tableComment = this.tableInfo.tableComment ? `(${this.tableInfo.tableComment})` : '';
      this.tableTitle = this.tableInfo.tableName + tableComment;

      // 获取当前模板配置
      const currentTemplate = this.templates.find(t => t.key === this.genType);

      // 获取当前模板的二级包名
      const currentSubPackage = this.generationConfig.subPackages && this.generationConfig.subPackages[this.genType]
          ? this.generationConfig.subPackages[this.genType]
          : (currentTemplate ? currentTemplate.subPackage : '');

      // 构建完整包名
      const fullPackageName = currentSubPackage
          ? `${this.generationConfig.basePackage}.${currentSubPackage}`
          : this.generationConfig.basePackage;

      // 获取其他相关包名
      const entitySubPackage = this.generationConfig.subPackages && this.generationConfig.subPackages['javaBean']
          ? this.generationConfig.subPackages['javaBean']
          : 'entity';
      const entityPackageName = entitySubPackage
          ? `${this.generationConfig.basePackage}.${entitySubPackage}`
          : this.generationConfig.basePackage;

      const mapperSubPackage = this.generationConfig.subPackages && this.generationConfig.subPackages['mapper']
          ? this.generationConfig.subPackages['mapper']
          : 'mapper';
      const mapperPackageName = mapperSubPackage
          ? `${this.generationConfig.basePackage}.${mapperSubPackage}`
          : this.generationConfig.basePackage;

      // 转换类名
      const upperCamelTableName = this.$strUtil.snakeToUpperCamel(this.tableInfo.tableName);
      const lowerCamelTableName = this.$strUtil.snakeToCamel(this.tableInfo.tableName);
      const mapperFullName = `${mapperPackageName}.${upperCamelTableName}Mapper`;

      // 转换字段名
      const processedFields = this.tableInfo.fields.map(field => ({
        ...field,
        camelFieldName: this.$strUtil.snakeToCamel(field.fieldName)
      }));

      // 合并当前模板数据和组件数据
      const templateData = {
        ...this.$data,
        ...this.templateData[this.genType],
        basePackage: this.generationConfig.basePackage,  // 基础包名
        author: this.generationConfig.author,  // 作者信息
        subPackage: currentSubPackage,  // 当前模板的二级包名
        fullPackage: fullPackageName,  // 完整包名
        entityPackage: entityPackageName,  // Entity包名
        mapperPackage: mapperPackageName,  // Mapper包名
        mapperFullName: mapperFullName,  // Mapper类完整名
        upperCamelTableName: upperCamelTableName,  // 大驼峰表名
        lowerCamelTableName: lowerCamelTableName,  // 小驼峰表名
        currentDate: new Date().toLocaleDateString(),  // 当前日期
        // 确保模板选项正确传递，使用显式检查
        genComment: this.templateData[this.genType].genComment !== undefined ?
            (this.templateData[this.genType].genComment === true) : false,
        genLombok: this.templateData[this.genType].genLombok !== undefined ?
            (this.templateData[this.genType].genLombok === true) : false,
        genSwagger: this.templateData[this.genType].genSwagger !== undefined ?
            (this.templateData[this.genType].genSwagger === true) : false,
        // 更新tableInfo，添加转换后的字段名
        tableInfo: {
          ...this.tableInfo,
          fields: processedFields
        }
      };

      // 使用简化版模板管理器渲染模板
      try {
        const result = simpleTemplateManager.renderTemplate(this.genType, templateData);
        // 将结果保存到当前模板的genResult中
        this.$set(this.templateData[this.genType], 'genResult', result);
      } catch (error) {
        console.error('模板渲染失败:', error);
        this.$notifyUtil.error('模板渲染失败', error.message);
      }
    },

    // 显示类型映射抽屉
    showTypeMapping() {
      this.typeMappingVisible = true;
    },

    // 类型映射保存后的回调
    onTypeMappingSaved(mappings) {
      // 这里可以添加逻辑，例如重新生成代码
      // 可以重新解析DDL并重新生成代码
      this.convert();
    },

    // 显示生成配置抽屉
    showGenerationConfig() {
      this.generationConfigVisible = true;
    },

    // 生成配置保存后的回调
    onGenerationConfigSaved(config) {
      this.generationConfig = config;
      // 重新生成代码
      this.convert();
    },

    // 加载生成配置
    loadGenerationConfig() {
      try {
        const savedConfig = localStorage.getItem('generationConfig');
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          // 确保 subPackages 存在
          if (!parsedConfig.subPackages) {
            parsedConfig.subPackages = {};
          }
          this.generationConfig = parsedConfig;
        }
      } catch (error) {
        console.error('加载生成配置失败:', error);
      }
    },

    // 显示模板管理抽屉
    showTemplateManager() {
      this.templateManagerVisible = true;
      // 重新加载模板管理器数据，确保显示最新内容
      this.$nextTick(() => {
        if (this.$refs.templateManager) {
          this.$refs.templateManager.initTemplateVersions();
        }
      });
    },

    // 关闭模板管理抽屉
    async handleTemplateManagerClose(done) {
      try {
        // 在关闭模板管理页面时，重新初始化模板版本数据
        await this.initTemplateVersions();

        // 如果当前有选中的模板版本，重新生成代码
        if (this.ddl && this.activeTemplateVersion) {
          this.convert();
        }
      } catch (error) {
        console.error('关闭模板管理器时出错:', error);
      } finally {
        // 完成关闭操作
        done();
      }
    },

    /**
     * 模板更新后的回调
     */
    async onTemplateUpdated() {
      // 重新初始化简化版模板管理器
      await this.initSimpleTemplateManager();

      // 重新生成代码
      this.convert();
    },

    /**
     * 编辑模板版本
     */
    editTemplateVersion(version) {
      // 查找对应版本的完整数据
      const fullVersion = this.templateVersions.find(v => v.id === version.id);
      if (fullVersion) {
        // 设置当前编辑的模板数据
        this.currentEditingTemplate = {...fullVersion};

        // 设置编辑模式（非系统默认模板可编辑）
        this.templateEditIsEditable = !fullVersion.isSystemDefault;

        // 显示模板编辑抽屉
        this.templateEditVisible = true;
      }
    },

    /**
     * 保存模板版本
     */
    saveTemplateVersion(template) {
      if (!template.name) {
        this.$notifyUtil.warning('提示', '请输入版本名称');
        return;
      }

      // 使用SimpleTemplateManager统一管理模板版本的保存
      const success = simpleTemplateManager.upsertTemplateVersion(this.genType, template);
      if (!success) {
        this.$notifyUtil.error('保存失败', '模板版本保存失败');
        return;
      }

      // 重新初始化模板版本数据
      this.initTemplateVersions();

      this.$notifyUtil.success('成功', '模板保存成功');

      // 如果编辑的是当前选中的模板版本，更新simpleTemplateManager中的模板内容
      if (this.activeTemplateVersion === template.id) {
        simpleTemplateManager.switchTemplateVersion(this.genType, template.id);
      }

      // 重新生成代码
      this.convert();
    },

    /**
     * 从localStorage获取模板版本列表
     */
    getTemplateVersionsFromStorage(templateType) {
      try {
        const savedVersions = localStorage.getItem('templateVersionsByType');
        if (savedVersions) {
          const templateVersions = JSON.parse(savedVersions);
          // 只返回用户自定义的模板版本（不包括系统默认模板）
          const versions = templateVersions[templateType] || [];
          return versions.filter(version => version.id && !version.id.startsWith(SYSTEM_TEMPLATE_PREFIX));
        }
      } catch (error) {
        console.error('从localStorage获取模板版本信息失败:', error);
      }
      return [];
    },

    /**
     * 从localStorage获取当前选中的模板版本
     */
    getActiveTemplateVersionFromStorage(templateType) {
      try {
        return localStorage.getItem(`${ACTIVE_TEMPLATE_VERSION_PREFIX}${templateType}`);
      } catch (error) {
        console.error('从localStorage获取当前选中的模板版本失败:', error);
      }
      return null;
    },

    /**
     * 保存模板版本到localStorage
     */
    saveTemplateVersions() {
      try {
        // 获取当前模板类型的版本列表
        const templateVersionsByType = {};
        templateVersionsByType[this.genType] = this.templateVersions;

        // 保存到localStorage
        localStorage.setItem(TEMPLATE_VERSIONS_STORAGE_KEY, JSON.stringify(templateVersionsByType));
      } catch (error) {
        console.error('保存模板版本失败:', error);
        this.$notifyUtil.error('保存失败', '模板版本保存失败: ' + error.message);
      }
    },

    /**
     * 清除模板缓存
     */
    clearTemplateCache() {
      // 检查是否存在自定义模板
      const hasCustomTemplates = this.checkForCustomTemplates();

      // 构建确认框内容
      let confirmContent = '确定要清除所有模板缓存数据吗？';
      if (hasCustomTemplates) {
        confirmContent += ' 检测到您有自定义模板，建议先到模板管理页面导出备份后再执行此操作。';
      }

      // 显示确认框
      this.$confirm(confirmContent, '清除缓存确认', {
        confirmButtonText: '确定清除',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 执行清除操作
        this.performClearCache();
      }).catch(() => {
        // 用户取消操作，无需处理
      });
    },

    /**
     * 检查是否存在自定义模板
     */
    checkForCustomTemplates() {
      try {
        const savedVersions = localStorage.getItem('templateVersionsByType');
        if (savedVersions) {
          const templateVersions = JSON.parse(savedVersions);
          // 检查是否有任何自定义模板版本
          for (const templateType in templateVersions) {
            const versions = templateVersions[templateType];
            if (versions && versions.length > 0) {
              // 检查是否有非系统默认模板
              const hasCustom = versions.some(version =>
                  version.id && !version.id.startsWith(SYSTEM_TEMPLATE_PREFIX)
              );
              if (hasCustom) {
                return true;
              }
            }
          }
        }
      } catch (error) {
        console.error('检查自定义模板失败:', error);
      }
      return false;
    },

    /**
     * 执行清除缓存操作
     */
    performClearCache() {
      try {
        // 清除模板相关的localStorage数据
        localStorage.removeItem('templateVersionsByType');

        // 清除所有模板的激活版本记录
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(ACTIVE_TEMPLATE_VERSION_PREFIX)) {
            localStorage.removeItem(key);
          }
        }

        // 重新初始化模板版本数据
        this.initTemplateVersions();

        // 重新生成代码
        this.convert();

        this.$notifyUtil.success('成功', '模板缓存已清除');
      } catch (error) {
        console.error('清除缓存失败:', error);
        this.$notifyUtil.error('清除失败', '清除模板缓存时发生错误: ' + error.message);
      }
    },
  }
};
</script>

<style scoped lang="scss" src="@/css/codeGenerator.scss"></style>
