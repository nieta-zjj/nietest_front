"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/react";
import { Tag, VariableValue } from "@/types/tags";
import ColorButton from "../ColorButton";
import { getTypeDisplayName } from "@/components/tags/tagUtils";
import VariableValueInput from "./VariableValueInput";
import { CloseIcon, CopyIcon } from "@heroui/shared-icons";

// dnd-kit 相关导入
import {
    DndContext,
    closestCenter,
    DragStartEvent,
    DragEndEvent,
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor,
    KeyboardSensor
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface VariableValueListProps {
    tags: Tag[];
    variableValues: VariableValue[];
    onAddValue: (tagId: string) => void;
    onUpdateValue: (id: string, value: string, characterInfo?: { uuid?: string, avatar?: string, weight?: number }) => void;
    onRemoveValue: (id: string) => void;
    onDuplicateValue: (id: string) => void;
    onRemoveTag: (id: string) => void;
    onReorderValues?: (tagId: string, newValues: VariableValue[]) => void;
}

/**
 * 变量值列表组件
 */
const VariableValueList: React.FC<VariableValueListProps> = ({
    tags,
    variableValues,
    onAddValue,
    onUpdateValue,
    onRemoveValue,
    onDuplicateValue,
    onRemoveTag,
    onReorderValues = (tagId, newValues) => { } // 默认空实现
}) => {
    // 过滤出变量标签
    const variableTags = tags.filter(tag => tag.isVariable);

    // 定义拖拽状态
    const [activeId, setActiveId] = useState<string | null>(null);

    // 配置传感器
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 4, // 4px 的移动就触发拖拽
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250, // 触摸并保持 250ms 开始拖拽
                tolerance: 5, // 允许 5px 的移动容差
            },
        }),
        useSensor(KeyboardSensor)
    );

    if (variableTags.length === 0) {
        return null;
    }

    // 处理拖拽开始
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    // 处理拖拽结束
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        // 清除活动状态
        setActiveId(null);

        // 如果没有目标或者没有移动，则直接返回
        if (!over || active.id === over.id) return;

        // 从带前缀的ID中提取原始ID
        const getOriginalId = (prefixedId: string) => {
            return prefixedId.replace('var-value-', '');
        };

        const activeId = getOriginalId(active.id as string);
        const overId = getOriginalId(over.id as string);

        // 找到变量值所属的标签
        const draggedValue = variableValues.find(v => v.id === activeId);
        if (!draggedValue) return;

        // 获取当前标签的所有变量值
        const tagValues = variableValues.filter(v => v.tagId === draggedValue.tagId);

        // 计算旧索引和新索引
        const oldIndex = tagValues.findIndex(v => v.id === activeId);
        const newIndex = tagValues.findIndex(v => v.id === overId);

        // 使用 arrayMove 创建新的排序数组
        const newOrder = arrayMove(tagValues, oldIndex, newIndex);

        // 触发重新排序回调
        onReorderValues(draggedValue.tagId, newOrder);
    };

    // 处理删除变量值
    const handleRemoveValue = (valueId: string) => {
        // 先找到要删除的变量值
        const valueToRemove = variableValues.find(v => v.id === valueId);
        if (!valueToRemove) return;

        // 计算删除后该标签还剩多少变量值
        const remainingValues = variableValues.filter(v =>
            v.tagId === valueToRemove.tagId && v.id !== valueId
        );

        // 如果删除后没有任何变量值，则删除整个标签
        if (remainingValues.length === 0) {
            onRemoveTag(valueToRemove.tagId);
        } else {
            // 否则只删除变量值
            onRemoveValue(valueId);
        }
    };

    return (
        <motion.div
            className="mt-4 p-4 border rounded-lg bg-background/90 shadow-sm dark:border-default-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <h3 className="text-lg font-medium mb-4">变量值</h3>
            <div className="space-y-6">
                {variableTags.map(tag => {
                    // 获取当前标签的所有变量值
                    const tagValues = variableValues.filter(value => value.tagId === tag.id);
                    return (
                        <motion.div
                            key={`var-${tag.id}`}
                            className="border-b pb-4 dark:border-default-200"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                    <ColorButton
                                        hexColor={tag.color}
                                        useGradient={tag.useGradient}
                                        gradientToColor={tag.gradientToColor}
                                        variant="shadow"
                                        size="sm"
                                        className="mr-2"
                                    >
                                        {tag.name || ''}
                                    </ColorButton>
                                    <span className="text-xs text-default-500">({getTypeDisplayName(tag.type)})</span>
                                </div>
                                <Button
                                    isIconOnly
                                    size="sm"
                                    color="danger"
                                    variant="light"
                                    className="rounded-full"
                                    onPress={() => onRemoveTag(tag.id)}
                                >
                                    <CloseIcon size={12} />
                                </Button>
                            </div>

                            {/* 变量值列表 - 添加拖拽排序功能 */}
                            <div className="space-y-2 ml-2">
                                {/* 只有当标签类型不是polish（润色）且有多个值时才允许排序 */}
                                {tag.type !== 'polish' && tagValues.length > 1 ? (
                                    <DndContext
                                        id={`variable-values-${tag.id}`}
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={tagValues.map(v => `var-value-${v.id}`)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <AnimatePresence>
                                                {tagValues.map((value) => (
                                                    <SortableVariableValueItem
                                                        key={value.id}
                                                        value={value}
                                                        tag={tag}
                                                        onUpdateValue={onUpdateValue}
                                                        onRemoveValue={handleRemoveValue}
                                                        onDuplicateValue={onDuplicateValue}
                                                        onAddValue={onAddValue}
                                                        totalValues={tagValues.length}
                                                    />
                                                ))}
                                            </AnimatePresence>
                                        </SortableContext>
                                    </DndContext>
                                ) : (
                                    <AnimatePresence>
                                        {tagValues.map((value) => (
                                            <motion.div
                                                key={value.id}
                                                className="relative"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.2 }}
                                                layout
                                            >
                                                <div className="flex items-center gap-2 p-2 border rounded-md bg-default-50 hover:bg-default-100 dark:border-default-200 transition-colors min-h-[60px]">
                                                    <div className="flex-grow">
                                                        <VariableValueInput
                                                            value={value}
                                                            tag={tag}
                                                            onChange={(newValue) => onUpdateValue(value.id, newValue)}
                                                            onWeightChange={(weight) => {
                                                                if (tag.type === "character" || tag.type === "element") {
                                                                    onUpdateValue(value.id, value.value, { weight });
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    {/* 操作按钮放在右侧 */}
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        {/* 只有在非润色测试类型或者变量值数量大于最小要求时才显示删除按钮 */}
                                                        {(tag.type !== 'polish' || tagValues.length > 2) && (
                                                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                                                <Button
                                                                    size="sm"
                                                                    isIconOnly
                                                                    color="danger"
                                                                    variant="light"
                                                                    className="min-w-[28px] h-[28px]"
                                                                    onPress={() => handleRemoveValue(value.id)}
                                                                >
                                                                    <CloseIcon size={12} />
                                                                </Button>
                                                            </motion.div>
                                                        )}
                                                        {/* 复制按钮 */}
                                                        {tag.type !== 'polish' && (
                                                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                                                <Button
                                                                    size="sm"
                                                                    isIconOnly
                                                                    color="secondary"
                                                                    variant="light"
                                                                    className="min-w-[28px] h-[28px]"
                                                                    onPress={() => onDuplicateValue(value.id)}
                                                                    title="复制"
                                                                >
                                                                    <CopyIcon size={12} />
                                                                </Button>
                                                            </motion.div>
                                                        )}

                                                        {/* 在每行末尾增加添加按钮，点击在此行后添加新行，但润色测试类型不显示 */}
                                                        {tag.type !== 'polish' && (
                                                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                                                <Button
                                                                    size="sm"
                                                                    isIconOnly
                                                                    color="primary"
                                                                    variant="light"
                                                                    className="min-w-[28px] h-[28px]"
                                                                    onPress={() => onAddValue(tag.id)}
                                                                    title="添加"
                                                                >
                                                                    +
                                                                </Button>
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
};

/**
 * 可排序的变量值项组件
 */
interface VariableValueItemProps {
    value: VariableValue;
    tag: Tag;
    onUpdateValue: (id: string, value: string, characterInfo?: { uuid?: string, avatar?: string, weight?: number }) => void;
    onRemoveValue: (id: string) => void;
    onDuplicateValue: (id: string) => void;
    onAddValue: (tagId: string) => void;
    totalValues: number;
}

const SortableVariableValueItem: React.FC<VariableValueItemProps> = ({
    value,
    tag,
    onUpdateValue,
    onRemoveValue,
    onDuplicateValue,
    onAddValue,
    totalValues
}) => {
    const [isInputFocused, setIsInputFocused] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: `var-value-${value.id}`,
        disabled: isInputFocused
    });

    const handleFocus = () => setIsInputFocused(true);
    const handleBlur = () => setIsInputFocused(false);

    // 增强拖拽时的视觉效果
    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 0.2s ease-in-out',
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 999 : 1,
        position: 'relative' as const,
        boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.15)' : 'none',
        backgroundColor: isDragging ? 'var(--default-100)' : undefined,
        scale: isDragging ? '1.02' : '1',
    };

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="relative"
            {...attributes}
        >
            <div
                className={`flex items-center gap-2 p-2 border rounded-md bg-default-50 hover:bg-default-100 dark:border-default-200 transition-all min-h-[60px] ${!isInputFocused ? 'cursor-move hover:border-primary-500' : ''}`}
                {...(!isInputFocused ? listeners : {})}
            >
                <div className="flex-grow">
                    <VariableValueInput
                        value={value}
                        tag={tag}
                        onChange={(newValue) => onUpdateValue(value.id, newValue)}
                        onWeightChange={(weight) => {
                            if (tag.type === "character" || tag.type === "element") {
                                onUpdateValue(value.id, value.value, { weight });
                            }
                        }}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                </div>
                {/* 操作按钮放在右侧 */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* 只有变量值数量大于最小要求时才显示删除按钮 */}
                    {totalValues > 1 && (
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                                size="sm"
                                isIconOnly
                                color="danger"
                                variant="light"
                                className="min-w-[28px] h-[28px]"
                                onPress={() => onRemoveValue(value.id)}
                            >
                                <CloseIcon size={12} />
                            </Button>
                        </motion.div>
                    )}
                    {/* 复制按钮 */}
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                            size="sm"
                            isIconOnly
                            color="secondary"
                            variant="light"
                            className="min-w-[28px] h-[28px]"
                            onPress={() => onDuplicateValue(value.id)}
                            title="复制"
                        >
                            <CopyIcon size={12} />
                        </Button>
                    </motion.div>

                    {/* 添加按钮 */}
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                            size="sm"
                            isIconOnly
                            color="primary"
                            variant="light"
                            className="min-w-[28px] h-[28px]"
                            onPress={() => onAddValue(tag.id)}
                            title="添加"
                        >
                            +
                        </Button>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export default VariableValueList;