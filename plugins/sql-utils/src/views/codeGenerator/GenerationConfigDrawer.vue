<template>
  <el-drawer
    title="生成配置"
    :visible.sync="drawerVisible"
    direction="rtl"
    size="40%"
    :before-close="handleClose"
  >
    <div class="config-container">
      <el-form :model="config" :rules="rules" ref="configForm" label-width="80px">
        <el-form-item label="基础包名" prop="basePackage">
          <el-input v-model="config.basePackage" placeholder="请输入基础包名"></el-input>
        </el-form-item>
        <el-form-item label="作者" prop="author">
          <el-input v-model="config.author" placeholder="请输入作者"></el-input>
        </el-form-item>
      </el-form>

      <el-divider content-position="left">二级包名配置</el-divider>
      
      <el-form :model="config.subPackages" :rules="subPackageRules" ref="subPackageForm" label-width="100px">
        <el-form-item v-for="(subPackage, key) in config.subPackages" :key="key" :label="getTemplateName(key)" :prop="key" v-if="key !== 'mapperXML'">
          <el-input v-model="config.subPackages[key]" placeholder="请输入二级包名">
            <template slot="prepend">{{config.basePackage}}.</template>
          </el-input>
        </el-form-item>
      </el-form>

      <div class="drawer-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script>
export default {
  name: 'GenerationConfigDrawer',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      config: {
        basePackage: 'com.example.demo',
        author: 'Developer',
        subPackages: {
          javaBean: 'entity',
          controller: 'controller',
          service: 'service',
          mapper: 'mapper',
          mapperXML: ''
        }
      },
      originalConfig: {},
      templateNameMap: {
        javaBean: 'Entity',
        controller: 'Controller',
        service: 'Service',
        mapper: 'Mapper',
        mapperXML: 'Mapper XML'
      },
      rules: {
        basePackage: [
          { required: true, message: '请输入基础包名', trigger: 'blur' }
        ],
        author: [
          { required: true, message: '请输入作者', trigger: 'blur' }
        ]
      },
      subPackageRules: {}
    };
  },
  computed: {
    drawerVisible: {
      get() {
        return this.visible;
      },
      set(val) {
        this.$emit('update:visible', val);
      }
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.loadConfig();
      }
    }
  },
  methods: {
    // 获取模板显示名称
    getTemplateName(key) {
      return this.templateNameMap[key] || key;
    },
    
    // 加载配置
    loadConfig() {
      try {
        const savedConfig = localStorage.getItem('generationConfig');
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          // 合并默认配置和保存的配置
          this.config = {
            ...this.config,
            ...parsedConfig,
            // 确保subPackages存在且包含所有模板
            subPackages: {
              ...this.config.subPackages,
              ...(parsedConfig.subPackages || {})
            }
          };
        }
        
        // 动态生成二级包名验证规则
        const subPackageRules = {};
        Object.keys(this.config.subPackages).forEach(key => {
          if (key !== 'mapperXML') {
            subPackageRules[key] = [
              { required: true, message: `请输入${this.getTemplateName(key)}的二级包名`, trigger: 'blur' }
            ];
          }
        });
        this.subPackageRules = subPackageRules;
        
        // 保存原始配置用于比较
        this.originalConfig = JSON.parse(JSON.stringify(this.config));
      } catch (error) {
        console.error('加载配置失败:', error);
      }
    },

    // 保存配置
    saveConfig() {
      // 验证基础配置表单
      this.$refs.configForm.validate((valid) => {
        if (!valid) {
          return false;
        }
        
        // 验证二级包名表单
        this.$refs.subPackageForm.validate((valid) => {
          if (!valid) {
            return false;
          }
          
          try {
            // 保存到localStorage
            localStorage.setItem('generationConfig', JSON.stringify(this.config));

            // 更新原始配置
            this.originalConfig = JSON.parse(JSON.stringify(this.config));

            // 触发保存事件
            this.$emit('saved', this.config);

            // 显示成功提示
            this.$notifyUtil.success('保存成功');

            // 关闭抽屉
            this.drawerVisible = false;
          } catch (error) {
            console.error('保存配置失败:', error);
            this.$notifyUtil.error('保存失败');
          }
        });
      });
    },

    // 关闭抽屉
    handleClose() {
      // 检查是否有未保存的修改
      const hasChanges = JSON.stringify(this.config) !== JSON.stringify(this.originalConfig);

      if (hasChanges) {
        this.$confirm('您有未保存的修改，确定要关闭吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.drawerVisible = false;
        }).catch(() => {
          // 用户取消关闭
        });
      } else {
        this.drawerVisible = false;
      }
    }
  }
};
</script>

<style scoped>
.config-container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.drawer-footer {
  margin-top: auto;
  padding-top: 20px;
  text-align: right;
}
</style>
