"use client";

import React from "react";
import { Button } from "@heroui/react";
import { CloseIcon } from "@/components/icons";

export interface VTokenProps {
    name: string;
    onClose?: () => void;
    onClick?: () => void;
    avatar?: string;
    type: "character" | "element";
    customIcon?: React.ReactNode;
    color?: "primary" | "secondary" | "danger" | "warning" | "success" | "default";
    isDisabled?: boolean;
}

/**
 * 变量令牌组件 (VToken)
 * 统一角色和元素的显示样式，支持自定义图标和样式
 */
const VToken: React.FC<VTokenProps> = ({
    name,
    onClose,
    onClick,
    avatar,
    type,
    customIcon,
    color = "default",
    isDisabled = true // 默认禁用点击功能
}) => {
    // 获取占位图，根据类型显示不同的文本
    const getPlaceholderSvg = () => {
        const text = type === "character" ? "角色" : "元素";
        return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%23dddddd"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="12" fill="%23888888" text-anchor="middle" dominant-baseline="middle"%3E${text}%3C/text%3E%3C/svg%3E`;
    };

    return (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-default-100 w-full">
            {/* 图标/头像部分 */}
            {avatar ? (
                <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full">
                    <img
                        src={avatar}
                        alt={name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = getPlaceholderSvg();
                        }}
                    />
                </div>
            ) : customIcon ? (
                <div className="h-6 w-6 flex items-center justify-center">
                    {customIcon}
                </div>
            ) : (
                <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs">{type === "character" ? "角" : "元"}</span>
                </div>
            )}

            {/* 名称部分 - 占据剩余空间并左对齐 */}
            <div className="flex-grow text-left truncate">
                {name}
            </div>

            {/* 关闭按钮（如果需要） */}
            {onClose && (
                <div
                    className="cursor-pointer flex-shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                >
                    <CloseIcon size={14} />
                </div>
            )}
        </div>
    );
};

export default VToken;