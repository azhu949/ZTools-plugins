// src/utils/axios.js

import axios from 'axios';

// 创建 axios 实例
const instance = axios.create({
    timeout: 10000, // 设置请求超时时间，单位是毫秒
});

// 请求拦截器
instance.interceptors.request.use(
    (config) => {
        // 在这里可以修改请求配置，添加认证等
        return config;
    },
    (error) => {
        // 请求错误处理
        return Promise.reject(error);
    }
);

// 响应拦截器
instance.interceptors.response.use(
    (response) => {
        // 在这里处理成功响应数据
        return response.data;
    },
    (error) => {
        // 响应错误处理
        const errorMessage = error.response ? error.response.data.message : 'Network Error';
        console.error('Request failed:', errorMessage);
        return Promise.reject(errorMessage);
    }
);

// 暴露
export default instance