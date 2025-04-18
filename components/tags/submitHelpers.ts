"use client";

import { Tag, VariableValue } from "@/types/tags";
import { validateSubmission } from "./submitValidations";
import { getAuthToken } from "@/app/api/client";
import { getCurrentUser } from "@/app/api/auth";
import { alertService } from "@/utils/alertService";

/**
 * 显示通知消息
 * @param options 通知选项
 */
const showAlert = (options: { title: string; description: string; variant?: string }) => {
    // 直接使用alertService
    alertService.show(options);
};

/**
 * 检查标签是否存在
 * @param tags 标签数组
 * @returns 如果有错误返回错误对象，否则返回null
 */
export const checkTagsExist = (tags: Tag[]): { message: string } | null => {
    if (tags.length === 0) {
        return {
            message: "请至少添加一个标签"
        };
    }
    return null;
};

/**
 * 提交前进行验证，如果验证失败会显示错误提示
 * @param tags 标签数组
 * @param variableValues 变量值数组
 * @returns 如果验证通过返回true，否则返回false
 */
export const validateBeforeSubmit = (
    tags: Tag[],
    variableValues: VariableValue[]
): boolean => {
    // 检查标签是否存在
    const tagsError = checkTagsExist(tags);
    if (tagsError) {
        showAlert({
            title: "提交失败",
            description: tagsError.message,
            variant: "destructive",
        });
        return false;
    }

    // 执行其他验证
    const validationError = validateSubmission(tags, variableValues);
    if (validationError) {
        showAlert({
            title: "提交失败",
            description: validationError.message,
            variant: "destructive",
        });
        return false;
    }

    return true;
};

/**
 * 获取当前登录用户名
 * @returns 当前用户名，如果未登录则返回'anonymous_user'
 */
export const getCurrentUsername = async (): Promise<string> => {
    // 首先检查是否有有效的认证令牌
    const token = getAuthToken();
    if (!token) {
        console.log('未找到有效的认证令牌，使用匿名用户名');
        return 'anonymous_user';
    }

    try {
        // 调用API获取当前用户信息
        const userResponse = await getCurrentUser();

        // 如果成功获取用户信息
        if (userResponse.data) {
            const userData = userResponse.data;

            // 按优先级尝试使用不同的用户名字段
            if (userData.fullname) {
                return userData.fullname;
            } else if (userData.email) {
                // 如果只有邮箱，可以截取邮箱前缀作为用户名
                return userData.email.split('@')[0];
            } else if ('_id' in userData) {
                return `user_${userData._id}`;
            }
        }

        // 如果无法获取用户信息，回退到使用令牌信息
        console.log('无法获取用户详细信息，使用令牌信息');
        return `user_with_token`;
    } catch (error) {
        console.error('获取用户信息失败:', error);
        return 'anonymous_user';
    }
};

/**
 * 准备提交数据
 * @param tags 标签数组
 * @param variableValues 变量值数组
 * @param taskName 任务名称
 * @returns 准备好的提交数据对象
 */
export const prepareSubmitData = async (
    tags: Tag[],
    variableValues: VariableValue[],
    taskName: string = "无标题任务" // 默认任务名称
): Promise<SubmitData> => {
    // 获取当前登录用户的名称（通过API调用）
    const username = await getCurrentUsername();

    // 创建变量标签ID到变量名的映射
    const variableTagIdToName: Record<string, string> = {};
    tags.forEach(tag => {
        if (tag.isVariable && tag.name) {
            variableTagIdToName[tag.id] = tag.name;
        }
    });

    // 创建变量数据字典 - 键为变量名，值为包含id和value的对象数组
    const variables: Record<string, { id: string; value: string }[]> = {};

    // 按变量名分组变量值（保留id和value）
    variableValues.forEach(value => {
        const variableName = variableTagIdToName[value.tagId];
        if (variableName) {
            if (!variables[variableName]) {
                variables[variableName] = [];
            }
            variables[variableName].push({
                id: value.id,
                value: value.value
            });
        }
    });

    // 按标签ID分组变量值（用于tags附加数据）
    const variablesByTagId: Record<string, string[]> = {};
    variableValues.forEach(value => {
        if (!variablesByTagId[value.tagId]) {
            variablesByTagId[value.tagId] = [];
        }
        variablesByTagId[value.tagId].push(value.value);
    });

    // 准备标签数据，保留id字段
    const tagData = tags.map(tag => {
        // 对于变量标签，附加其值
        if (tag.isVariable) {
            return {
                ...tag, // 保留所有字段，包括id
                values: variablesByTagId[tag.id] || []
            };
        }
        return tag; // 保留所有字段，包括id
    });

    // 获取全局设置
    let globalSettings = { maxThreads: 4, xToken: '' };
    if (typeof window !== 'undefined') {
        try {
            const storedSettings = localStorage.getItem('droppable-tags-v2-global-settings');
            if (storedSettings) {
                const parsedSettings = JSON.parse(storedSettings);
                // 验证设置数据结构
                if (parsedSettings && typeof parsedSettings === 'object') {
                    // 确保 maxThreads 是有效数字
                    if (typeof parsedSettings.maxThreads === 'number' && !isNaN(parsedSettings.maxThreads)) {
                        globalSettings.maxThreads = parsedSettings.maxThreads;
                    }
                    // 确保 xToken 是字符串
                    if (typeof parsedSettings.xToken === 'string') {
                        globalSettings.xToken = parsedSettings.xToken;
                    }
                }
            }
        } catch (error) {
            console.error('加载全局设置失败:', error);
        }
    }

    // 返回最终提交数据 - 只有顶级字段不包含id
    return {
        username,
        task_name: taskName, // 添加任务名称
        tags: tagData,
        variables,
        settings: {
            maxThreads: globalSettings.maxThreads,
            xToken: globalSettings.xToken
        },
        createdAt: new Date().toISOString(),
    };
};

/**
 * 提交数据的响应类型
 */
interface SubmitResponse {
    success: boolean;
    message: string;
    data?: Record<string, any>;
    error?: string;
    timestamp?: string;
}

/**
 * 提交数据的类型
 */
interface SubmitData {
    username: string;
    task_name: string; // 新增任务名称字段
    tags: Array<Tag & { values?: string[] }>;
    variables: Record<string, Array<{ id: string; value: string }>>;
    settings: {
        maxThreads: number;
        xToken: string;
    };
    createdAt: string;
}

/**
 * 执行提交操作
 * @param data 提交数据
 * @returns Promise，解析为提交结果
 */
export const submitPost = async (data: SubmitData): Promise<SubmitResponse> => {
    try {
        // 使用统一的方法获取认证令牌
        const token = getAuthToken();

        if (!token) {
            throw new Error('未检测到有效的登录凭证，请重新登录');
        }

        // 暂时使用console.log代替实际API调用
        console.log('===== 提交数据开始 =====');
        console.log('认证令牌:', token);

        // 打印用户信息
        console.log('用户名:', data.username || '未指定');

        // 打印标签信息
        console.log('标签数量:', data.tags?.length || 0);

        // 再次检查变量标签数量
        const variableTagsCount = data.tags?.filter(tag => tag.isVariable).length || 0;
        console.log(`变量标签数量: ${variableTagsCount}`);

        if (variableTagsCount > 6) {
            throw new Error(`变量标签数量不能超过6个，当前有 ${variableTagsCount} 个`);
        }

        if (data.tags?.length > 0) {
            console.log('标签列表:');
            data.tags.forEach((tag: any, index: number) => {
                console.log(`  [${index + 1}] ${tag.name || '无名称'} (类型: ${tag.type}, 变量: ${tag.isVariable ? '是' : '否'})`);
                if (tag.isVariable && tag.values?.length > 0) {
                    console.log(`    - 值数量: ${tag.values.length}`);
                }
            });
        }

        // 打印变量信息（字典格式）
        if (data.variables && Object.keys(data.variables).length > 0) {
            console.log('变量字典:');
            Object.entries(data.variables).forEach(([variableName, values]) => {
                const valuesList = values as Array<{id: string; value: string}>;
                console.log(`  ${variableName}: [${valuesList.length} 个值]`);
                valuesList.forEach((item, index) => {
                    console.log(`    ${index + 1}. "${item.value}"`);
                });
            });

            // 统计变量和值的总数
            const totalVariables = Object.keys(data.variables).length;
            const totalValues = Object.values(data.variables).reduce(
                (sum, arr: Array<{id: string; value: string}>) => sum + arr.length, 0
            );
            console.log(`共计 ${totalVariables} 个变量，${totalValues} 个值`);
        } else {
            console.log('无变量数据');
        }

        // 打印设置信息
        console.log('全局设置:', data.settings);
        console.log('创建时间:', data.createdAt);

        // 完整数据（收起状态）
        console.log('完整JSON数据 (展开查看):', data);
        console.log('===== 提交数据结束 =====');

        // 显示成功通知
        showAlert({
            title: "提交成功",
            description: "数据已成功提交，详细信息请查看控制台。",
        });

        // 模拟成功响应
        return {
            success: true,
            message: '提交成功（模拟）',
            timestamp: new Date().toISOString(),
            data: data
        };

        // 原始API调用代码（暂时注释）
        /*
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '提交失败');
        }

        return await response.json();
        */
    } catch (error) {
        console.error('提交失败:', error);
        showAlert({
            title: "提交失败",
            description: error instanceof Error ? error.message : '发生未知错误',
            variant: "destructive",
        });
        throw error;
    }
};

/**
 * 完整的提交流程:
 * 1. 验证数据
 * 2. 准备数据
 * 3. 提交数据
 * @param tags 标签数组
 * @param variableValues 变量值数组
 * @returns Promise，解析为提交结果，或者如果验证失败则为null
 */
/**
 * 计算将生成的图片总数
 * @param tags 标签数组
 * @param variableValues 变量值数组
 * @returns 图片总数
 */
export const calculateTotalImages = (tags: Tag[], variableValues: VariableValue[]): number => {
    // 默认生成一张图片
    let totalImages = 1;

    // 获取batch标签的值
    const batchTag = tags.find(tag => tag.type === "batch" && !tag.isVariable);
    if (batchTag) {
        const batchValue = parseInt(batchTag.value);
        if (!isNaN(batchValue) && batchValue > 0) {
            totalImages *= batchValue;
        }
    }

    // 创建变量标签ID到变量名的映射
    const variableTagIdToName: Record<string, string> = {};
    tags.forEach(tag => {
        if (tag.isVariable && tag.name) {
            variableTagIdToName[tag.id] = tag.name;
        }
    });

    // 按变量名分组变量值
    const variablesByName: Record<string, VariableValue[]> = {};
    variableValues.forEach(value => {
        const variableName = variableTagIdToName[value.tagId];
        if (variableName) {
            if (!variablesByName[variableName]) {
                variablesByName[variableName] = [];
            }
            variablesByName[variableName].push(value);
        }
    });

    // 计算变量组合数
    Object.values(variablesByName).forEach(values => {
        if (values.length > 0) {
            totalImages *= values.length;
        }
    });

    return totalImages;
};

/**
 * 完整的提交流程:
 * 1. 验证数据
 * 2. 准备数据
 * 3. 提交数据
 * @param tags 标签数组
 * @param variableValues 变量值数组
 * @param taskName 任务名称
 * @returns Promise，解析为提交结果，或者如果验证失败则为null
 */
export const completeSubmitProcess = async (
    tags: Tag[],
    variableValues: VariableValue[],
    taskName: string = "无标题任务"
): Promise<SubmitResponse | null> => {
    // 第一步：验证
    // 先检查变量标签数量
    const variableTagsCount = tags.filter(tag => tag.isVariable).length;
    if (variableTagsCount > 6) {
        showAlert({
            title: "提交失败",
            description: `变量标签数量不能超过6个，当前有 ${variableTagsCount} 个`,
            variant: "destructive",
        });
        return null;
    }

    // 执行其他验证
    if (!validateBeforeSubmit(tags, variableValues)) {
        return null;
    }

    // 第二步：准备数据
    const data = await prepareSubmitData(tags, variableValues, taskName);

    // 第三步：提交（目前是模拟提交）
    try {
        // 执行提交操作
        const result = await submitPost(data);

        // 提交成功后记录详细信息
        console.log('提交成功:', result);

        // 统计标签和变量数据
        const totalTagsCount = tags.length;
        const variableTagsCount = tags.filter(tag => tag.isVariable).length;
        const variableNames = Object.keys(data.variables || {}).length;
        const totalVariableValues = Object.values(data.variables || {}).reduce(
            (sum, arr: Array<{id: string; value: string}>) => sum + arr.length,
            0
        );

        // 记录详细的统计信息
        console.log(`标签统计: 共 ${totalTagsCount} 个标签(其中变量标签 ${variableTagsCount} 个)`);
        console.log(`变量统计: 共 ${variableNames} 个变量(共 ${totalVariableValues} 个值)`);

        // 注意: submitPost函数已经显示了成功通知，这里不需要再显示

        return result;
    } catch (error) {
        // 错误已在submitPost中处理
        console.error('提交流程出错:', error);

        // 显示错误消息
        showAlert({
            title: "提交失败",
            description: error instanceof Error ? error.message : '发生未知错误',
            variant: "destructive",
        });

        return null;
    }
};