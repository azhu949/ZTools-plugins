import Vue from 'vue'
import App from './App.vue'
import store from './store';

import './css/dark-theme.scss';
import './css/sys.scss';

import router from './router'

import '@/assets/iconfont/iconfont.css'

import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import 'element-theme-darkplus/lib/index.css';
import 'element-theme-darkplus/lib/index.color.css';

import CodeEditor from 'vue-codemirror';
import 'codemirror/mode/javascript/javascript.js'
import 'codemirror/mode/sql/sql.js'
import 'codemirror/mode/vue/vue.js'
import 'codemirror/mode/clike/clike.js'
import 'codemirror/addon/search/search.js';
import 'codemirror/addon/search/searchcursor.js';
import 'codemirror/addon/dialog/dialog.js';
import 'codemirror/addon/dialog/dialog.css';
import 'codemirror/addon/selection/active-line.js'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/dracula.css'
import 'codemirror/theme/base16-dark.css'
import 'codemirror/theme/base16-light.css'

import VXETable from 'vxe-table'
import 'vxe-table/lib/style.css'
import VXETablePluginElement from 'vxe-table-plugin-element'
import 'vxe-table-plugin-element/dist/style.css'

import * as strUtil from '@/utils/strUtil.js';
import * as randomData from '@/utils/getRandomData.js';
import * as ddlParser from '@/utils/DDLParser.js';
import * as codeEditor from '@/utils/codeEditor.js';
import * as handlebarsUtil from '@/utils/handlebarsUtil.js';
import * as dateTimeUtil from '@/utils/dateTimeUtil.js';
import NotifyUtil from '@/utils/notifyUtil.js';

Vue.use(ElementUI);

Vue.use(CodeEditor, {
    options: {
        undoDepth: 100,
        cursorBlinkRate: 530,
        styleActiveLine: true,
        styleSelectedText: true,
        highlightSelectionMatches: true,
        lineNumbers: true,
        tabSize: 4,
        indentUnit: 2,
        smartIndent: true,
        electricChars: true,
        scrollbarStyle: 'native',
        lineWrapping: true,
        inputStyle: 'contenteditable',
        coverGutterNextToScrollbar: true,
        search: {
            showSearchButton: true,
        },
        replace: true,
        extraKeys: {
            'Ctrl-F': 'findPersistent',
            'Ctrl-H': 'replace'
        }
    }
});

VXETable.use(VXETablePluginElement)
Vue.use(VXETable)

Vue.prototype.$strUtil = strUtil;
Vue.prototype.$randomData = randomData;
Vue.prototype.$ddlParser = ddlParser;
Vue.prototype.$codeEditor = codeEditor;
Vue.prototype.$handlebarsUtil = handlebarsUtil;
Vue.prototype.$dateTimeUtil = dateTimeUtil;
Vue.prototype.$notifyUtil = {
  success: (title = '成功', message) => NotifyUtil.success(title, message),
  error: (title = '错误', message) => NotifyUtil.error(title, message),
  warning: (title = '警告', message) => NotifyUtil.warning(title, message),
  info: (title = '提示', message) => NotifyUtil.info(title, message),
  notify: (options) => NotifyUtil.notify(options)
};

Vue.config.productionTip = false

window.Vue = Vue;

new Vue({
  store,
  render: h => h(App),
  router,
}).$mount('#app')

const debounce = (fn, delay) => {
    let timer
    return (...args) => {
        if (timer) {
            clearTimeout(timer)
        }
        timer = setTimeout(() => {
            fn(...args)
        }, delay)
    }
}

const _ResizeObserver = window.ResizeObserver;
window.ResizeObserver = class ResizeObserver extends _ResizeObserver{
    constructor(callback) {
        callback = debounce(callback, 50);
        super(callback);
    }
}
