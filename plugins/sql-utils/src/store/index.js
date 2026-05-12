import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        isDarkTheme: false,
        codeEditorThemeMode: 'dracula', // 代码编辑器主题
    },
    mutations: {
        updateIsDarkTheme(state, newValue) {
            state.isDarkTheme = newValue;
            state.codeEditorThemeMode = newValue ? 'dracula' : 'base16-light';
        }
    }
});