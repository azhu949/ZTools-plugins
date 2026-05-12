<template>
  <div class="template-options">
    <el-form :inline="true" :model="model">
      <template v-for="option in options">
        <el-form-item v-if="option.type === 'checkbox'" :key="option.key">
          <el-checkbox
            v-model="model[option.key]"
            @change="$emit('change')"
          >
            {{ option.label }}
          </el-checkbox>
        </el-form-item>
        <el-form-item v-else-if="option.type === 'input'" :key="`input-${option.key}`" :label="option.label">
          <el-input
            v-model="model[option.key]"
            :placeholder="option.default"
            size="small"
            @change="$emit('change')"
          />
        </el-form-item>
      </template>
      <!-- 移除了复制按钮 -->
    </el-form>
  </div>
</template>

<script>
export default {
  name: 'TemplateOptions',
  props: {
    options: {
      type: Array,
      required: true
    },
    model: {
      type: Object,
      required: true
    }
  }
}
</script>

<style scoped>
.template-options {
  flex: 0;
}

.el-form-item{
  margin-bottom: 5px !important;
}
</style>