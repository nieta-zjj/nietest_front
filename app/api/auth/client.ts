import { useRouter } from "next/navigation";
import { useState, useEffect, createContext, useContext } from "react";
import { User, ApiResponse, LoginResponse, TokenData } from "@/types/api";

/**
 * 认证上下文接口
 */
export interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    checkAuth: () => Promise<boolean>;
}

/**
 * 登录API函数
 * @param email 用户邮箱
 * @param password 用户密码
 */
export const loginApi = async (
    email: string,
    password: string
): Promise<ApiResponse<LoginResponse>> => {
    try {
        // 构建API URL
        const apiUrl = `/api/v1/auth/login`;

        // 创建表单数据（FastAPI的OAuth2PasswordRequestForm期望表单格式而不是JSON）
        const formData = new URLSearchParams();
        formData.append('username', email); // 使用email作为username
        formData.append('password', password);

        // 发送登录请求 - 使用表单格式
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-platform': 'nieta-app/web'
            },
            body: formData
        });

        // 如果响应不成功，返回错误
        if (!response.ok) {
            const errorData = await response.json();
            return {
                error: errorData.error || `登录失败: ${response.status} ${response.statusText}`,
                status: response.status
            };
        }

        // 解析JSON响应
        const data = await response.json();
        return { data, status: response.status };
    } catch (error) {
        console.error("登录请求错误:", error);
        return {
            error: `网络错误: ${error instanceof Error ? error.message : String(error)}`
        };
    }
};

/**
 * 获取当前用户信息API函数
 */
export const getCurrentUser = async (): Promise<ApiResponse<User>> => {
    try {
        // 获取token
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

        // 如果没有token，返回错误
        if (!token) {
            return {
                error: '未提供授权令牌',
                status: 401
            };
        }

        // 构建API URL - 使用正确的用户信息API路径
        const apiUrl = `/api/v1/users/me`;

        // 发送请求获取用户信息 - 使用标准的OAuth2 Bearer认证
        const response = await fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // 标准OAuth2 Bearer认证
                'x-platform': 'nieta-app/web'
            }
        });

        // 如果响应不成功，返回错误
        if (!response.ok) {
            const errorData = await response.json();
            return {
                error: errorData.error || `获取用户信息失败: ${response.status} ${response.statusText}`,
                status: response.status
            };
        }

        // 解析JSON响应
        const responseData = await response.json();
        console.log("用户信息原始响应:", responseData);

        // 处理可能的标准响应格式
        const userData = responseData.data ? responseData.data : responseData;

        return { data: userData, status: response.status };
    } catch (error) {
        console.error("获取用户信息请求错误:", error);
        return {
            error: `网络错误: ${error instanceof Error ? error.message : String(error)}`
        };
    }
};

/**
 * 安全获取本地存储的值，避免在服务器端出错
 */
export const getStorageItem = (key: string): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(key);
    }
    return null;
};

/**
 * 安全设置本地存储的值，避免在服务器端出错
 */
export const setStorageItem = (key: string, value: string): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
    }
};

/**
 * 安全删除本地存储的值，避免在服务器端出错
 */
export const removeStorageItem = (key: string): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
    }
};

/**
 * 创建认证上下文
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 使用认证上下文的钩子
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth 必须在 AuthProvider 内部使用");
    }
    return context;
};

/**
 * 创建认证提供器自定义钩子
 */
export const useAuthProvider = () => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // 获取用户信息
    const fetchUserInfo = async () => {
        setError(null);
        try {
            console.log("正在获取用户信息...");
            const response = await getCurrentUser();
            console.log("获取用户信息响应:", response);

            if (response.error) {
                setUser(null);
                setError(response.error);
                if (response.status === 401) {
                    // Token 无效，清除本地存储
                    removeStorageItem("access_token");
                    setToken(null);
                }
                return false;
            } else if (response.data) {
                // 尝试从响应中解析用户数据，处理可能的嵌套结构
                let userData: any = response.data;

                // 检查并调整用户数据格式 - 支持多种可能的后端响应格式
                if (userData.code !== undefined && userData.data !== undefined) {
                    userData = userData.data; // 标准响应格式的内层data
                }

                console.log("获取到用户信息:", userData);
                setUser(userData as User);
                return true;
            } else {
                setUser(null);
                setError("获取用户信息失败: 响应中没有数据");
                return false;
            }
        } catch (error) {
            console.error("获取用户信息失败:", error);
            setUser(null);
            setError(`网络错误，无法连接到API服务器: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    };

    // 登录方法
    const login = async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            console.log(`尝试登录，用户名: ${email}`);
            const response = await loginApi(email, password);

            console.log("登录响应:", response);

            if (response.error) {
                setIsLoading(false);
                setError(response.error);
                return false;
            }

            // 检查响应数据正确性
            if (response.data?.data?.access_token) {
                const accessToken = response.data.data.access_token;
                console.log("登录成功，已获取访问令牌:", accessToken);

                // 存储token到localStorage
                setStorageItem("access_token", accessToken);
                setToken(accessToken);

                // 获取用户信息
                const authSuccess = await fetchUserInfo();
                setIsLoading(false);
                return authSuccess;
            } else {
                console.error("登录响应结构不正确:", response);
                setIsLoading(false);
                setError("登录响应结构不正确，无法获取访问令牌");
                return false;
            }
        } catch (error) {
            console.error("登录失败:", error);
            setIsLoading(false);
            setError(`网络错误，无法连接到API服务器: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    };

    // 退出登录方法
    const logout = () => {
        removeStorageItem("access_token");
        setToken(null);
        setUser(null);
        router.push("/login");
    };

    // 检查认证状态
    const checkAuth = async (): Promise<boolean> => {
        if (!token) return false;
        return await fetchUserInfo();
    };

    // 初始化时检查用户认证状态
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = getStorageItem("access_token");
            if (storedToken) {
                setToken(storedToken);
                await fetchUserInfo();
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    return {
        user,
        token,
        isLoading,
        error,
        login,
        logout,
        checkAuth,
    };
};