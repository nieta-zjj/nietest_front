"use client";

import React, { useState, useMemo } from "react";
import { motion, Reorder } from "framer-motion";
import { Button } from "@heroui/react";
import ColorButton from "../ColorButton";
import { Tag } from "@/types/tags";
import { getTagDisplayText } from "@/components/tags/tagUtils";
import { CloseIcon } from "@/components/icons";

// 动画配置常量
const ANIMATION_CONFIG = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
        bounce: 0.2
    },
    dragTransition: {
        bounceStiffness: 500,
        bounceDamping: 50
    },
    whileDrag: {
        zIndex: 10,
        scale: 1.05,
        boxShadow: "0px 5px 10px rgba(0,0,0,0.1)",
        opacity: 1
    }
};

interface TagItemProps {
    tag: Tag;
    onEdit: () => void;
    onRemove: () => void;
    onToggleVariable: () => void;
    value: Tag; // 用于Reorder.Item的value属性
}

/**
 * 标签项组件 - 使用 Framer Motion 的动画效果和拖拽功能
 * 支持拖拽排序、点击编辑和删除操作
 */
const TagItem: React.FC<TagItemProps> = ({ tag, onEdit, onRemove, onToggleVariable, value }) => {
    // 点击与拖拽区分状态
    const [isDragging, setIsDragging] = useState(false);

    // 处理点击事件，只有在没有拖拽时才触发编辑
    const handleClick = () => {
        if (!isDragging) {
            onEdit();
        }
    };

    // 使用 useMemo 缓存按钮样式计算结果
    const buttonVariant = useMemo(() => {
        // 变量标签总是使用shadow样式
        if (tag.isVariable) {
            return "shadow";
        }
        // 所有非变量标签使用solid样式
        return "solid";
    }, [tag.isVariable]);

    // 使用 useMemo 缓存显示文本，避免重复计算
    const displayText = useMemo(() => getTagDisplayText(tag), [tag]);

    return (
        <Reorder.Item
            value={value}
            dragListener={true}
            className="relative hide-drag-indicator"
            initial={ANIMATION_CONFIG.initial}
            animate={ANIMATION_CONFIG.animate}
            exit={ANIMATION_CONFIG.exit}
            transition={ANIMATION_CONFIG.transition}
            layoutId={tag.id}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
            whileDrag={ANIMATION_CONFIG.whileDrag}
            dragSnapToOrigin={false}
            dragTransition={ANIMATION_CONFIG.dragTransition}
        >
            <div className="relative group">
                <ColorButton
                    hexColor={tag.color}
                    useGradient={tag.useGradient}
                    gradientToColor={tag.gradientToColor}
                    variant={buttonVariant}
                    className="group-hover:scale-105 transition-transform cursor-move"
                    onClick={handleClick}
                >
                    {displayText}
                </ColorButton>

                {/* 删除按钮 - 悬停时显示 */}
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
                        className="rounded-full"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                    >
                        <CloseIcon size={12} />
                    </Button>
                </motion.div>
            </div>
        </Reorder.Item>
    );
};

// 使用 React.memo 优化组件，避免不必要的重渲染
export default React.memo(TagItem);