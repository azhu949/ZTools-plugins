<template>
  <div class="app">
    <div class="gtdTop"
         ref="gtdTop"
         :class="{ expanded: isExpanded }"
         :style="{ maxHeight: headerMaxHeight }"
    >
      <el-form :inline="true" size="mini">
        <el-form-item v-for="category in fieldTypes" :key="category.type">
          <el-button-group>
            <el-button class="field-type-button" type="info" plain disabled>
              <i :class="category.icon"/>{{ category.type }}
            </el-button>
            <el-button
                v-for="field in category.fields"
                :key="field.label"
                plain
                @click="addField(field)"
            >
              {{ field.label }}
            </el-button>
          </el-button-group>
        </el-form-item>
      </el-form>
      <div class="openBtn">
        <el-link :underline="false" :icon="isExpanded ? 'el-icon-caret-top' : 'el-icon-caret-bottom'"
                 @click="toggleExpand">
          {{ isExpanded ? '收起' : '展开' }}
        </el-link>
      </div>
    </div>

    <div class="gtdMiddle">
      <el-form :inline="true" size="mini" style="margin-top: 10px">
        <el-form-item label="生成数量">
          <el-input-number v-model="form.count" :min="1" :max="1000"></el-input-number>
        </el-form-item>
        <el-form-item>
          <el-button type="success" @click="generateData">生成</el-button>
          <el-button v-if="activeTab === 'table'" type="primary" @click="copyAsTVS" class="copy-with-header-btn">
            复制
            <el-tooltip
                class="item"
                effect="dark"
                :content="includeHeaderInCopy ? '✅复制结果包含表头（点击切换）' : '❎复制结果不含表头（点击切换）'"
                placement="bottom">
              <i
                  :class="includeHeaderInCopy ? 'el-icon-s-claim copy-header-icon' : 'el-icon-s-release copy-header-icon'"
                  @click.stop="toggleIncludeHeader"
              />
            </el-tooltip>
          </el-button>
          <el-button v-if="activeTab === 'table'" type="primary" @click="copyAsSQL">复制为SQL</el-button>
          <el-button v-if="activeTab === 'table'" type="primary" @click="copyAsJSON">复制为JSON</el-button>
          <el-button type="info" plain @click="clearData">清空</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="gtdBottom" ref="gtdBottom">
      <el-tabs v-if="form.fields.length > 0" v-model="activeTab" class="content-tabs">
        <el-tab-pane label="字段配置" name="config">
          <!-- 字段卡片展示区域 -->
          <div class="field-cards-container">
            <div class="field-list">
              <el-card
                  v-for="(field, index) in form.fields"
                  :key="field.id"
                  class="field-card"
              >
                <div slot="header" class="field-card-header">
                  <div class="field-header">
                    <div class="field-info">
                      <span class="field-index">{{ index + 1 }}.</span>
                      <el-tag size="mini" effect="plain" type="info">{{ field.type }}</el-tag>
                    </div>
                    <el-input
                        v-model="field.name"
                        size="mini"
                        :placeholder="`[${field.type}]请输入字段名`"
                        class="field-name-input"
                    />
                    <el-link type="danger" icon="el-icon-close" @click="removeField(field.id)"></el-link>
                  </div>
                </div>
                <div class="field-card-body">
                  <!-- 配置项区域 -->
                  <div
                      v-if="field.configs && (showConfigButtonTypes.includes(field.type) || field.type === '图片' || field.type === '头像')"
                      class="field-configs">
                    <!-- 整数/小数配置 -->
                    <div v-if="field.type === '整数' || field.type === '小数'" class="config-row">
                      <div class="config-item">
                        <label>最小值</label>
                        <el-input-number v-model="field.configs.min" size="mini" :controls="false"
                                         style="width: 100%"></el-input-number>
                      </div>
                      <div class="config-item">
                        <label>最大值</label>
                        <el-input-number v-model="field.configs.max" size="mini" :controls="false"
                                         style="width: 100%"></el-input-number>
                      </div>
                      <div v-if="field.type === '小数'" class="config-item">
                        <label>小数位</label>
                        <el-input-number v-model="field.configs.fractionDigits" size="mini" :controls="false" :min="0"
                                         :max="10" style="width: 100%"></el-input-number>
                      </div>
                    </div>

                    <!-- 文字配置 -->
                    <div v-if="field.type === '文字'" class="config-row">
                      <div class="config-item">
                        <label>最少字数</label>
                        <el-input-number v-model="field.configs.minLength" size="mini" :controls="false"
                                         style="width: 100%"></el-input-number>
                      </div>
                      <div class="config-item">
                        <label>最大字数</label>
                        <el-input-number v-model="field.configs.maxLength" size="mini" :controls="false"
                                         style="width: 100%"></el-input-number>
                      </div>
                    </div>

                    <!-- 日期/时间戳配置 -->
                    <div v-if="['日期','时间戳'].includes(field.type)" class="config-row">
                      <div class="config-item full-width">
                        <label>类型</label>
                        <el-radio-group v-model="field.configs.dateType" size="mini">
                          <el-radio-button label="date">日期</el-radio-button>
                          <el-radio-button label="datetime">日期时间</el-radio-button>
                        </el-radio-group>
                      </div>
                      <div class="config-item full-width">
                        <label>开始日期</label>
                        <el-date-picker
                            v-model="field.configs.startDate"
                            :type="field.configs.dateType"
                            size="mini"
                            style="width: 100%"
                            :format="field.configs.dateType === 'date' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss'"
                            :value-format="field.configs.dateType === 'date' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss'"
                        />
                      </div>
                      <div class="config-item full-width">
                        <label>结束日期</label>
                        <el-date-picker
                            v-model="field.configs.endDate"
                            :type="field.configs.dateType"
                            size="mini"
                            style="width: 100%"
                            :format="field.configs.dateType === 'date' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss'"
                            :value-format="field.configs.dateType === 'date' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss'"
                        />
                      </div>
                    </div>

                    <!-- 编码配置 -->
                    <div v-if="field.type === '编码'" class="config-row">
                      <div class="config-item">
                        <label>前缀</label>
                        <el-input v-model="field.configs.prefix" size="mini" placeholder="前缀"></el-input>
                      </div>
                      <div class="config-item">
                        <label>起始值</label>
                        <el-input-number v-model="field.configs.initVal" size="mini" :controls="false"
                                         style="width: 100%"></el-input-number>
                      </div>
                      <div class="config-item">
                        <label>步长</label>
                        <el-input-number v-model="field.configs.step" size="mini" :controls="false"
                                         style="width: 100%"></el-input-number>
                      </div>
                      <div class="config-item">
                        <label>
                          序号长度
                          <el-tooltip content="自增数字，不足位数自动补0" placement="top">
                            <i class="el-icon-warning-outline" style="color: #909399;"></i>
                          </el-tooltip>
                        </label>
                        <el-input-number v-model="field.configs.sequenceLength" size="mini" :controls="false" :min="1"
                                         style="width: 100%"></el-input-number>
                      </div>
                      <div class="config-item">
                        <label>日期格式</label>
                        <el-select v-model="field.configs.dateFormat" size="mini" style="width: 100%">
                          <el-option label="无日期" value=""></el-option>
                          <el-option label="yyyyMM" value="yyyyMM"></el-option>
                          <el-option label="yyyyMMdd" value="yyyyMMdd"></el-option>
                        </el-select>
                      </div>
                      <div class="config-item">
                        <label>分隔符</label>
                        <el-select v-model="field.configs.delimiter" size="mini" style="width: 100%">
                          <el-option label="无分隔符" value=""></el-option>
                          <el-option label="-" value="-"></el-option>
                          <el-option label="_" value="_"></el-option>
                          <el-option label="/" value="/"></el-option>
                          <el-option label="." value="."></el-option>
                        </el-select>
                      </div>
                    </div>

                    <!-- 枚举配置 -->
                    <div v-if="field.type === '枚举'" class="config-row">
                      <div class="config-item full-width">
                        <label>枚举值</label>
                        <el-input
                            v-model="field.configs.enumValues"
                            type="textarea"
                            :rows="3"
                            size="mini"
                            placeholder="多个枚举值用英文逗号隔开，每行一个或多个"
                        ></el-input>
                      </div>
                    </div>

                    <!-- UUID配置 -->
                    <div v-if="field.type === 'UUID'" class="config-row">
                      <div class="config-item">
                        <el-checkbox v-model="field.configs.uppercase">大写</el-checkbox>
                      </div>
                      <div class="config-item">
                        <el-checkbox v-model="field.configs.delimiter">保留分隔符</el-checkbox>
                      </div>
                    </div>

                    <!-- 随机字符配置 -->
                    <div v-if="field.type === '随机字符'" class="config-row">
                      <div class="config-item">
                        <label>字符长度</label>
                        <el-input-number v-model="field.configs.length" size="mini" :controls="false" :min="1"
                                         :max="50" style="width: 100%"></el-input-number>
                      </div>
                      <div class="config-item full-width">
                        <label>字符源</label>
                        <el-checkbox-group v-model="field.configs.strSource" size="mini">
                          <el-checkbox label="digit">数字</el-checkbox>
                          <el-checkbox label="upperLetter">大写字母</el-checkbox>
                          <el-checkbox label="lowerLetter">小写字母</el-checkbox>
                          <el-checkbox label="punctuation">标点符号</el-checkbox>
                        </el-checkbox-group>
                      </div>
                      <div v-if="field.configs.strSource.includes('punctuation')" class="config-item full-width">
                        <label>标点符号字符</label>
                        <el-input v-model="field.configs.punctuationChars" size="mini" placeholder="请输入标点符号"></el-input>
                      </div>
                    </div>

                    <!-- 图片/头像配置 -->
                    <div v-if="field.type === '图片' || field.type === '头像'" class="config-row">
                      <div class="config-item full-width">
                        <label>显示模式</label>
                        <el-radio-group v-model="field.configs.displayMode" size="mini">
                          <el-radio-button label="URL">
                            <i class="el-icon-link"></i> URL
                          </el-radio-button>
                          <el-radio-button label="预览">
                            <i class="el-icon-picture-outline"></i> 预览
                          </el-radio-button>
                        </el-radio-group>
                      </div>
                    </div>
                  </div>
                </div>
              </el-card>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="数据表格" name="table">
          <div class="table-wrapper">
            <div class="table-container">
              <vxe-table
                  ref="dataTable"
                  border
                  :data="pagedData"
                  size="mini"
                  height="100%"
                  :column-config="columnConfig"
                  :column-drag-config="columnDragConfig"
                  :seq-config="{startIndex: (currentPage - 1) * pageSize}"
                  @column-dragend="handleColumnDragEnd"
              >
              <vxe-column type="seq" title="#" width="50" fixed="left"></vxe-column>
              <vxe-column
                  v-for="field in form.fields"
                  :key="field.id"
                  :field="field.id"
                  :title="field.name"
                  :header-cell-class-name="{ blink: field.highlight }"
              >
                <template #default="{ row }">
                  <div
                      v-if="(field.type === '图片' || field.type === '头像') && field.configs && field.configs.displayMode !== 'URL'">
                    <el-image
                        style="width: 100px; height: 100px"
                        :src="row[field.id]"
                        :preview-src-list="[row[field.id]]"
                    >
                      <template #placeholder>
                        <i class="el-icon-loading"></i>
                      </template>
                    </el-image>
                  </div>
                  <div v-else>
                    {{ row[field.id] }}
                  </div>
                </template>
              </vxe-column>
            </vxe-table>
            </div>
            <el-pagination
                small
                layout="total, sizes, prev, pager, next"
                :current-page.sync="currentPage"
                :page-size="pageSize"
                :page-sizes="[20, 50, 100, 200]"
                :total="generatedData.length"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
            />
          </div>
        </el-tab-pane>
      </el-tabs>

      <!-- 无字段时的空状态 -->
      <div v-if="form.fields.length === 0" class="field-cards-container">
        <div class="empty-state">
          <i class="el-icon-info"></i>
          <p>请在上方选择字段，配置完成后点击「生成」按钮生成测试数据</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import {fakerZH_CN as faker} from '@faker-js/faker';
import dayjs from 'dayjs';

export default {
  components: {},
  data() {
    return {
      columnConfig: {
        drag: true
      },
      columnDragConfig: {
        showGuidesStatus: true,
        showIcon: true,
        trigger: 'default'
      },
      headerMaxHeight: '80px',
      isExpanded: false,
      form: {
        fields: [],
        count: 1
      },

      showConfigButtonTypes: ['整数', '小数', '日期', '编码', '枚举',
        '时间戳', '文字', 'UUID', '随机字符'],
      fieldTypes: [
        {
          type: '常规',
          icon: 'el-icon-coin',
          fields: [
            {
              label: '编码',
              generate: (configs, index) => this.$randomData.getCode(
                  configs.prefix,
                  configs.initVal,
                  configs.step,
                  configs.dateFormat,
                  configs.delimiter,
                  configs.sequenceLength,
                  index
              ),
              configs: {
                prefix: 'NO',
                initVal: 1,
                step: 1,
                sequenceLength: 3,
                dateFormat: '',
                delimiter: ''
              }
            },
            {
              label: '整数',
              generate: (configs) => this.$randomData.getNumber(configs.min, configs.max),
              configs: {
                min: 1,
                max: 99999
              }
            },
            {
              label: '小数',
              generate: (configs) => this.$randomData.getDecimal(configs.min, configs.max, configs.fractionDigits),
              configs: {
                min: 1,
                max: 99999,
                fractionDigits: 2
              }
            },
            {
              label: '日期',
              generate: (configs) => this.$dateTimeUtil.randomDate(configs.startDate, configs.endDate, configs.dateType === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss'),
              configs: {
                dateType: 'date',
                startDate: dayjs().hour(0).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss'),
                endDate: dayjs().add(7, 'day').hour(23).minute(59).second(59).format('YYYY-MM-DD HH:mm:ss')
              }
            },
            {
              label: '时间戳',
              generate: (configs) => this.$dateTimeUtil.randomTimestamp(configs.startDate, configs.endDate),
              configs: {
                dateType: 'date',
                startDate: dayjs().hour(0).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss'),
                endDate: dayjs().add(7, 'day').hour(23).minute(59).second(59).format('YYYY-MM-DD HH:mm:ss')
              }
            },
            {
              label: '枚举',
              generate: (configs) => this.$randomData.getEnumValue(configs.enumValues),
              configs: {
                enumValues: ''
              }
            },
            {
              label: '文字',
              generate: (configs) => this.$randomData.getChineseParagrap(configs.minLength, configs.maxLength),
              configs: {minLength: 15, maxLength: 50}
            },
            {
              label: '随机字符',
              generate: (configs) => this.$randomData.getStrByArrConfig(configs.length, configs.strSource, configs.punctuationChars),
              configs: {
                length: 8,
                strSource: ['digit', 'upperLetter', 'lowerLetter', 'punctuation'],
                punctuationChars: '!@#$'
              }
            },
            {
              label: 'UUID',
              generate: (configs) => this.$randomData.getUUID(configs.uppercase, configs.delimiter),
              configs: {uppercase: true, delimiter: true}
            },
            {
              label: '分布式ID',
              generate: () => this.$randomData.getDistributedId()
            },
          ]
        },
        {
          type: '人员',
          icon: 'el-icon-user',
          fields: [
            {label: '姓名', generate: () => this.$randomData.getPersonName()},
            {label: '身份证', generate: () => this.$randomData.getIdCard()},
            {label: '手机号', generate: () => this.$randomData.getChineseMobile()},
            {label: '邮箱', generate: () => this.$randomData.getEmail()},
          ]
        },
        {
          type: '位置',
          icon: 'el-icon-location-outline',
          fields: [
            {label: '省份', generate: () => this.$randomData.getProvince()},
            {label: '城市', generate: () => this.$randomData.getCity()},
            {label: '区县', generate: () => this.$randomData.getArea()},
            {label: '地址', generate: () => this.$randomData.getAddress()},
          ]
        },
        {
          type: '图像',
          icon: 'el-icon-picture-outline',
          fields: [
            {label: '图片', generate: () => this.$randomData.getImageUrl(), configs: {displayMode: 'URL'}},
            {label: '头像', generate: () => this.$randomData.getAvatarUrl(), configs: {displayMode: 'URL'}}
          ]
        },
        {
          type: '网络',
          icon: 'el-icon-monitor',
          fields: [
            {label: 'ip地址', generate: () => faker.internet.ipv4()},
            {label: '网址', generate: () => faker.internet.url()},
            {label: '密码', generate: () => faker.internet.password()},
            {label: 'emoji', generate: () => faker.internet.emoji()},
          ]
        },
        {
          type: '商业',
          icon: 'el-icon-s-shop',
          fields: [
            {label: '公司名称', generate: () => faker.company.name()},
            {label: '商品品类', generate: () => faker.commerce.department()},
            {label: '商品名', generate: () => faker.commerce.productName()},
            {label: '商品标题', generate: () => faker.commerce.productDescription()},
            {label: '货币代码', generate: () => faker.finance.currencyCode()},
            {label: '信用代码', generate: () => this.$randomData.getCreditCode()},
          ]
        },
      ],
      generatedData: [],
      activeTab: 'config',
      includeHeaderInCopy: true,
      currentPage: 1,
      pageSize: 50
    };
  },
  computed: {
    pagedData() {
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.generatedData.slice(start, end);
    }
  },
  methods: {
    toggleExpand() {
      this.isExpanded = !this.isExpanded;
      this.$nextTick().then(() => {
        this.headerMaxHeight = this.isExpanded
            ? `${this.$refs.gtdTop.scrollHeight}px`
            : '80px'
      })
    },
    addField(field) {
      const newField = {
        id: `field_${Date.now()}`,
        name: field.label,
        type: field.label,
        configs: field.configs ? JSON.parse(JSON.stringify(field.configs)) : undefined
      }
      this.form.fields.push(newField);
      // 如果当前显示表格，切换到字段配置显示状态
      if (this.activeTab === 'table') {
        this.activeTab = 'config';
      }
    },
    removeField(id) {
      this.form.fields = this.form.fields.filter(field => field.id !== id);
      // 如果删除后没有字段了，重置状态
      if (this.form.fields.length === 0) {
        this.activeTab = 'config';
        this.generatedData = [];
      }
    },
    generateData() {
      if (this.form.fields === null || this.form.fields.length <= 0) {
        this.$notifyUtil.warning('请先添加字段');
        return;
      }

      this.generatedData = [];
      this.currentPage = 1;
      for (let i = 0; i < this.form.count; i++) {
        const row = {};
        this.form.fields.forEach(field => {
          const category = this.fieldTypes.find(category =>
              category.fields.some(f => f.label === field.type)
          );
          const fieldType = category.fields.find(f => f.label === field.type);
          row[field.id] = fieldType ? fieldType.generate(field.configs, i) : '';
        });
        this.generatedData.push(row);
      }
      // 生成数据后切换到表格显示
      this.activeTab = 'table';
    },
    // 拷贝为制表符分隔值
    copyAsTVS() {
      const csvRows = [];
      const currentFields = this.getCurrentFieldsOrder();

      // 根据设置决定是否包含表头
      if (this.includeHeaderInCopy) {
        const headers = currentFields.map(field => field.name).join('\t');
        csvRows.push(headers);
      }

      this.generatedData.forEach(row => {
        const values = currentFields.map(field => row[field.id]).join('\t');
        csvRows.push(values);
      });

      const csvString = csvRows.join('\n');
      this.copyToClipboard(csvString);
    },
    // 拷贝为SQL
    copyAsSQL() {
      const sqlStatements = this.generatedData.map(row => {
        const tableName = 'tableName';
        const currentFields = this.getCurrentFieldsOrder();
        const columns = currentFields.map(field => field.name).join(', ');
        const values = currentFields.map(field => `'${row[field.id]}'`).join(', ');
        return `INSERT INTO ${tableName} (${columns})
                VALUES (${values});`;
      }).join('\n');
      this.copyToClipboard(sqlStatements);
    },
    // 拷贝为JSON
    copyAsJSON() {
      const jsonData = this.generatedData.map(row => {
        const jsonObject = {};
        const currentFields = this.getCurrentFieldsOrder();
        currentFields.forEach(field => {
          jsonObject[field.name] = row[field.id];
        });
        return jsonObject;
      });
      this.copyToClipboard(JSON.stringify(jsonData, null, 2));
    },
    copyToClipboard(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.$notifyUtil.success('内容已复制到剪贴板');
    },
    clearData() {
      this.form.fields = [];
      this.generatedData = [];
      this.currentPage = 1;
      this.activeTab = 'config';
    },

    // 切换复制时是否包含表头
    toggleIncludeHeader() {
      this.includeHeaderInCopy = !this.includeHeaderInCopy;
    },

    // 处理列拖拽结束事件
    handleColumnDragEnd() {
      // 使用getTableColumn方法获取最新的列顺序
      if (this.$refs.dataTable) {
        const tableColumnInfo = this.$refs.dataTable.getTableColumn();
        const columnOrder = tableColumnInfo.collectColumn.map(col => col.property);

        // 根据表格列的顺序重新排列字段配置
        const reorderedFields = [];
        columnOrder.forEach(columnProperty => {
          const field = this.form.fields.find(f => f.id === columnProperty);
          if (field) {
            reorderedFields.push(field);
          }
        });

        // 更新字段配置顺序
        this.form.fields = reorderedFields;
      }
    },

    // 获取当前应该使用的字段顺序
    getCurrentFieldsOrder() {
      return this.form.fields;
    },

    handleSizeChange(val) {
      this.pageSize = val;
      this.currentPage = 1;
    },
    handleCurrentChange(val) {
      this.currentPage = val;
    },

  }
};
</script>

<style>
.gtdTop {
  position: relative;
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 80px;
}

.openBtn {
  position: absolute;
  right: 0;
  top: 0;
}

.gtdMiddle {
  flex: 0 0 auto;
}

.field-type-button {
  color: rgb(144, 147, 153) !important;
  background: rgb(244, 244, 245) !important;
  border-color: rgb(211, 212, 214) !important;
}

.gtdBottom {
  flex: 1;
  overflow-y: auto;
}

.vxe-table--header th.vxe-header--column .vxe-cell .vxe-cell--wrapper {
  display: flex;
}

/* 字段卡片容器样式 */
.field-cards-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

/* field-list 滚动条样式 */
.field-cards-container::-webkit-scrollbar {
  width: 8px; /* 纵向滚动条宽度 */
  height: 8px; /* 横向滚动条高度 */
}

.field-cards-container::-webkit-scrollbar-track {
  border-radius: 4px;
}

.field-cards-container::-webkit-scrollbar-thumb {
  background-color: #888;
  border-radius: 4px;
}

.field-cards-container::-webkit-scrollbar-thumb:hover {
  background-color: #555;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.field-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
  gap: 15px;
  min-height: 100px; /* 确保有足够空间 */
  width: 100%;
}

.field-card {
  margin-bottom: 0;
  min-width: 0;
  word-wrap: break-word;
  position: relative;
  transition: all 0.3s ease;
  border-radius: 8px !important;
}

.field-card .el-card__header {
  padding: 0 !important;
}

.field-card .el-card__body {
  padding: 0 !important;
}

.field-card-header {
  padding: 10px 10px;
}

.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.field-info {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}


.field-index {
  font-weight: 600;
  color: #606266;
  font-size: 12px;
  min-width: 18px;
}

.field-card-body {
  padding: 10px 15px;
  min-height: 0;
  overflow: visible;
}

.config-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  grid-column: 1 / -1;
  margin-bottom: 8px;
}

.config-row:last-child {
  margin-bottom: 0;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.config-item label {
  font-size: 11px;
  color: #606266;
  font-weight: 500;
}

.config-item.full-width {
  grid-column: 1 / -1;
}

.config-item label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

/* Tab标签样式 */
.content-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-tabs .el-tabs__content {
  flex: 1;
  overflow: hidden;
}

.content-tabs .el-tab-pane {
  height: 100%;
  overflow: hidden;
}

.table-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-container {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.table-wrapper .el-pagination {
  flex-shrink: 0;
  text-align: right;
  height: 26px;
}

/* 复制按钮样式 */
.copy-with-header-btn {
  height: 28px;
}

.copy-header-icon {
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-origin: center;
  color: #ffffff;
  margin-left: 3px;
}

.copy-header-icon:hover {
  transform: scale(2);
}

/* 深色模式样式 */
body.dark .copy-header-icon {
  color: #ffffff !important;
  margin-left: 3px !important;
}

</style>
