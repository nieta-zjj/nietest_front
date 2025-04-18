import { TagType, Tag } from "@/types/tags";

/**
 * 常量配置区域
 */
// 最大变量名长度限制
export const MAX_VARIABLE_NAME_LENGTH = 12;

// 截断文本的默认最大长度
export const DEFAULT_TEXT_TRUNCATE_LENGTH = 23;

// 图像比例选项
export const ratioOptions = [
    { value: "1:1", label: "1:1" },
    { value: "2:3", label: "2:3" },
    { value: "3:2", label: "3:2" },
    { value: "3:4", label: "3:4" },
    { value: "4:3", label: "4:3" },
    { value: "3:5", label: "3:5" },
    { value: "5:3", label: "5:3" },
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
];

/**
 * 预设变量名映射
 * 为每种标签类型（除batch和character外）提供默认变量名
 */
export const RESERVED_VARIABLE_NAMES: Record<Exclude<TagType, "batch" | "character">, string> = {
    ratio: "比例测试",
    seed: "种子测试",
    polish: "润色测试",
    prompt: "",  // prompt 类型不使用预设名，但包含在类型中避免索引错误
    element: "元素测试", // 添加元素类型的预设变量名
};

/**
 * 标签类型选项配置
 * 用于UI显示和类型转换
 */
export const TAG_TYPE_OPTIONS = [
    { key: "prompt", label: "提示词" },
    { key: "ratio", label: "比例" },
    { key: "batch", label: "批次" },
    { key: "seed", label: "种子" },
    { key: "polish", label: "润色" },
    { key: "character", label: "角色" },
    { key: "element", label: "元素" },
] as const;

// 标签类型到显示名称的映射缓存，提高性能
const TYPE_DISPLAY_NAME_MAP = new Map<TagType, string>(
    TAG_TYPE_OPTIONS.map(option => [option.key as TagType, option.label])
);

/**
 * 根据标签类型获取默认值
 * @param type 标签类型
 * @returns 对应类型的默认值
 */
export const getDefaultValueByType = (type: TagType): string => {
    switch (type) {
        case "prompt": return "";
        case "ratio": return "3:5";
        case "batch": return "1";
        case "seed": return "0";
        case "polish": return "false";
        case "character": return "";
        case "element": return "";
        default: return "";
    }
};

/**
 * 获取标签类型的显示名称
 * @param type 标签类型
 * @returns 用于显示的名称
 */
export const getTypeDisplayName = (type: TagType): string => {
    // 使用缓存的映射表，比重复查找更高效
    return TYPE_DISPLAY_NAME_MAP.get(type) || type;
};

/**
 * 检查变量名在现有标签中是否唯一
 * @param name 要检查的变量名
 * @param tags 现有标签列表
 * @returns 变量名是否唯一
 */
export const isVariableNameUnique = (name: string, tags: Tag[]): boolean => {
    return !tags.some(tag => tag.isVariable && tag.name === name);
};

/**
 * 检查变量名长度是否合法
 * @param name 要检查的变量名
 * @returns 变量名长度是否合法
 */
export const isVariableNameLengthValid = (name: string): boolean => {
    return name.length <= MAX_VARIABLE_NAME_LENGTH;
};

/**
 * 截断文本并添加省略号，用于UI显示
 * @param text 要截断的文本
 * @param maxLength 最大允许长度，默认为23
 * @returns 截断后的文本
 */
export const truncateText = (text: string, maxLength: number = DEFAULT_TEXT_TRUNCATE_LENGTH): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
};

/**
 * 检查标签类型在标签列表中是否唯一
 * @param type 要检查的标签类型
 * @param tags 现有标签列表
 * @returns 类型是否唯一
 */
export const isTypeUnique = (type: TagType, tags: Tag[]): boolean => {
    // prompt、character和element类型可以有多个
    if (type === "prompt" || type === "character" || type === "element") return true;

    // 其他类型每种只能有一个
    return !tags.some(tag => tag.type === type);
};

/**
 * 获取标签的显示文本
 * @param tag 标签对象
 * @returns 格式化后的显示文本
 */
export const getTagDisplayText = (tag: Tag): string => {
    if (tag.isVariable) {
        return `${tag.name || ''} [变量]`;
    }

    if (tag.type === "prompt") {
        return truncateText(tag.value);
    }

    if (tag.type === "character" || tag.type === "element") {
        return `${truncateText(tag.value)}`;
    }

    return `${getTypeDisplayName(tag.type)}: ${truncateText(tag.value)}`;
};