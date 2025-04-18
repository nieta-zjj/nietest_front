// 从客户端导出认证相关的 API 函数和钩子
export {
    loginApi,
    getCurrentUser,
    getStorageItem,
    setStorageItem,
    removeStorageItem,
    useAuth,
    AuthContext,
    type AuthContextType
} from './client';

// 导出认证提供器组件
export { AuthProvider } from './provider';

// 重新导出类型
export type { User } from '@/types/api';