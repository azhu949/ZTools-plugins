<template>
  <el-drawer
    title="Java与MySQL类型映射配置"
    :visible.sync="dialogVisible"
    direction="rtl"
    size="40%"
    :before-close="handleClose"
    :wrapperClosable="true"
  >
    <div class="type-mapping-drawer">
      <!-- 固定在顶部的操作按钮 -->
      <div class="mapping-header">
        <el-button type="primary" size="small" @click="addMapping">添加映射</el-button>
        <el-button type="warning" size="small" @click="resetToDefault">恢复默认</el-button>
      </div>

      <!-- 固定高度的表格容器 -->
      <div class="table-container">
        <el-table :data="typeMappings" border height="100%" style="width: 100%">
          <el-table-column prop="mysqlType" label="MySQL类型" width="150">
            <template slot-scope="scope">
              <el-input v-if="scope.row.editing" v-model="scope.row.mysqlType" size="small"></el-input>
              <span v-else>{{ scope.row.mysqlType }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="javaType" label="Java类型" width="180">
            <template slot-scope="scope">
              <el-select
                v-if="scope.row.editing"
                v-model="scope.row.javaType"
                size="small"
                placeholder="请选择Java类型"
              >
                <el-option-group
                  v-for="group in javaTypeGroups"
                  :key="group.label"
                  :label="group.label"
                >
                  <el-option
                    v-for="item in group.options"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  ></el-option>
                </el-option-group>
              </el-select>
              <span v-else>{{ scope.row.javaType }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述">
            <template slot-scope="scope">
              <el-input v-if="scope.row.editing" v-model="scope.row.description" size="small"></el-input>
              <span v-else>{{ scope.row.description }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template slot-scope="scope">
              <el-button
                v-if="!scope.row.editing"
                type="primary"
                size="mini"
                @click="editMapping(scope.$index)"
              >编辑</el-button>
              <el-button
                v-if="scope.row.editing"
                type="success"
                size="mini"
                @click="saveMapping(scope.$index)"
              >保存</el-button>
              <el-button
                v-if="scope.row.editing"
                type="info"
                size="mini"
                @click="cancelEdit(scope.$index)"
              >取消</el-button>
              <el-button
                v-if="!scope.row.editing"
                type="danger"
                size="mini"
                @click="deleteMapping(scope.$index)"
              >删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </el-drawer>
</template>

<script>
export default {
  name: 'TypeMappingDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      dialogVisible: this.visible,
      typeMappings: [],
      originalMappings: [],
      // Java类型分组
      javaTypeGroups: [
        {
          label: '数值类型',
          options: [
            { value: 'Integer', label: 'Integer' },
            { value: 'Long', label: 'Long' },
            { value: 'Float', label: 'Float' },
            { value: 'Double', label: 'Double' },
            { value: 'BigDecimal', label: 'BigDecimal' },
            { value: 'Short', label: 'Short' },
            { value: 'Byte', label: 'Byte' }
          ]
        },
        {
          label: '字符串类型',
          options: [
            { value: 'String', label: 'String' },
            { value: 'Character', label: 'Character' }
          ]
        },
        {
          label: '日期时间类型',
          options: [
            { value: 'Date', label: 'Date' },
            { value: 'LocalDate', label: 'LocalDate' },
            { value: 'LocalDateTime', label: 'LocalDateTime' },
            { value: 'LocalTime', label: 'LocalTime' },
            { value: 'Timestamp', label: 'Timestamp' },
            { value: 'Calendar', label: 'Calendar' }
          ]
        },
        {
          label: '布尔类型',
          options: [
            { value: 'Boolean', label: 'Boolean' }
          ]
        },
        {
          label: '二进制类型',
          options: [
            { value: 'byte[]', label: 'byte[]' },
            { value: 'Blob', label: 'Blob' }
          ]
        },
        {
          label: '其他类型',
          options: [
            { value: 'Object', label: 'Object' },
            { value: 'Map', label: 'Map' },
            { value: 'List', label: 'List' }
          ]
        }
      ],
      // 默认类型映射
      defaultTypeMappings: [
        // 数值类型
        { mysqlType: 'int', javaType: 'Integer', description: '整数类型' },
        { mysqlType: 'tinyint', javaType: 'Integer', description: '微小整数类型' },
        // { mysqlType: 'smallint', javaType: 'Integer', description: '小整数类型' },
        // { mysqlType: 'mediumint', javaType: 'Integer', description: '中等整数类型' },
        { mysqlType: 'bigint', javaType: 'Long', description: '大整数类型' },
        { mysqlType: 'float', javaType: 'Float', description: '单精度浮点数' },
        { mysqlType: 'double', javaType: 'Double', description: '双精度浮点数' },
        { mysqlType: 'decimal', javaType: 'BigDecimal', description: '高精度小数' },

        // 字符串类型
        { mysqlType: 'varchar', javaType: 'String', description: '可变长度字符串' },
        { mysqlType: 'char', javaType: 'String', description: '固定长度字符串' },
        { mysqlType: 'text', javaType: 'String', description: '长文本' },
        // { mysqlType: 'mediumtext', javaType: 'String', description: '中等长度文本' },
        { mysqlType: 'longtext', javaType: 'String', description: '超长文本' },
        // { mysqlType: 'json', javaType: 'String', description: 'JSON类型' },
        // { mysqlType: 'enum', javaType: 'String', description: '枚举类型' },
        // { mysqlType: 'set', javaType: 'String', description: '集合类型' },

        // 日期时间
        { mysqlType: 'date', javaType: 'LocalDate', description: '日期类型' },
        { mysqlType: 'datetime', javaType: 'LocalDateTime', description: '日期时间类型' },
        { mysqlType: 'timestamp', javaType: 'LocalDateTime', description: '时间戳类型' },
        // { mysqlType: 'time', javaType: 'LocalTime', description: '时间类型' },
        // { mysqlType: 'year', javaType: 'Integer', description: '年份类型' },

        // 二进制类型
        // { mysqlType: 'blob', javaType: 'byte[]', description: '二进制大对象' }
        // { mysqlType: 'mediumblob', javaType: 'byte[]', description: '中等二进制对象' },
        // { mysqlType: 'longblob', javaType: 'byte[]', description: '大二进制对象' },
        // { mysqlType: 'binary', javaType: 'byte[]', description: '固定长度二进制' },
        // { mysqlType: 'varbinary', javaType: 'byte[]', description: '可变长度二进制' },

        // 其他类型
        // { mysqlType: 'bit', javaType: 'Boolean', description: '位类型' },
        // { mysqlType: 'geometry', javaType: 'Object', description: '几何类型' }
      ]
    };
  },
  watch: {
    visible(newVal) {
      this.dialogVisible = newVal;
      if (newVal) {
        this.loadMappings();
      }
    }
  },
  methods: {
    // 加载类型映射
    loadMappings() {
      // 从localStorage加载自定义映射，如果没有则使用默认映射
      const savedMappings = localStorage.getItem('typeMappings');
      if (savedMappings) {
        try {
          this.typeMappings = JSON.parse(savedMappings);
        } catch (e) {
          this.typeMappings = [...this.defaultTypeMappings];
        }
      } else {
        this.typeMappings = [...this.defaultTypeMappings];
      }
      // 保存原始映射，用于取消编辑时恢复
      this.originalMappings = JSON.parse(JSON.stringify(this.typeMappings));
    },

    // 添加映射
    addMapping() {
      this.typeMappings.push({
        mysqlType: '',
        javaType: '',
        description: '',
        editing: true
      });
    },

    // 编辑映射
    editMapping(index) {
      this.$set(this.typeMappings[index], 'editing', true);
      // 保存当前值，用于取消编辑时恢复
      this.$set(this.typeMappings[index], 'originalValue', {
        mysqlType: this.typeMappings[index].mysqlType,
        javaType: this.typeMappings[index].javaType,
        description: this.typeMappings[index].description
      });
    },

    // 保存映射
    saveMapping(index) {
      if (!this.typeMappings[index].mysqlType || !this.typeMappings[index].javaType) {
        this.$notifyUtil.error('错误', 'MySQL类型和Java类型不能为空');
        return;
      }
      this.$set(this.typeMappings[index], 'editing', false);
      delete this.typeMappings[index].originalValue;

      // 立即保存到localStorage并通知父组件
      this.saveCurrentMappings();
    },

    // 取消编辑
    cancelEdit(index) {
      if (this.typeMappings[index].originalValue) {
        // 恢复原始值
        this.$set(this.typeMappings[index], 'mysqlType', this.typeMappings[index].originalValue.mysqlType);
        this.$set(this.typeMappings[index], 'javaType', this.typeMappings[index].originalValue.javaType);
        this.$set(this.typeMappings[index], 'description', this.typeMappings[index].originalValue.description);
        delete this.typeMappings[index].originalValue;
      } else {
        // 如果是新增的行，直接删除
        this.typeMappings.splice(index, 1);
      }
      this.$set(this.typeMappings[index], 'editing', false);
    },

    // 删除映射
    deleteMapping(index) {
      this.$confirm('确定要删除这个映射吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.typeMappings.splice(index, 1);

        // 使用系统统一的Notification方式
        this.$notifyUtil.success('删除成功');

        // 立即保存到localStorage并通知父组件
        this.saveCurrentMappings();
      }).catch(() => {
        // 用户取消删除
      });
    },

    // 恢复默认
    resetToDefault() {
      this.$confirm('确定要恢复默认映射吗？这将覆盖所有自定义配置。', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.typeMappings = [...this.defaultTypeMappings];

        // 保存到localStorage
        localStorage.setItem('typeMappings', JSON.stringify(this.typeMappings));

        // 更新原始映射
        this.originalMappings = JSON.parse(JSON.stringify(this.typeMappings));

        // 触发父组件事件
        this.$emit('saved', this.typeMappings);

        // 使用系统统一的Notification方式
        this.$notifyUtil.success('已恢复默认映射');
      }).catch(() => {
        // 用户取消恢复
      });
    },

    // 立即保存当前映射
    saveCurrentMappings() {
      // 验证映射
      for (let i = 0; i < this.typeMappings.length; i++) {
        if (!this.typeMappings[i].mysqlType || !this.typeMappings[i].javaType) {
          this.$notifyUtil.error('错误', `第 ${i + 1} 行的MySQL类型和Java类型不能为空`);
          return false;
        }
      }

      // 保存到localStorage
      localStorage.setItem('typeMappings', JSON.stringify(this.typeMappings));

      // 更新原始映射
      this.originalMappings = JSON.parse(JSON.stringify(this.typeMappings));

      // 触发父组件事件
      this.$emit('saved', this.typeMappings);

      // 使用系统统一的Notification方式
      this.$notifyUtil.success('保存成功');

      return true;
    },

    // 保存映射
    saveMappings(skipClose = false) {
      // 验证映射
      for (let i = 0; i < this.typeMappings.length; i++) {
        if (!this.typeMappings[i].mysqlType || !this.typeMappings[i].javaType) {
          this.$notifyUtil.error('错误', `第 ${i + 1} 行的MySQL类型和Java类型不能为空`);
          return false;
        }
      }

      // 保存到localStorage
      localStorage.setItem('typeMappings', JSON.stringify(this.typeMappings));

      // 更新原始映射
      this.originalMappings = JSON.parse(JSON.stringify(this.typeMappings));

      // 触发父组件事件
      this.$emit('saved', this.typeMappings);

      if (!skipClose) {
        this.dialogVisible = false;
        this.$emit('update:visible', false);
      }

      // 使用系统统一的Notification方式
      this.$notifyUtil.success('保存成功');

      return true;
    },

    // 关闭对话框
    handleClose() {
      // 检查是否有未保存的编辑
      const hasUnsavedChanges = this.typeMappings.some(item => item.editing);

      if (hasUnsavedChanges) {
        this.$confirm('有未保存的编辑，是否要保存？', '提示', {
          confirmButtonText: '保存',
          cancelButtonText: '不保存',
          distinguishCancelAndClose: true,
          type: 'warning'
        }).then(() => {
          // 用户选择保存
          this.saveCurrentMappings();
          this.dialogVisible = false;
          this.$emit('update:visible', false);
        }).catch(action => {
          if (action === 'cancel') {
            // 用户选择不保存，直接关闭
            this.dialogVisible = false;
            this.$emit('update:visible', false);
          }
          // 用户点击了关闭按钮，不做任何操作
        });
      } else {
        // 没有未保存的编辑，直接关闭
        this.dialogVisible = false;
        this.$emit('update:visible', false);
      }
    }
  }
};
</script>

<style scoped>
.type-mapping-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 20px 20px;
}

.mapping-header {
  flex-shrink: 0;
  padding: 10px 0;
}

.table-container {
  flex: 1;
  overflow: hidden;
}

/* 自定义抽屉样式 */
.el-drawer__header{
  margin-bottom: 5px !important;
}
</style>
