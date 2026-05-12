//引入vue
import Vue from 'vue'

//引入VueRouter
import VueRouter from 'vue-router'

//引入 参与路由配置 的组件
import textJoint from '../views/textJoint.vue'
import excelToSql from '../views/excelToSql.vue'
import generateTestData from '../views/generateTestData.vue'
import codeGenerator from '../views/codeGenerator/codeGenerator.vue'

Vue.use(VueRouter)

//创建并暴露router实例对象，去管理一组一组的路由规则
export default new VueRouter({
    routes: [
        {
            path: '/',
            redirect: '/textJoint'
        },
        {
            path: '/textJoint',
            name: 'textJoint',
            component: textJoint
        },
        {
            path: '/excelToSql',
            name: 'excelToSql',
            component: excelToSql
        },
        {
            path: '/generateTestData',
            name: 'generateTestData',
            component: generateTestData
        },
        {
            path: '/codeGenerator',
            name: 'codeGenerator',
            component: codeGenerator
        },
    ]
})

const VueRouterPush = VueRouter.prototype.push
VueRouter.prototype.push = function push (to) {
    return VueRouterPush.call(this, to).catch(err => err)
}
