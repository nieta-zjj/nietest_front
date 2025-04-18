// 标签的类型定义
export type TagType = "prompt" | "ratio" | "batch" | "polish" | "seed" | "character" | "element";

// 标签数据接口
export interface Tag {
    id: string;
    name?: string; // 变量名称，只有变量标签需要
    type: TagType;
    isVariable: boolean;
    color: string;
    gradientToColor?: string; // 渐变色终点
    useGradient?: boolean; // 是否使用渐变
    value: string; // 标签值
    uuid?: string; // 角色或元素UUID
    avatar?: string; // 角色或元素头像
    heat_score?: number; // 热度分数
    weight?: number; // 权重，用于角色和元素标签
}

// 变量值接口 - 所有值统一使用字符串，在UI层做转换
export interface VariableValue {
    id: string;
    tagId: string;
    value: string;
    uuid?: string; // 角色UUID
    avatar?: string; // 角色头像
    weight?: number; // 权重，用于角色和元素变量值
}

// 角色数据接口
export interface Character {
    uuid: string;
    type: string;
    name: string;
    avatar_img: string;
    header_img: string;
    heat_score: number;
}