<!--excel转sql-->
<template>
  <div class="app">
    <div class="toolbar">
      <el-form :inline="true">
        <el-form-item>
          <el-button type="info" size="mini" plain @click="clear">清空</el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="mini" @click="getClipboardContent">解析粘贴板</el-button>
        </el-form-item>
        <el-form-item>
          <i class="el-icon-warning-outline" style="cursor: pointer;color: #909399" @click="previewImage()"></i>
        </el-form-item>
      </el-form>
      <el-image
          :src="excelToSqlImg"
          :preview-src-list="[excelToSqlImg]"
          ref="previewImage"
          style="display: none;"
      />
    </div>

    <div class="dataArea" v-loading="loading" element-loading-text="解析中...">
      <template v-if="tableData && tableData.length">
        <div class="table-wrapper">
          <div class="table-container">
            <vxe-table
                ref="dataTable"
                border
                :data="currentPageData"
                size="mini"
                height="100%"
                :column-config="columnConfig"
                :column-drag-config="columnDragConfig"
                :seq-config="{startIndex: (currentPage - 1) * pageSize}"
                @column-dragend="handleColumnDragEnd"
            >
              <vxe-column type="seq" title="#" width="50" fixed="left"></vxe-column>
              <vxe-column
                  v-for="column in columns"
                  :key="column.prop"
                  :field="column.prop"
                  :title="column.label"
              >
                <template #default="{ row }">
                  {{ row[column.prop] }}
                </template>
              </vxe-column>
            </vxe-table>
          </div>
          <el-pagination
              small
              layout="total, sizes, prev, pager, next"
              :page-sizes="[20, 50, 100]"
              :page-size.sync="pageSize"
              :current-page.sync="currentPage"
              :total="tableData.length">
          </el-pagination>
        </div>
      </template>
      <el-upload
          v-else
          class="excel-upload"
          drag
          action=""
          :auto-upload="false"
          :show-file-list="false"
          accept=".xlsx,.xls,.csv"
          :on-change="handleFileChange">
        <i class="el-icon-upload"></i>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em><br>支持 .xlsx、.xls、.csv 格式</div>
      </el-upload>
    </div>

    <div class="resultArea">
      <div class="resultAreaForm">
        <el-form :inline="true" :model="formData" :rules="rules" ref="sqlForm" :disabled="!tableData">
          <el-form-item label="表名">
            <el-input size="mini" v-model="formData.tableName" clearable placeholder="请输入表名" style="width: 150px"/>
          </el-form-item>
          <el-form-item label="类型">
            <el-radio-group v-model="formData.sqlType" size="mini">
              <el-radio-button label="insert">新增</el-radio-button>
              <el-radio-button label="update">修改</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="主键" prop="primaryKey" v-show="formData.sqlType==='update'">
            <el-select v-model="formData.primaryKey" clearable multiple collapse-tags size="mini" style="width: 150px">
              <el-option
                  v-for="item in primaryKeyOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"/>
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="warning" size="mini" plain :disabled="!tableData" @click="columnConfigVisible = true">字段配置</el-button>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="mini" @click="generateSql">生成SQL</el-button>
          </el-form-item>
          <el-form-item>
            <el-button type="success" size="mini" @click="copyText" v-show="sqlStr">复制</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="resultBox">
        <CodeEditor
            ref="codeEditor"
            v-model="sqlStr"
            :mode="codeEditorMode"
        />
      </div>
    </div>

    <el-dialog title="字段配置" :visible.sync="columnConfigVisible" width="500px" append-to-body>
      <el-table :data="columnConfigTableData" border size="mini" height="500px">
        <el-table-column prop="columnName" label="字段名"></el-table-column>
        <el-table-column label="空字符串转NULL" align="center">
          <template slot-scope="scope">
            <div @click="scope.row.emptyToNull = !scope.row.emptyToNull" style="cursor: pointer; height: 100%;">
              <el-checkbox v-model="scope.row.emptyToNull" size="mini" @click.native.stop></el-checkbox>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <span slot="footer">
        <el-button size="mini" @click="columnConfigVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import CodeEditor from '@/components/CodeEditor.vue'

import excelToSqlImg from '@/assets/image/excel转sql.png'

let listSheetsFn = null
let batchAsyncFn = null
let wasmReady = false

async function ensureWasm() {
  if (wasmReady) return
  const mod = await import('xlsx-fire/sheetx.js')
  if (typeof mod.default === 'function') {
    try {
      const wasmUrl = (await import('xlsx-fire/sheetx_bg.wasm?url')).default
      await mod.default(wasmUrl)
    } catch {
      await mod.default()
    }
  }
  listSheetsFn = mod.list_sheets
  batchAsyncFn = mod.xlsx_batch_async
  wasmReady = true
}

export default {
  name: "excelToSql",
  components: {CodeEditor},
  data() {
    const checkPrimaryKey = (rule, value, callback) => {
      if ("update" === this.formData.sqlType && !this.formData.primaryKey.length) {
        return callback(new Error('请选择主键'))
      } else {
        callback()
      }
    };
    return {
      columnConfig: {
        drag: true
      },
      columnDragConfig: {
        showGuidesStatus: true,
        showIcon: true,
        trigger: 'default'
      },
      excelToSqlImg,
      loading: false,
      columns: null,
      tableData: null,
      currentPage: 1,
      pageSize: 100,
      sqlStr: null,
      codeEditorMode: 'sql',
      primaryKeyOptions: [],
      columnConfigVisible: false,
      columnConfigTableData: [],
      formData: {
        tableName: '',
        sqlType: 'insert',
        primaryKey: [],
      },
      rules: {
        primaryKey: [
          {validator: checkPrimaryKey, trigger: 'blur'}
        ]
      }
    }
  },
  computed: {
    currentPageData() {
      if (!this.tableData) return [];
      const start = (this.currentPage - 1) * this.pageSize;
      return this.tableData.slice(start, start + this.pageSize);
    }
  },
  methods: {
    previewImage() {
      this.$refs.previewImage.clickHandler();
    },
    handleColumnDragEnd() {
      if (this.$refs.dataTable) {
        const tableColumnInfo = this.$refs.dataTable.getTableColumn();
        const columnOrder = tableColumnInfo.collectColumn.map(col => col.property);
        const reorderedColumns = [];
        columnOrder.forEach(columnProperty => {
          const col = this.columns.find(c => c.prop === columnProperty);
          if (col) {
            reorderedColumns.push(col);
          }
        });
        this.columns = reorderedColumns;
      }
    },
    handleFileChange(file) {
      this.parseFile(file.raw);
    },
    async parseFile(file) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        this.parseCsvFile(file);
        return;
      }
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        this.$notifyUtil.error('格式错误', '仅支持 .xlsx、.xls、.csv 格式文件');
        return;
      }
      this.loading = true;
      try {
        const t0 = performance.now();
        await ensureWasm();

        const t1 = performance.now();
        const bytes = new Uint8Array(await file.arrayBuffer());

        const t2 = performance.now();
        const {sheets} = listSheetsFn(bytes);

        if (!sheets || !sheets.length) {
          this.$notifyUtil.error('解析失败', '文件内容为空');
          return;
        }
        const batchSize = 5000;
        let start = 0;
        let headerRow = null;
        let headers = null;
        let allRows = [];
        const t3 = performance.now();
        while (true) {
          const tBatch = performance.now();
          const res = await batchAsyncFn(bytes, sheets[0], start, batchSize);
          if (!res.rows || res.rows.length === 0) break;
          if (start === 0) {
            headerRow = res.rows[0];
            headers = headerRow.map(col => ({prop: String(col ?? '').trim(), label: String(col ?? '').trim()}));
            this.primaryKeyOptions = headerRow.map(col => ({value: String(col ?? '').trim(), label: String(col ?? '').trim()}));
            this.columnConfigTableData = headers.map(h => ({columnName: h.prop, emptyToNull: false}));
            this.columns = headers;
            const dataRows = res.rows.slice(1);
            allRows = allRows.concat(dataRows);
          } else {
            allRows = allRows.concat(res.rows);
          }
          if (res.rows.length < batchSize) break;
          start += res.rows.length;
        }

        const t4 = performance.now();
        this.tableData = Object.freeze(allRows
            .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
            .map(row => {
              const entry = {};
              headers.forEach((header, index) => {
                entry[header.prop] = row[index] !== undefined && row[index] !== null ? String(row[index]) : '';
              });
              return entry;
            }));

        if (!this.tableData.length) {
          this.$notifyUtil.error('解析失败', '文件内容为空或仅有表头');
          return;
        }
        this.currentPage = 1;
        const t5 = performance.now();
        this.$notifyUtil.success('解析成功', `已解析 ${this.tableData.length} 条数据`);
      } catch (error) {
        console.error('解析文件失败:', error);
        this.$notifyUtil.error('解析失败', '文件内容格式不正确，请检查文件');
      } finally {
        this.loading = false;
      }
    },
    parseCsvFile(file) {
      this.loading = true;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          this.columns = this.getHeaderJson(text);
          this.tableData = Object.freeze(this.getDataJson(text));
          if (!this.tableData || !this.tableData.length) {
            this.$notifyUtil.error('解析失败', '文件内容为空或仅有表头');
            return;
          }
          this.$notifyUtil.success('解析成功', `已解析 ${this.tableData.length} 条数据`);
        } catch (err) {
          console.error('解析CSV失败:', err);
          this.$notifyUtil.error('解析失败', '文件内容格式不正确');
        } finally {
          this.loading = false;
        }
      };
      reader.onerror = () => {
        this.$notifyUtil.error('读取失败', '文件读取失败');
        this.loading = false;
      };
      reader.readAsText(file);
    },
    getClipboardContent() {
      this.loading = true;
      navigator.clipboard.readText().then(text => {
        this.columns = this.getHeaderJson(text)
        this.tableData = Object.freeze(this.getDataJson(text))
        this.loading = false;
      }).catch(error => {
        console.error('解析剪贴板内容失败:', error);
        this.$notifyUtil.error('解析失败', '剪贴板内容格式不正确，请重新复制内容');
        this.loading = false;
      })
    },
    getHeaderJson(excelText) {
      const rows = excelText.split('\n').filter(row => row.trim() !== '');
      const headerRow = rows.shift().trim();
      const headers = headerRow.split(/\s+/).map(column => ({prop: column.trim(), label: column.trim()}));
      this.primaryKeyOptions = headerRow.split(/\s+/).map(column => ({value: column.trim(), label: column.trim()}));
      this.columnConfigTableData = headers.map(h => ({columnName: h.prop, emptyToNull: false}));
      return headers
    },
    getDataJson(excelText) {
      const rows = excelText.split('\n').filter(row => row.trim() !== '');
      const headerRow = rows.shift().trim();
      const headers = headerRow.split(/\s+/).map(column => ({prop: column.trim(), label: column.trim()}));
      const content = rows.map(row => {
        const values = row.split('\t').map(value => value.trim());
        const entry = {};
        headers.forEach((header, index) => {
          entry[header.prop] = values[index];
        });
        return entry;
      }).filter(entry => Object.values(entry).some(val => val !== '' && val !== undefined && val !== null));
      return content
    },
    clear() {
      this.columns = null
      this.tableData = null
      this.currentPage = 1
      this.sqlStr = null
      this.formData.tableName = null
      this.formData.primaryKey = null
      this.columnConfigTableData = []
    },
    isEmptyToNull(columnName) {
      const config = this.columnConfigTableData.find(c => c.columnName === columnName);
      return config ? config.emptyToNull : false;
    },
    generateSql() {
      this.$refs['sqlForm'].validate((valid) => {
        if (valid) {
          if (this.formData.sqlType === 'insert') {
            this.generateInsertSql()
          } else if (this.formData.sqlType === 'update') {
            this.generateUpdateSql()
          }
        }
      })
    },
    generateInsertSql() {
      let tableNameStr = this.formData.tableName ? this.formData.tableName : 'table_name'
      const columns = this.columns.map(c => c.prop);
      const batchSize = 500;
      let sqlStatements = [];
      for (let i = 0; i < this.tableData.length; i += batchSize) {
        const batch = this.tableData.slice(i, i + batchSize);
        const valuesList = batch.map(row => {
          const values = columns.map(column => {
            const value = row[column];
            if (this.isEmptyToNull(column) && (value === '' || value === undefined || value === null)) {
              return 'NULL';
            }
            if (typeof value === 'string') {
              return `'${value}'`;
            }
            return value;
          });
          return `(${values.join(', ')})`;
        });
        sqlStatements.push(`INSERT INTO ${tableNameStr} (${columns.join(', ')}) VALUES\n${valuesList.join(',\n')};`);
      }
      this.sqlStr = sqlStatements.join('\n');
    },
    generateUpdateSql() {
      let tableData = this.tableData
      let primaryKey = this.formData.primaryKey

      let sqlStatements = [];
      for (const element of tableData) {
        let row = element;

        let tableNameStr = this.formData.tableName ? this.formData.tableName : 'table_name'
        let sql = `UPDATE ${tableNameStr} SET `;
        this.columns.forEach(col => {
          const key = col.prop;
          if (!primaryKey.includes(key)) {
            if (this.isEmptyToNull(key) && (row[key] === '' || row[key] === undefined || row[key] === null)) {
              sql += key + "=NULL, ";
            } else {
              sql += key + "='" + row[key] + "', ";
            }
          }
        });

        sql = sql.slice(0, -2);

        sql += " WHERE ";
        primaryKey.forEach(key => {
          sql += key + "='" + row[key] + "' AND ";
        });

        sql = sql.slice(0, -4);

        sql += ";";

        sqlStatements.push(sql);
      }

      this.sqlStr = sqlStatements.join('\n')
    },
    copyText() {
      if (!this.sqlStr) {
        return
      }
      this.$refs.codeEditor.selectAll()
      navigator.clipboard.writeText(this.sqlStr)
      this.$notifyUtil.success('复制成功');
    }
  }
}
</script>

<style scoped>
.dark .el-form-item {
  margin-bottom: 0;
}

.toolbar {
  flex-shrink: 0;
}

.toolbar .el-form-item {
  margin-top: 0px!important;
  margin-bottom: 10px!important;
}

.dataArea {
  flex-shrink: 0;
  height: 40vh;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.dataArea .table-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dataArea .table-container {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.dataArea .el-pagination {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 4px 8px;
}

.dataArea .el-pagination ::v-deep .el-pagination__total {
  display: flex;
  align-items: center;
  height: 28px;
  line-height: normal;
}

.resultArea {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.resultAreaForm .el-form-item {
  margin-top: 10px;
  margin-bottom: 10px;
}

.resultBox {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.excel-upload ::v-deep .el-upload {
  width: 100%;
}

.excel-upload ::v-deep .el-upload-dragger {
  width: 100%;
  height: 40vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
