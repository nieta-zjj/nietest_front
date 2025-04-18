import { Character } from "@/types/tags";
import { ApiResponse, SearchType } from "@/types/api";
import { loginApi as authLoginApi, getCurrentUser as authGetCurrentUser } from "../auth";

// 重新导出认证 API 函数，保持向后兼容性
export const loginApi = authLoginApi;
export const getCurrentUser = authGetCurrentUser;

/**
 * 安全获取认证令牌，避免因为未登录而导致的错误
 * 尝试从多个可能的位置获取token
 */
export const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null; // 服务端运行时返回null

    // 尝试多种可能的token键名
    const possibleTokenKeys = ['access_token', 'authToken', 'auth_token', 'token', 'accessToken'];

    // 1. 尝试从localStorage获取
    for (const key of possibleTokenKeys) {
        const token = localStorage.getItem(key);
        if (token && token !== 'undefined' && token !== 'null') {
            return token;
        }
    }

    // 2. 尝试从cookie获取
    if (document.cookie) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (possibleTokenKeys.some(key => name.includes(key)) && value) {
                return value;
            }
        }
    }

    // 3. 尝试从其他可能的全局变量获取
    if (window.hasOwnProperty('userInfo') && (window as any).userInfo?.token) {
        return (window as any).userInfo.token;
    }

    return null; // 如果没有找到token，返回null
};

/**
 * 搜索角色或元素
 * @param keywords 搜索关键词
 * @param pageIndex 页码（从0开始）
 * @param pageSize 每页结果数
 * @param type 搜索类型（角色或元素）
 * @returns API响应，包含结果数据、元数据或错误信息
 */
export const searchCharacterOrElement = async (
    keywords: string,
    pageIndex: number = 0,
    pageSize: number = 12,
    type: SearchType = SearchType.OC
): Promise<ApiResponse<Character[]>> => {
    try {
        // 构建API URL
        const endpoint = type === SearchType.OC ? 'character' : 'element';
        const apiUrl = `/api/search/${endpoint}?keywords=${encodeURIComponent(keywords)}&page_index=${pageIndex}&page_size=${pageSize}`;

        // 从多个可能的位置安全获取token
        const token = getAuthToken();

        // 设置请求头
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // 如果有token则添加到请求头
        if (token) {
            headers['x-token'] = token;
            headers['x-platform'] = 'nieta-app/web';
        }

        // 发送请求
        const response = await fetch(apiUrl, { headers });

        // 如果响应不成功，返回错误
        if (!response.ok) {
            // 特殊处理401错误，表示未授权
            if (response.status === 401) {
                console.warn("搜索请求未授权，可能需要登录");
                // 返回空数据而不是错误，以便UI仍然能正常显示
                return {
                    data: [],
                    metadata: {
                        total_size: 0,
                        total_page_size: 1
                    },
                    status: response.status
                };
            }

            return {
                error: `请求失败: ${response.status} ${response.statusText}`,
                status: response.status
            };
        }

        // 解析响应数据
        const data = await response.json();

        // 计算总页数和总结果数
        let totalSize = 0;
        if (Array.isArray(data) && data.length > 0) {
            totalSize = data[0]?.total_size || 0;
        }
        const totalPageSize = Math.ceil(totalSize / pageSize) || 1;

        // 返回结果
        return {
            data,
            metadata: {
                total_size: totalSize,
                total_page_size: totalPageSize
            },
            status: response.status
        };
    } catch (error) {
        console.error("API请求错误:", error);
        return {
            error: `网络错误: ${error instanceof Error ? error.message : String(error)}`
        };
    }
};