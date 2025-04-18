/**
 * API 响应接口
 */
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    status?: number;
    metadata?: any;
}

/**
 * 用户信息接口
 */
export interface User {
    _id: string;
    email: string;
    fullname?: string;
    roles: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * 标准 API 响应格式
 */
export interface StandardApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

/**
 * 登录令牌数据
 */
export interface TokenData {
    access_token: string;
    token_type: string;
}

/**
 * 登录响应接口
 */
export interface LoginResponse extends StandardApiResponse<TokenData> { }

/**
 * 搜索类型枚举
 */
export enum SearchType {
    OC = 'oc',
    ELEMENTUM = 'elementum'
}

/**
 * 搜索响应的元数据
 */
export interface SearchMetadata {
    total_size: number;
    total_page_size: number;
}