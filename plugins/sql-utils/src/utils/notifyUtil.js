/**
 * 通知工具类
 * 提供统一的通知方法
 */
class NotifyUtil {
  /**
   * 获取当前Vue实例
   * @returns {Vue} Vue实例
   */
  static getCurrentVueInstance() {
    // 通过全局Vue构造函数获取当前实例
    if (window.Vue && window.Vue.prototype && window.Vue.prototype.$notify) {
      return window.Vue.prototype;
    }
    // 如果无法获取全局Vue实例，尝试通过document获取当前活跃的Vue实例
    const app = document.querySelector('#app');
    if (app && app.__vue__) {
      return app.__vue__;
    }
    throw new Error('无法获取Vue实例');
  }

  /**
   * 显示成功通知
   * @param {string} title 通知标题，默认为"成功"
   * @param {string} message 通知消息
   */
  static success(title = '成功', message) {
    const vueInstance = this.getCurrentVueInstance();
    vueInstance.$notify({
      title: title,
      message: message,
      type: 'success',
      duration: 2000
    });
  }

  /**
   * 显示错误通知
   * @param {string} title 通知标题，默认为"错误"
   * @param {string} message 通知消息
   */
  static error(title = '错误', message) {
    const vueInstance = this.getCurrentVueInstance();
    vueInstance.$notify({
      title: title,
      message: message,
      type: 'error',
      duration: 3000
    });
  }

  /**
   * 显示警告通知
   * @param {string} title 通知标题，默认为"警告"
   * @param {string} message 通知消息
   */
  static warning(title = '警告', message) {
    const vueInstance = this.getCurrentVueInstance();
    vueInstance.$notify({
      title: title,
      message: message,
      type: 'warning',
      duration: 3000
    });
  }

  /**
   * 显示信息通知
   * @param {string} title 通知标题，默认为"提示"
   * @param {string} message 通知消息
   */
  static info(title = '提示', message) {
    const vueInstance = this.getCurrentVueInstance();
    vueInstance.$notify({
      title: title,
      message: message,
      type: 'info',
      duration: 2000
    });
  }

  /**
   * 显示自定义通知
   * @param {Object} options 通知配置
   */
  static notify(options) {
    const vueInstance = this.getCurrentVueInstance();
    vueInstance.$notify(options);
  }
}

export default NotifyUtil;