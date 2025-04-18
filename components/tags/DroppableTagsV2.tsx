"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@heroui/react";
import { useDisclosure } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { getRandomColorValue, getRandomGradientColors } from "@/config/colors";
import { Tag, VariableValue, TagType } from "@/types/tags";
import {
    getDefaultValueByType,
    isVariableNameUnique,
    isTypeUnique,
    RESERVED_VARIABLE_NAMES,
    getTypeDisplayName,
    isVariableNameLengthValid,
    truncateText,
} from "@/components/tags/tagUtils";
import { CloseIcon } from "@/components/icons";
import { useAuth } from "@/app/api/auth";
import { useRouter } from "next/navigation";
import { alertService } from "@/utils/alertService";
import { calculateTotalImages } from "./submitHelpers";
// 不再需要这个组件
// import VToken from "./VToken";

// dnd-kit 相关导入
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    // closestCenter, // 不再需要这个函数
    DragStartEvent,
    DragEndEvent,
    DragMoveEvent,
    MeasuringStrategy,
    defaultDropAnimationSideEffects,
    pointerWithin,
    rectIntersection
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// 本地存储键名常量
const STORAGE_KEYS = {
    TAGS: 'droppable-tags-v2-tags',
    VARIABLE_VALUES: 'droppable-tags-v2-variable-values',
    GLOBAL_SETTINGS: 'droppable-tags-v2-global-settings'
};

// 导入子组件
import AddTagForm from "./AddTagForm";
import EditTagModal from "./EditTagModal";
import VariableValueList from "./VariableValueList";
import ColorButton from "../ColorButton";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Input } from "@heroui/input";

// 添加UserIcon组件
const UserIcon: React.FC<{ size?: number }> = ({ size = 16 }) => {
    return (
        <svg
            height={size}
            width={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
                fill="currentColor"
            />
            <path
                d="M12.0002 14.5C6.99016 14.5 2.91016 17.86 2.91016 22C2.91016 22.28 3.13016 22.5 3.41016 22.5H20.5902C20.8702 22.5 21.0902 22.28 21.0902 22C21.0902 17.86 17.0102 14.5 12.0002 14.5Z"
                fill="currentColor"
            />
        </svg>
    );
};

// 验证标签数据
const validateTags = (tags: any[]): Tag[] => {
    if (!Array.isArray(tags)) return [];

    return tags.filter(tag => {
        // 确保标签有所有必需的字段
        return (
            tag &&
            typeof tag.id === 'string' &&
            typeof tag.type === 'string' &&
            typeof tag.isVariable === 'boolean' &&
            typeof tag.color === 'string' &&
            typeof tag.value === 'string'
        );
    });
};

// 验证变量值数据
const validateVariableValues = (values: any[], validTags: Tag[]): VariableValue[] => {
    if (!Array.isArray(values)) return [];

    // 获取所有有效标签ID列表，用于验证变量值关联
    const validTagIds = validTags.map(tag => tag.id);

    return values.filter(value => {
        // 确保变量值有所有必需的字段且关联到有效的标签
        return (
            value &&
            typeof value.id === 'string' &&
            typeof value.tagId === 'string' &&
            typeof value.value === 'string' &&
            validTagIds.includes(value.tagId)
        );
    });
};

/**
 * 可排序标签项组件
 */
const SortableTagItem: React.FC<{
    tag: Tag;
    onEdit: () => void;
    onRemove: () => void;
    onToggleVariable: () => void;
}> = ({ tag, onEdit, onRemove }) => {
    // 使用useRef来保持DOM元素的引用，用于测量宽度
    const elementRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState<number | undefined>(undefined);

    // 使用 dnd-kit 的 useSortable hook
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: tag.id,
        data: {
            width: width,
            tag: tag,
        }
    });

    // 在组件挂载后和每次窗口尺寸变化时以及标签内容变化时测量元素宽度
    useEffect(() => {
        const updateWidth = () => {
            if (elementRef.current) {
                const rect = elementRef.current.getBoundingClientRect();
                setWidth(rect.width);
            }
        };

        // 初始时测量
        updateWidth();

        // 使用ResizeObserver监听元素大小变化，比window.resize更精确
        const resizeObserver = new ResizeObserver(updateWidth);
        if (elementRef.current) {
            resizeObserver.observe(elementRef.current);
        }

        // 监听窗口大小变化作为后备
        window.addEventListener('resize', updateWidth);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateWidth);
        };
    }, [tag.value, tag.name, tag.type]); // 当标签内容或类型变化时重新测量

    // 应用拖拽时的样式，修改为拖拽时完全隐藏原元素
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1, // 拖拽时完全隐藏原元素
        zIndex: isDragging ? 10 : 1,
        // 只在拖拽时设置固定宽度，否则让元素自然调整尺寸
        ...(isDragging && width ? { width: `${width}px` } : {})
    };

    // 根据标签类型和变量状态决定按钮样式
    const getButtonVariant = () => {
        if (tag.isVariable) {
            return "shadow";
        }
        if (tag.type === "prompt") {
            return "solid";
        }
        return "solid";
    };

    // 获取标签显示文本
    const getDisplayText = () => {
        let text = "";
        if (tag.isVariable) {
            text = `${tag.name || ''} [变量]`;
        } else if (tag.type === "prompt") {
            text = truncateText(tag.value);
        } else if (tag.type === "character") {
            text = truncateText(tag.value);
        } else {
            text = `${getTypeDisplayName(tag.type)}: ${truncateText(tag.value)}`;
        }

        // 如果有权重，显示权重信息
        if ((tag.type === "character" || tag.type === "element") && tag.weight !== undefined) {
            text += ` [权重: ${tag.weight}]`;
        }

        return text;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative inline-block"
            data-tag-id={tag.id}
            {...attributes}
        >
            <div className="relative group" ref={elementRef}>
                {tag.type === "character" ? (
                    <ColorButton
                        hexColor={tag.color}
                        useGradient={tag.useGradient}
                        gradientToColor={tag.gradientToColor}
                        variant={getButtonVariant()}
                        className="group-hover:scale-105 transition-transform cursor-move whitespace-nowrap"
                        onPress={!isDragging ? onEdit : undefined}
                        startContent={
                            tag.isVariable ? (
                                <div className="h-5 w-5 flex-shrink-0 text-foreground">
                                    <UserIcon size={20} />
                                </div>
                            ) : (
                                tag.avatar && (
                                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                                        <img
                                            src={tag.avatar}
                                            alt=""
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%23dddddd"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="12" fill="%23888888" text-anchor="middle" dominant-baseline="middle"%3E角色%3C/text%3E%3C/svg%3E';
                                            }}
                                        />
                                    </div>
                                )
                            )
                        }
                        {...listeners}
                    >
                        {getDisplayText()}
                    </ColorButton>
                ) : (
                    <ColorButton
                        hexColor={tag.color}
                        useGradient={tag.useGradient}
                        gradientToColor={tag.gradientToColor}
                        variant={getButtonVariant()}
                        className="group-hover:scale-105 transition-transform cursor-move whitespace-nowrap"
                        onPress={!isDragging ? onEdit : undefined}
                        startContent={
                            tag.isVariable && tag.type.includes("character") ? (
                                <div className="h-5 w-5 flex-shrink-0 text-foreground">
                                    <UserIcon size={20} />
                                </div>
                            ) : null
                        }
                        {...listeners}
                    >
                        {getDisplayText()}
                    </ColorButton>
                )}

                <motion.div
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                >
                    <Button
                        isIconOnly
                        size="sm"
                        color="danger"
                        variant="shadow"
                        className="rounded-full z-10"
                        onPress={() => onRemove()}
                    >
                        <CloseIcon size={12} />
                    </Button>
                </motion.div>
            </div>
        </div>
    );
};

/**
 * 可拖拽标签主组件 v2 - 使用 dnd-kit
 */
const DroppableTagsV2: React.FC = () => {
    // 引入认证上下文和路由
    const { user } = useAuth();
    const router = useRouter();

    // 模态框状态
    const {
        isOpen: isLoginTipOpen,
        onOpen: onLoginTipOpen,
        onClose: onLoginTipClose
    } = useDisclosure();

    // 提交确认模态框状态
    const {
        isOpen: isConfirmOpen,
        onOpen: onConfirmOpen,
        onClose: onConfirmClose
    } = useDisclosure();

    // 二次确认模态框状态（大量图片）
    const {
        isOpen: isSecondConfirmOpen,
        onOpen: onSecondConfirmOpen,
        onClose: onSecondConfirmClose
    } = useDisclosure();

    // 存储计算出的图片总数
    const [totalImages, setTotalImages] = useState<number>(0);

    // 状态初始化为空数组，避免水合错误
    const [tags, setTags] = useState<Tag[]>([]);
    const [variableValues, setVariableValues] = useState<VariableValue[]>([]);
    const [globalSettings, setGlobalSettings] = useState({
        maxThreads: 4,
        xToken: ''
    });

    // 客户端数据加载完成标记
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // 设置模态框状态
    const {
        isOpen: isSettingsOpen,
        onOpen: onSettingsOpen,
        onClose: onSettingsClose
    } = useDisclosure();

    // 标签编辑模态框状态
    const {
        isOpen: isEditingTagModalOpen,
        onOpen: onEditingTagModalOpen,
        onClose: onEditingTagModalClose
    } = useDisclosure();

    // 控制添加表单显示状态
    const [showAddForm, setShowAddForm] = useState(false);

    // 预览颜色引用
    const previewColorRef = useRef(getRandomColorValue());
    const previewGradientColorRef = useRef(getRandomGradientColors());

    // 编辑状态
    const [editingTag, setEditingTag] = useState<Tag | null>(null);

    // dnd-kit 状态
    const [activeId, setActiveId] = useState<string | null>(null);

    // 获取活动中的标签
    const activeTag = activeId ? tags.find(tag => tag.id === activeId) || null : null;

    // 配置传感器
    const sensors = useSensors(
        useSensor(MouseSensor, {
            // 降低开始拖拽的阈值，使拖拽更容易触发
            activationConstraint: {
                distance: 4, // 4px 的移动就触发拖拽
            },
        }),
        useSensor(TouchSensor, {
            // 适配触摸设备
            activationConstraint: {
                delay: 250, // 触摸并保持 250ms 开始拖拽
                tolerance: 5, // 允许 5px 的移动容差
            },
        }),
        useSensor(KeyboardSensor)
    );

    // 在客户端加载时从localStorage初始化数据
    useEffect(() => {
        // 加载并验证标签数据
        const loadFromStorage = () => {
            try {
                // 加载标签数据
                const storedTagsJson = localStorage.getItem(STORAGE_KEYS.TAGS);
                const storedTags = storedTagsJson ? JSON.parse(storedTagsJson) : [];
                const validTags = validateTags(storedTags);

                // 加载变量值数据
                const storedValuesJson = localStorage.getItem(STORAGE_KEYS.VARIABLE_VALUES);
                const storedValues = storedValuesJson ? JSON.parse(storedValuesJson) : [];
                const validValues = validateVariableValues(storedValues, validTags);

                // 加载全局设置
                const storedSettingsJson = localStorage.getItem(STORAGE_KEYS.GLOBAL_SETTINGS);
                const storedSettings = storedSettingsJson
                    ? JSON.parse(storedSettingsJson)
                    : { maxThreads: 4, xToken: '' };

                // 更新状态
                setTags(validTags);
                setVariableValues(validValues);
                setGlobalSettings(storedSettings);
                setIsDataLoaded(true);
            } catch (error) {
                console.error('Error loading data from localStorage:', error);
                setIsDataLoaded(true);
            }
        };

        loadFromStorage();
    }, []);

    // 数据变更时保存到本地存储 - 只在数据加载完成后执行
    useEffect(() => {
        if (!isDataLoaded) return;

        try {
            localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags));
        } catch (error) {
            console.error(`Error saving tags to localStorage:`, error);
        }
    }, [tags, isDataLoaded]);

    useEffect(() => {
        if (!isDataLoaded) return;

        try {
            localStorage.setItem(STORAGE_KEYS.VARIABLE_VALUES, JSON.stringify(variableValues));
        } catch (error) {
            console.error(`Error saving variable values to localStorage:`, error);
        }
    }, [variableValues, isDataLoaded]);

    useEffect(() => {
        if (!isDataLoaded) return;

        try {
            localStorage.setItem(STORAGE_KEYS.GLOBAL_SETTINGS, JSON.stringify(globalSettings));
        } catch (error) {
            console.error(`Error saving global settings to localStorage:`, error);
        }
    }, [globalSettings, isDataLoaded]);

    // 监听角色选择事件
    useEffect(() => {
        const handleCharacterSelect = (event: CustomEvent) => {
            const { valueId, characterInfo } = event.detail;
            // 调用updateVariableValue更新角色信息
            setVariableValues(prevValues =>
                prevValues.map(val => {
                    if (val.id === valueId) {
                        return {
                            ...val,
                            value: characterInfo.name,
                            uuid: characterInfo.uuid,
                            avatar: characterInfo.avatar
                        };
                    }
                    return val;
                })
            );
        };

        // 监听元素选择事件
        const handleElementSelect = (event: CustomEvent) => {
            const { valueId, elementInfo } = event.detail;
            // 调用updateVariableValue更新元素信息
            setVariableValues(prevValues =>
                prevValues.map(val => {
                    if (val.id === valueId) {
                        return {
                            ...val,
                            value: elementInfo.name,
                            uuid: elementInfo.uuid,
                            avatar: elementInfo.avatar
                        };
                    }
                    return val;
                })
            );
        };

        // 添加事件监听
        document.addEventListener('character-selected', handleCharacterSelect as EventListener);
        document.addEventListener('element-selected', handleElementSelect as EventListener);

        // 组件卸载时移除监听
        return () => {
            document.removeEventListener('character-selected', handleCharacterSelect as EventListener);
            document.removeEventListener('element-selected', handleElementSelect as EventListener);
        };
    }, []);

    // 处理变量值重新排序
    const handleReorderValues = (tagId: string, newValues: VariableValue[]) => {
        setVariableValues(prev => {
            const otherValues = prev.filter(v => v.tagId !== tagId);
            return [...otherValues, ...newValues];
        });
    };

    // 开始编辑标签值
    const startEditTag = (tag: Tag) => {
        setEditingTag(tag);
        onEditingTagModalOpen(); // 使用新的编辑标签模态框状态
    };

    // 保存编辑后的标签值
    const saveEditTag = (updatedTag: Tag) => {
        if (!updatedTag) return;

        // 获取标签原始状态
        const originalTag = tags.find(tag => tag.id === updatedTag.id);
        if (!originalTag) return;

        // 检查变量模式下的变量名
        if (updatedTag.isVariable && updatedTag.type === "prompt") {
            if (!updatedTag.name?.trim()) {
                alertService.error("变量名不能为空", "请输入变量名");
                return;
            }

            // 检查变量名长度
            if (!isVariableNameLengthValid(updatedTag.name.trim())) {
                alertService.error("变量名不能超过12个字符", "请缩短变量名长度");
                return;
            }

            if (!isVariableNameUnique(updatedTag.name.trim(),
                tags.filter(t => t.id !== updatedTag.id))) {
                alertService.error("变量名已存在", `变量名 "${updatedTag.name}" 已存在，请使用不同的名称`);
                return;
            }

            const reservedNames = Object.values(RESERVED_VARIABLE_NAMES);
            if (reservedNames.includes(updatedTag.name.trim())) {
                alertService.error("变量名是预留名称", `变量名 "${updatedTag.name}" 是预留名称，请使用其他名称`);
                return;
            }
        }

        // 检查是否从非变量变为变量
        if (!originalTag.isVariable && updatedTag.isVariable) {
            // 为变量标签生成渐变色
            const gradientColors = getRandomGradientColors();

            updatedTag = {
                ...updatedTag,
                useGradient: true,
                color: gradientColors.from,
                gradientToColor: gradientColors.to
            };

            // 创建变量值
            const newVariableValue: VariableValue = {
                id: Date.now().toString(),
                tagId: updatedTag.id,
                value: updatedTag.value,
                // 角色标签不能设为变量，所以这里不需要特殊处理
            };

            if (updatedTag.type === "polish") {
                const trueValue: VariableValue = {
                    id: Date.now().toString() + '-true',
                    tagId: updatedTag.id,
                    value: "true"
                };
                const falseValue: VariableValue = {
                    id: Date.now().toString() + '-false',
                    tagId: updatedTag.id,
                    value: "false"
                };

                setVariableValues(prev => [...prev, trueValue, falseValue]);
            } else {
                setVariableValues(prev => [...prev, newVariableValue]);
            }
        }
        // 检查是否从变量变为非变量
        else if (originalTag.isVariable && !updatedTag.isVariable) {
            updatedTag = {
                ...updatedTag,
                useGradient: false,
                gradientToColor: undefined,
                color: originalTag.color
            };

            setVariableValues(prev => prev.filter(v => v.tagId !== updatedTag.id));
        }
        // 如果始终是变量或始终非变量，保留原始颜色属性
        else {
            updatedTag = {
                ...updatedTag,
                color: originalTag.color,
                useGradient: originalTag.useGradient,
                gradientToColor: originalTag.gradientToColor
            };
        }

        // 确保保留角色标签的特殊属性
        if (updatedTag.type === "character") {
            updatedTag = {
                ...updatedTag,
                uuid: originalTag.uuid || updatedTag.uuid, // 保留已有的 uuid，或使用更新的 uuid
                avatar: originalTag.avatar || updatedTag.avatar,
                heat_score: originalTag.heat_score || updatedTag.heat_score
            };
        }

        // 更新标签
        setTags(prevTags =>
            prevTags.map(tag =>
                tag.id === updatedTag.id ? updatedTag : tag
            )
        );

        setEditingTag(null);
        onEditingTagModalClose(); // 使用新的编辑标签模态框状态
    };

    // 生成随机颜色
    const generateRandomColors = () => {
        previewColorRef.current = getRandomColorValue();
        previewGradientColorRef.current = getRandomGradientColors();
    };

    // 添加新标签
    const handleAddTag = (data: {
        name: string;
        type: TagType;
        isVariable: boolean;
        value: string;
        uuid?: string;
        avatar?: string;
        heat_score?: number;
        weight?: number;
    }) => {
        // 对于变量标签，需要验证名称
        if (data.isVariable) {
            if (data.type !== "prompt" && data.type !== "batch" && data.type !== "character") {
                const defaultName = RESERVED_VARIABLE_NAMES[data.type as Exclude<TagType, "batch" | "character">];
                if (tags.some(tag => tag.isVariable && tag.type === data.type)) {
                    alertService.error("变量标签类型重复", `已经存在 ${data.type} 类型的变量标签`);
                    return;
                }
                data.name = defaultName;
            } else if (!data.name.trim()) {
                alertService.error("变量名缺失", "变量标签必须有名称");
                return;
            }

            // 检查变量名长度
            if (!isVariableNameLengthValid(data.name.trim())) {
                alertService.error("变量名过长", "变量名不能超过12个字符");
                return;
            }

            if (!isVariableNameUnique(data.name.trim(), tags)) {
                alertService.error("变量名已存在", `变量名 "${data.name}" 已存在，请使用不同的名称`);
                return;
            }

            if (data.type === "prompt") {
                const reservedNames = Object.values(RESERVED_VARIABLE_NAMES);
                if (reservedNames.includes(data.name.trim())) {
                    alertService.error("变量名是预留名称", `变量名 "${data.name}" 是预留名称，请使用其他名称`);
                    return;
                }
            }
        }

        // 检查除了prompt类型和character类型外的标签唯一性
        if (!isTypeUnique(data.type, tags)) {
            alertService.error("标签类型重复", `只能有一个 ${data.type} 类型的标签`);
            return;
        }

        // AddTagForm 已经验证过角色类型的情况，所以这里不需要重复验证
        // 非变量标签必须有值
        if (!data.isVariable && !data.value.trim() && data.type === "prompt") {
            data.value = getDefaultValueByType(data.type);
        }

        // 使用默认值或用户输入的值
        const value = data.value.trim() ? data.value : getDefaultValueByType(data.type);

        // 根据标签类型决定是否使用渐变色
        const useGradient = data.isVariable;
        const gradientColors = previewGradientColorRef.current;

        const newTag: Tag = {
            id: Date.now().toString(),
            type: data.type,
            isVariable: data.isVariable,
            color: previewColorRef.current,
            useGradient: useGradient,
            gradientToColor: useGradient ? gradientColors.to : undefined,
            value: value,
            name: data.isVariable ? data.name : undefined,
            // 添加角色特有属性
            uuid: data.type === "character" ? data.uuid : undefined,
            avatar: data.type === "character" ? data.avatar : undefined,
            heat_score: data.type === "character" ? data.heat_score : undefined,
            // 添加权重属性
            weight: (data.type === "character" || data.type === "element") ? data.weight : undefined
        };

        setTags(prevTags => [...prevTags, newTag]);

        // 如果是变量，添加默认值
        if (data.isVariable) {
            if (data.type === "polish") {
                const trueValue: VariableValue = {
                    id: Date.now().toString() + '-true',
                    tagId: newTag.id,
                    value: "true"
                };
                const falseValue: VariableValue = {
                    id: Date.now().toString() + '-false',
                    tagId: newTag.id,
                    value: "false"
                };

                setVariableValues(prev => [...prev, trueValue, falseValue]);
            } else {
                const defaultValue: VariableValue = {
                    id: Date.now().toString() + '-default',
                    tagId: newTag.id,
                    value: getDefaultValueByType(data.type),
                    // 角色类型添加UUID
                    ...(data.type === "character" ? {
                        uuid: data.uuid,
                        avatar: data.avatar
                    } : {}),
                    // 添加权重属性
                    ...(((data.type === "character" || data.type === "element") && data.weight !== undefined) ? { weight: data.weight } : {})
                };

                setVariableValues(prev => [...prev, defaultValue]);
            }
        }

        // 每次添加标签后生成新的随机颜色
        generateRandomColors();

        // 添加完成后隐藏表单
        setShowAddForm(false);
    };

    // 删除标签
    const removeTag = (id: string) => {
        setTags(prevTags => prevTags.filter(tag => tag.id !== id));
        setVariableValues(prevValues => prevValues.filter(value => value.tagId !== id));
    };

    // 添加变量值
    const addVariableValue = (tagId: string) => {
        const tag = tags.find(t => t.id === tagId);
        if (!tag) return;

        if (tag.type === "polish") {
            alertService.warning("变量值限制", "润色测试变量只能有true和false两个值");
            return;
        }

        const newValue: VariableValue = {
            id: Date.now().toString(),
            tagId,
            value: getDefaultValueByType(tag.type),
            // 如果是角色类型，添加角色信息
            ...(tag.type === "character" ? {
                uuid: tag.uuid,
                avatar: tag.avatar
            } : {}),
            // 为角色和元素类型设置默认权重
            ...(tag.type === "character" || tag.type === "element" ? { weight: 1 } : {})
        };

        setVariableValues(prevValues => [...prevValues, newValue]);
    };

    // 更新变量值
    const updateVariableValue = (id: string, value: string, characterInfo?: { uuid?: string, avatar?: string, weight?: number }) => {
        const variableValue = variableValues.find(v => v.id === id);

        if (variableValue) {
            const tag = tags.find(t => t.id === variableValue.tagId);
            if (tag?.type === "polish") {
                if (value !== "true" && value !== "false") {
                    alertService.warning("变量值限制", "润色变量只能为true或false");
                    return;
                }
            }
        }

        setVariableValues(prevValues =>
            prevValues.map(val => {
                if (val.id === id) {
                    // 如果提供了角色信息，同时更新角色相关属性
                    if (characterInfo) {
                        return {
                            ...val,
                            value,
                            uuid: characterInfo.uuid,
                            avatar: characterInfo.avatar,
                            // 如果提供了权重信息，更新权重
                            ...(characterInfo.weight !== undefined ? { weight: characterInfo.weight } : {})
                        };
                    }
                    // 否则只更新值
                    return { ...val, value };
                }
                return val;
            })
        );
    };

    // 删除变量值
    const removeVariableValue = (id: string) => {
        setVariableValues(prevValues => prevValues.filter(value => value.id !== id));
    };

    // 复制变量值
    const duplicateVariableValue = (id: string) => {
        const valueToDuplicate = variableValues.find(v => v.id === id);
        if (!valueToDuplicate) return;

        // 创建新的变量值，复制原有的所有属性
        const newValue: VariableValue = {
            ...valueToDuplicate,
            id: Date.now().toString() // 生成新的ID
        };

        // 将新的变量值插入到原变量值之后
        setVariableValues(prevValues => {
            const index = prevValues.findIndex(v => v.id === id);
            if (index === -1) return [...prevValues, newValue];

            const newValues = [...prevValues];
            newValues.splice(index + 1, 0, newValue);
            return newValues;
        });
    };

    // 切换标签是否为变量
    const toggleTagVariable = (tag: Tag) => {
        if (tag.type === "batch") {
            alertService.warning("类型限制", `${getTypeDisplayName(tag.type)}类型不能设为变量`);
            return;
        }

        // 如果要切换为变量
        if (!tag.isVariable) {
            // 检查是否已存在同类型的变量
            if (tag.type !== "prompt" && tag.type !== "character" && tags.some(t => t.isVariable && t.type === tag.type)) {
                alertService.error("变量标签类型重复", `已经存在 ${tag.type} 类型的变量标签`);
                return;
            }

            // 打开编辑模态窗口，显示变量设置界面
            const editTag = { ...tag, isVariable: true };

            // 为非prompt和非character类型设置默认变量名
            if (tag.type !== "prompt" && tag.type !== "character") {
                editTag.name = RESERVED_VARIABLE_NAMES[tag.type as Exclude<TagType, "batch" | "character">];
            } else {
                // prompt类型和character类型需要在编辑界面输入变量名
                editTag.name = "";
            }

            setEditingTag(editTag);
            onEditingTagModalOpen(); // 使用新的编辑标签模态框状态
        } else {
            // 从变量切换为非变量，打开编辑界面确认
            const editTag = {
                ...tag,
                isVariable: false,
                name: undefined
            };

            setEditingTag(editTag);
            onEditingTagModalOpen(); // 使用新的编辑标签模态框状态
        }
    };

    // 渲染添加按钮或表单
    const renderAddTagButton = () => {
        return (
            <AnimatePresence mode="wait">
                {showAddForm ? (
                    <AddTagForm
                        onAdd={handleAddTag}
                        onCancel={() => setShowAddForm(false)}
                    />
                ) : (
                    <motion.div
                        key="add-button"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="inline-flex"
                    >
                        <Button
                            isIconOnly
                            size="md"
                            color="primary"
                            className="rounded-full shadow-md hover:shadow-lg h-[38px] min-w-[38px] flex items-center justify-center"
                            onPress={() => {
                                generateRandomColors();
                                setShowAddForm(true);
                            }}
                        >
                            <span className="text-xl font-medium">+</span>
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    };

    // 新增一个state来跟踪活动标签的尺寸
    const [activeTagWidth, setActiveTagWidth] = useState<number | undefined>(undefined);

    // 添加一个容器引用，用于检测是否拖动超出边界
    const containerRef = useRef<HTMLDivElement>(null);

    // 添加一个引用来存储初始元素位置
    const initialPositionRef = useRef<{ top: number, left: number, bottom: number } | null>(null);

    // 末尾占位元素ID
    const END_PLACEHOLDER_ID = "end-placeholder";

    // 修改handleDragStart函数，记录元素初始位置
    const handleDragStart = (event: DragStartEvent) => {
        const id = event.active.id as string;
        setActiveId(id);

        // 使用event中的数据获取宽度
        const tagWidth = event.active.data.current?.width;
        if (tagWidth) {
            setActiveTagWidth(tagWidth);
        } else {
            // 如果没有数据，使用DOM查询方法
            const element = document.querySelector(`[data-tag-id="${id}"]`);
            if (element) {
                const rect = element.getBoundingClientRect();
                setActiveTagWidth(rect.width);

                // 记录元素初始位置
                initialPositionRef.current = {
                    top: rect.top,
                    left: rect.left,
                    bottom: rect.bottom
                };
            }
        }
    };

    // 添加拖动过程中的处理函数
    const handleDragMove = (_event: DragMoveEvent) => {
        // 如果没有容器引用、活动拖拽ID或初始位置，直接返回
        if (!containerRef.current || !activeId || !initialPositionRef.current) return;

        // 获取容器的边界信息
        const containerRect = containerRef.current.getBoundingClientRect();

        // 获取元素当前位置
        const activeElement = document.querySelector(`[data-tag-id="${activeId}"]`);
        if (!activeElement) return;

        // 计算元素当前的位置
        const elementRect = activeElement.getBoundingClientRect();

        // 计算垂直方向的移动距离
        const verticalMovement = elementRect.bottom - initialPositionRef.current.bottom;

        // 只有当向下移动且超出容器底部时，才标记为移动到末尾
        const isMovingDownOutOfBounds =
            verticalMovement > 0 && // 向下移动
            elementRect.bottom > containerRect.bottom + 20; // 超出容器底部

        // 如果向下移动且超出下边界，设置末尾移动标记
        if (isMovingDownOutOfBounds) {
            // 在这里不直接修改状态，而是通过DragOverlay的样式提示将要移动到末尾
            const dragOverlay = document.querySelector('[data-dnd-overlay]');
            if (dragOverlay) {
                // 给拖拽覆盖层添加一个"将移动到末尾"的提示样式
                dragOverlay.classList.add('moving-to-end');
            }
        } else {
            // 移除提示样式
            const dragOverlay = document.querySelector('[data-dnd-overlay]');
            if (dragOverlay) {
                dragOverlay.classList.remove('moving-to-end');
            }
        }
    };

    // 处理拖拽结束
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        // 清除状态
        setActiveId(null);
        setActiveTagWidth(undefined);
        initialPositionRef.current = null; // 清除初始位置

        // 获取当前指针位置
        const dragOverlay = document.querySelector('[data-dnd-overlay]');
        const isMovingToEnd = dragOverlay?.classList.contains('moving-to-end');

        // 移除样式
        if (dragOverlay) {
            dragOverlay.classList.remove('moving-to-end');
        }

        // 如果没有覆盖的元素，或者拖拽超出了下边界，移动到列表末尾
        if (!over || isMovingToEnd) {
            // 拖动到末尾，将标签移动到数组末尾
            setTags((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newItems = [...items];
                // 移除该项
                const [movedItem] = newItems.splice(oldIndex, 1);
                // 添加到末尾
                newItems.push(movedItem);
                return newItems;
            });
            return;
        }

        // 处理拖动到末尾占位符的情况
        if (over.id === END_PLACEHOLDER_ID) {
            // 拖动到末尾，将标签移动到数组末尾
            setTags((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newItems = [...items];
                // 移除该项
                const [movedItem] = newItems.splice(oldIndex, 1);
                // 添加到末尾
                newItems.push(movedItem);
                return newItems;
            });
            return;
        }

        // 正常的排序逻辑
        if (active.id !== over.id) {
            setTags((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // 自定义拖拽动画，禁用拉伸效果并保持原始样式
    const customDropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '1',
                },
                dragOverlay: {
                    opacity: '1',
                }
            }
        })
    };

    // 处理配置下载
    const handleDownloadConfig = () => {
        try {
            // 创建配置对象
            const config = {
                tags,
                variableValues,
                globalSettings,
                exportDate: new Date().toISOString(),
                version: "1.0"
            };

            // 转换为JSON字符串
            const configJson = JSON.stringify(config, null, 2);

            // 创建 Blob 对象
            const blob = new Blob([configJson], { type: 'application/json' });

            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tags-config-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();

            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);

            // 显示成功提示
            alertService.success('配置已下载', '标签和变量配置已成功下载到本地文件');
        } catch (error) {
            console.error('下载配置失败:', error);
            alertService.error('下载失败', '配置文件下载过程中出现错误');
        }
    };

    // 处理配置上传
    const handleUploadConfig = () => {
        try {
            // 创建一个隐藏的文件输入元素
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.style.display = 'none';

            // 监听文件选择事件
            input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const content = event.target?.result as string;
                        const config = JSON.parse(content);

                        // 验证配置文件
                        if (!config.tags || !Array.isArray(config.tags) || !config.variableValues || !Array.isArray(config.variableValues)) {
                            throw new Error('无效的配置文件格式');
                        }

                        // 应用配置
                        setTags(validateTags(config.tags));
                        setVariableValues(validateVariableValues(config.variableValues, validateTags(config.tags)));

                        // 如果有全局设置，也应用它
                        if (config.globalSettings) {
                            setGlobalSettings(prev => ({
                                maxThreads: config.globalSettings.maxThreads || prev.maxThreads,
                                xToken: config.globalSettings.xToken || prev.xToken
                            }));
                        }

                        // 显示成功提示
                        alertService.success('配置已加载', `成功加载了 ${config.tags.length} 个标签和 ${config.variableValues.length} 个变量值`);
                    } catch (error) {
                        console.error('解析配置文件失败:', error);
                        alertService.error('加载失败', '配置文件格式无效或损坏');
                    }
                };

                reader.onerror = () => {
                    alertService.error('读取失败', '读取文件时出现错误');
                };

                reader.readAsText(file);

                // 清理输入元素
                document.body.removeChild(input);
            };

            // 添加到文档并触发点击
            document.body.appendChild(input);
            input.click();
        } catch (error) {
            console.error('上传配置失败:', error);
            alertService.error('上传失败', '配置文件上传过程中出现错误');
        }
    };

    // 处理提交操作
    const handleSubmit = () => {
        // 检查登录状态
        if (!user) {
            // 如果未登录，打开提示模态框
            onLoginTipOpen();
            return;
        }

        // 计算将生成的图片总数
        const calculatedImages = calculateTotalImages(tags, variableValues);
        setTotalImages(calculatedImages);

        // 如果超过1000张图片，需要二次确认
        if (calculatedImages > 1000) {
            onConfirmOpen();
        } else if (calculatedImages > 0) {
            onConfirmOpen();
        } else {
            alertService.warning("提交失败", "无法计算生成图片数量，请检查参数设置");
        }
    };

    // 执行提交流程
    const proceedWithSubmission = () => {
        // 导入提交工具函数
        const { completeSubmitProcess } = require("./submitHelpers");

        // 直接使用提交流程工具函数，所有验证逻辑都移动到了submitHelpers.ts中
        completeSubmitProcess(tags, variableValues)
            .then((result: any) => {
                if (result) {
                    console.log("提交成功:", result);
                    // 成功后的处理，例如清空表单或跳转页面
                }
            });
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
            {/* 全局设置按钮 */}
            <div className="flex justify-end">
                <Button
                    color="primary"
                    variant="solid"
                    // size="sm"
                    onPress={onSettingsOpen}
                >
                    ⚙️ 全局设置
                </Button>
            </div>

            {/* 标签区域 */}
            <motion.div
                className="p-5 min-h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                ref={containerRef}
            >
                <DndContext
                    id="tags-drag-context"
                    sensors={sensors}
                    collisionDetection={(args) => {
                        const intersections = rectIntersection(args);
                        if (intersections && intersections.length > 0) {
                            return intersections;
                        }
                        return pointerWithin(args);
                    }}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                    measuring={{
                        droppable: {
                            strategy: MeasuringStrategy.Always
                        }
                    }}
                >
                    <div className="flex flex-wrap gap-3 min-h-[2rem]">
                        {tags.length > 0 ? (
                            <SortableContext
                                items={[...tags.map(tag => tag.id), END_PLACEHOLDER_ID]}
                                strategy={rectSortingStrategy}
                            >
                                <div className="flex flex-wrap gap-3 w-full">
                                    {tags.map((tag) => (
                                        <SortableTagItem
                                            key={tag.id}
                                            tag={tag}
                                            onEdit={() => startEditTag(tag)}
                                            onRemove={() => removeTag(tag.id)}
                                            onToggleVariable={() => toggleTagVariable(tag)}
                                        />
                                    ))}

                                    {/* 将加号按钮作为标签流的一部分紧跟在最后一个标签后面 */}
                                    {!activeId && (
                                        <div className="inline-flex">
                                            {renderAddTagButton()}
                                        </div>
                                    )}

                                    {/* 末尾空白占位元素，提供末尾拖放区域，放在按钮后面 */}
                                    <div
                                        id={END_PLACEHOLDER_ID}
                                        className="h-10 w-10 opacity-0"
                                        data-end-placeholder="true"
                                        style={{ minWidth: "40px" }}
                                    />
                                </div>
                            </SortableContext>
                        ) : (
                            /* 当没有标签时，仍然显示加号按钮 */
                            !activeId && renderAddTagButton()
                        )}
                    </div>

                    {/* 拖拽覆盖层 - 显示正在拖拽的项目 */}
                    <DragOverlay
                        adjustScale={false}
                        dropAnimation={customDropAnimation}
                    >
                        {activeTag ? (
                            <div
                                className="shadow-lg inline-block"
                                style={{
                                    whiteSpace: "nowrap",
                                    ...(activeTagWidth ? { width: `${activeTagWidth}px` } : {})
                                }}
                            >
                                <ColorButton
                                    hexColor={activeTag.color}
                                    useGradient={activeTag.useGradient}
                                    gradientToColor={activeTag.gradientToColor}
                                    variant={activeTag.isVariable ? "shadow" : "solid"}
                                    className="whitespace-nowrap"
                                >
                                    {(() => {
                                        let text = "";
                                        if (activeTag.isVariable) {
                                            text = `${activeTag.name || ''} [变量]`;
                                        } else if (activeTag.type === "prompt") {
                                            text = truncateText(activeTag.value);
                                        } else if (activeTag.type === "character") {
                                            text = truncateText(activeTag.value);
                                        } else {
                                            text = `${getTypeDisplayName(activeTag.type)}: ${truncateText(activeTag.value)}`;
                                        }

                                        // 如果有权重，显示权重信息
                                        if ((activeTag.type === "character" || activeTag.type === "element") && activeTag.weight !== undefined) {
                                            text += ` [权重: ${activeTag.weight}]`;
                                        }

                                        return text;
                                    })()}
                                </ColorButton>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </motion.div>

            {/* 操作按钮区域 */}
            <div className="flex justify-between items-center gap-4">
                <div className="flex gap-2">
                    <Button
                        color="primary"
                        variant="flat"
                        onPress={() => {
                            // 创建基础配置标签
                            const baseConfig: Tag[] = [
                                {
                                    id: 'prompt-' + Date.now(),
                                    type: 'prompt',
                                    isVariable: false,
                                    value: '1girl',
                                    color: getRandomColorValue(),
                                    useGradient: false
                                },
                                {
                                    id: 'ratio-' + Date.now(),
                                    type: 'ratio',
                                    isVariable: false,
                                    value: '3:5',
                                    color: getRandomColorValue(),
                                    useGradient: false
                                },
                                {
                                    id: 'batch-' + Date.now(),
                                    type: 'batch',
                                    isVariable: false,
                                    value: '1',
                                    color: getRandomColorValue(),
                                    useGradient: false
                                },
                                {
                                    id: 'seed-' + Date.now(),
                                    type: 'seed',
                                    isVariable: false,
                                    value: '0',
                                    color: getRandomColorValue(),
                                    useGradient: false
                                },
                                {
                                    id: 'polish-' + Date.now(),
                                    type: 'polish',
                                    isVariable: false,
                                    value: 'false',
                                    color: getRandomColorValue(),
                                    useGradient: false
                                }
                            ];
                            setTags(baseConfig);
                            setVariableValues([]); // 清空变量值
                        }}
                    >
                        基础配置
                    </Button>
                    <Button
                        color="secondary"
                        variant="flat"
                        onPress={handleDownloadConfig}
                    >
                        下载配置
                    </Button>
                    <Button
                        color="secondary"
                        variant="flat"
                        onPress={handleUploadConfig}
                    >
                        上传配置
                    </Button>
                    <Button
                        color="danger"
                        variant="flat"
                        onPress={() => {
                            setTags([]);
                            setVariableValues([]);
                            // 同时清除本地存储（只在客户端执行）
                            if (typeof window !== 'undefined') {
                                try {
                                    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify([]));
                                    localStorage.setItem(STORAGE_KEYS.VARIABLE_VALUES, JSON.stringify([]));
                                } catch (error) {
                                    console.error('Error clearing localStorage:', error);
                                }
                            }
                        }}
                    >
                        清空
                    </Button>
                </div>
                <Button
                    color="success"
                    variant="shadow"
                    onPress={handleSubmit}
                >
                    提交
                </Button>
            </div>

            {/* 变量值区域 */}
            <VariableValueList
                tags={tags}
                variableValues={variableValues}
                onAddValue={addVariableValue}
                onUpdateValue={updateVariableValue}
                onRemoveValue={removeVariableValue}
                onDuplicateValue={duplicateVariableValue}
                onRemoveTag={removeTag}
                onReorderValues={handleReorderValues}
            />

            {/* 编辑标签模态窗口 */}
            <EditTagModal
                isOpen={isEditingTagModalOpen} // 使用新的编辑标签模态框状态
                onClose={() => {
                    setEditingTag(null);
                    onEditingTagModalClose();
                }}
                onSave={saveEditTag}
                tag={editingTag}
                tags={tags}
            />

            {/* 全局设置模态框 */}
            <Modal isOpen={isSettingsOpen} onOpenChange={onSettingsClose}>
                <ModalContent>
                    {(onModalClose: () => void) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                全局设置
                            </ModalHeader>
                            <ModalBody>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            最大线程数
                                        </label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={32}
                                            value={globalSettings.maxThreads.toString()}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                const value = parseInt(e.target.value);
                                                if (!isNaN(value) && value >= 1 && value <= 32) {
                                                    setGlobalSettings(prev => ({
                                                        ...prev,
                                                        maxThreads: value
                                                    }));
                                                }
                                            }}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            X-Token
                                        </label>
                                        <Input
                                            type="password"
                                            value={globalSettings.xToken}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                setGlobalSettings(prev => ({
                                                    ...prev,
                                                    xToken: e.target.value
                                                }));
                                            }}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onModalClose}>
                                    取消
                                </Button>
                                <Button color="primary" onPress={onModalClose}>
                                    确定
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* 登录提示模态框 */}
            <Modal isOpen={isLoginTipOpen} onOpenChange={() => onLoginTipClose()}>
                <ModalContent>
                    {(onModalClose: () => void) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                需要登录
                            </ModalHeader>
                            <ModalBody>
                                <div className="space-y-4">
                                    <p className="text-center">
                                        提交操作需要登录账号。请先登录后再进行提交。
                                    </p>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onModalClose}>
                                    取消
                                </Button>
                                <Button
                                    color="primary"
                                    onPress={() => {
                                        onModalClose();
                                        router.push("/login");
                                    }}
                                >
                                    去登录
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* 提交确认模态框 */}
            <Modal isOpen={isConfirmOpen} onOpenChange={() => onConfirmClose()}>
                <ModalContent>
                    {(onModalClose: () => void) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                确认提交
                            </ModalHeader>
                            <ModalBody>
                                <div className="space-y-4">
                                    <p className="text-center">
                                        本次任务将生成 <span className="font-bold">{totalImages}</span> 张图片，是否继续？
                                    </p>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onModalClose}>
                                    取消
                                </Button>
                                <Button
                                    color="primary"
                                    onPress={() => {
                                        onModalClose();
                                        if (totalImages > 1000) {
                                            onSecondConfirmOpen();
                                        } else {
                                            proceedWithSubmission();
                                        }
                                    }}
                                >
                                    确认
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* 二次确认模态框（大量图片） */}
            <Modal isOpen={isSecondConfirmOpen} onOpenChange={() => onSecondConfirmClose()}>
                <ModalContent>
                    {(onModalClose: () => void) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                警告：大量图片生成
                            </ModalHeader>
                            <ModalBody>
                                <div className="space-y-4">
                                    <p className="text-center text-danger">
                                        警告：生成 <span className="font-bold">{totalImages}</span> 张图片可能需要较长时间，并消耗大量资源。
                                    </p>
                                    <p className="text-center">
                                        是否确认继续？
                                    </p>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onModalClose}>
                                    取消
                                </Button>
                                <Button
                                    color="danger"
                                    onPress={() => {
                                        onModalClose();
                                        proceedWithSubmission();
                                    }}
                                >
                                    确认继续
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};

export default DroppableTagsV2;