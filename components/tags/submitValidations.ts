import { Tag, VariableValue } from "@/types/tags";
import { getAuthToken } from "@/app/api/client";

/**
 * 验证错误类型
 */
export interface ValidationError {
    code: string;
    message: string;
}

/**
 * 检查用户是否已登录
 * 使用统一的 token 检测方法
 */
export const checkUserLoggedIn = (): ValidationError | null => {
    if (typeof window === 'undefined') return null; // 在服务器端不检查登录状态

    // 使用统一的 token 获取方法
    const token = getAuthToken();

    // 如果没有找到有效令牌，返回错误
    if (!token) {
        return {
            code: 'NOT_LOGGED_IN',
            message: '请先登录后再提交内容'
        };
    }

    return null;
};

/**
 * 检查变量标签数量是否超过限制 (最多6个变量标签)
 */
export const checkVariableTagsCount = (tags: Tag[]): ValidationError | null => {
    const variableTags = tags.filter(tag => tag.isVariable);

    if (variableTags.length > 6) {
        return {
            code: 'TOO_MANY_VARIABLE_TAGS',
            message: `变量标签数量不能超过6个，当前有 ${variableTags.length} 个`
        };
    }

    return null;
};

/**
 * 检查变量值的数量，确保每个变量标签都有足够的值
 * @param variableValues 变量值数组
 * @param tags 标签数组
 * @returns 如果有错误返回错误对象，否则返回null
 */
export const checkVariableValuesCount = (variableValues: VariableValue[], tags: Tag[]): ValidationError | null => {
    // 创建标签ID到名称的映射
    const tagIdToName: Record<string, string> = {};
    tags.forEach(tag => {
        tagIdToName[tag.id] = tag.name || `标签ID:${tag.id}`;
    });

    // 按标签ID分组变量值
    const countByTagId: Record<string, number> = {};
    variableValues.forEach(value => {
        if (!countByTagId[value.tagId]) {
            countByTagId[value.tagId] = 0;
        }
        countByTagId[value.tagId]++;
    });

    // 检查每个变量标签是否有足够的值
    for (const tag of tags) {
        if (tag.isVariable) {
            const count = countByTagId[tag.id] || 0;
            if (count > 10) {
                return {
                    code: 'TOO_MANY_VARIABLE_VALUES',
                    message: `标签 "${tagIdToName[tag.id] || `ID:${tag.id}`}" 的变量值不能超过10个`
                };
            }

            if (count === 0) {
                return {
                    code: 'MISSING_VARIABLE_VALUES',
                    message: `标签 "${tagIdToName[tag.id] || `ID:${tag.id}`}" 需要至少一个变量值`
                };
            }
        }
    }

    return null;
};

/**
 * 检查标签是否存在禁止的组合
 * @param tags 标签数组
 * @returns 如果有错误返回错误对象，否则返回null
 */
export const checkForbiddenTagCombinations = (tags: Tag[]): ValidationError | null => {
    // 示例：检查标签组合。在实际应用中，可能需要根据具体业务逻辑进行定制
    const tagNames = tags.map(tag => (tag.name || '').toLowerCase());

    // 示例：不允许同时使用"废弃"和"推荐"标签
    if (tagNames.includes('废弃') && tagNames.includes('推荐')) {
        return {
            code: 'FORBIDDEN_TAG_COMBINATION',
            message: '不能同时使用"废弃"和"推荐"标签'
        };
    }

    return null;
};

/**
 * 执行所有验证规则
 * @param tags 标签数组
 * @param variableValues 变量值数组
 * @returns 如果有错误返回错误对象，否则返回null
 */
export const validateSubmission = (tags: Tag[], variableValues: VariableValue[]): ValidationError | null => {
    // 检查用户是否已登录
    const loginError = checkUserLoggedIn();
    if (loginError) return loginError;

    // 检查变量标签数量
    const variableTagsError = checkVariableTagsCount(tags);
    if (variableTagsError) return variableTagsError;

    // 检查变量值的数量
    const variableValuesError = checkVariableValuesCount(variableValues, tags);
    if (variableValuesError) return variableValuesError;

    // 检查标签组合
    const tagCombinationError = checkForbiddenTagCombinations(tags);
    if (tagCombinationError) return tagCombinationError;

    // 所有验证通过
    return null;
};

/**
 * 使用示例:
 *
 * // 在提交表单或数据之前
 * const validationError = validateSubmission(tags, variableValues);
 * if (validationError) {
 *     // 显示错误消息
 *     alert(validationError.message);
 *     return; // 阻止提交
 * }
 *
 * // 继续提交流程...
 */