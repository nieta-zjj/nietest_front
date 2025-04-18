"use client";

// 已经完成，如无必要无需更改

import React, { useState, useEffect, KeyboardEvent, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
    Button,
    Select,
    SelectItem,
    Input,
    Switch,
    Alert,
    Slider
} from "@heroui/react";

import { TagType } from "@/types/tags";
import { getDefaultValueByType, RESERVED_VARIABLE_NAMES, isVariableNameLengthValid, TAG_TYPE_OPTIONS } from "@/components/tags/tagUtils";
import { TagValueInput } from "@/components/tags/TagValueInput";
import { CloseIcon } from "@heroui/shared-icons";

interface AddTagFormProps {
    onAdd: (data: {
        name: string;
        type: TagType;
        isVariable: boolean;
        value: string;
        uuid?: string;
        avatar?: string;
        heat_score?: number;
        weight?: number;
    }) => void;
    onCancel: () => void;
}

/**
 * 添加标签表单组件
 */
const AddTagForm: React.FC<AddTagFormProps> = ({ onAdd, onCancel }) => {
    const [name, setName] = useState("");
    const [type, setType] = useState<TagType>("prompt");
    const [isVariable, setIsVariable] = useState(false);
    const [value, setValue] = useState("");
    const [weight, setWeight] = useState<number>(1); // 默认权重为1
    const [formError, setFormError] = useState<string | null>(null);
    const variableNameInputRef = useRef<HTMLInputElement>(null);

    // 角色信息
    const [characterInfo, setCharacterInfo] = useState<{
        uuid?: string;
        avatar_img?: string;
        heat_score?: number;
    }>({});

    // 当类型改变时，重置值为该类型的默认值
    useEffect(() => {
        setValue(getDefaultValueByType(type));

        // 如果类型更改，重置角色信息和表单错误
        if (type !== "character") {
            setCharacterInfo({});
        }

        // 只有角色和元素类型需要权重
        if (type !== "character" && type !== "element") {
            setWeight(undefined);
        }

        setFormError(null);
    }, [type]);

    // 当类型或变量状态改变时，处理变量名
    useEffect(() => {
        // 如果选择了非prompt类型，且是变量，设置默认变量名
        if (type !== "prompt" && type !== "batch" && type !== "character" && type !== "element" && isVariable) {
            setName(RESERVED_VARIABLE_NAMES[type]);
        }
    }, [type, isVariable]);

    // 处理变量模式切换
    const handleVariableToggle = useCallback((checked: boolean) => {
        setIsVariable(checked);
        // 如果选择变量且不是prompt、character或element类型，设置默认变量名
        if (checked && type !== "prompt" && type !== "batch" && type !== "character" && type !== "element") {
            setName(RESERVED_VARIABLE_NAMES[type]);
        } else {
            setName("");
        }
        setFormError(null);
    }, [type]);

    // 处理角色选择
    const handleCharacterSelect = useCallback((character: {
        uuid: string;
        name: string;
        avatar_img: string;
        heat_score: number;
    }) => {
        setValue(character.name);
        setCharacterInfo({
            uuid: character.uuid,
            avatar_img: character.avatar_img,
            heat_score: character.heat_score
        });
        setFormError(null);
    }, []);

    // 名称验证
    const nameError = useMemo(() => {
        if (isVariable && name.trim() && !isVariableNameLengthValid(name.trim())) {
            return "变量名不能超过12个字符";
        }
        return null;
    }, [name, isVariable]);

    // 处理提交
    const handleSubmit = useCallback(() => {
        // 清除之前的错误
        setFormError(null);

        // 验证变量名长度
        if (nameError) {
            setFormError(nameError);
            variableNameInputRef.current?.focus();
            return;
        }

        // 如果是角色类型但不是变量且没有选择角色
        if (type === "character" && !isVariable && !characterInfo.uuid) {
            setFormError("请选择一个角色");
            return;
        }

        onAdd({
            name,
            type,
            isVariable,
            value: value || getDefaultValueByType(type),
            ...(type === "character" && !isVariable ? {
                uuid: characterInfo.uuid,
                avatar: characterInfo.avatar_img,
                heat_score: characterInfo.heat_score
            } : {}),
            ...(((type === "character" || type === "element") && weight !== undefined) ? { weight } : {})
        });
    }, [name, type, isVariable, value, characterInfo, weight, nameError, onAdd]);

    // 处理键盘事件，支持回车键提交
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    }, [handleSubmit]);

    return (
        // 窗口容器
        // 弹性布局 flex
        // 垂直布局 flex-col
        // 垂直元素间距3px space-y-3px
        // 内边距 p-4
        // 边框 border
        // 圆角 rounded-xl
        // 最小宽度 min-w-[320px]
        // 背景色 bg-background/80
        <motion.div
            className="flex flex-col space-y-3 p-4 border rounded-xl min-w-[320px] bg-background/80 hover:shadow-md transition-all duration-150 "
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            transition={{ duration: 0.15, type: "spring", stiffness: 500, damping: 25 }}
        >
            {/* 窗口标题
                左右各自对齐 justify-between
                垂直居中 items-center
            */}
            <div className="flex
                            justify-between
                            items-center">
                <h3 className="text-sm font-semibold">添加标签窗口</h3>
                <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    className="rounded-full"
                    onPress={onCancel}
                >
                    <CloseIcon width={12} height={12} />
                </Button>
            </div>

            <div>
                {/* 类型和变量开关
                    水平元素间距 gap-6
                    垂直居中 items-center
                */}
                <div className="flex items-center gap-6">
                    {/* 类型选择器
                        占据剩余空间 flex-1
                    */}
                    <div className="flex items-center flex-1">
                        <span className="text-sm font-semibold mr-2 min-w-[40px]">类型</span>
                        <Select
                            selectedKeys={[type]}
                            onSelectionChange={(keys) => {
                                const keysArray = Array.from(keys);
                                if (keysArray.length > 0) {
                                    const selectedKey = keysArray[0] as TagType;
                                    setType(selectedKey);
                                }
                            }}
                            size="sm"
                            variant="flat"
                            className="flex-1"
                            defaultSelectedKeys={["prompt"]}
                            selectionMode="single"
                            disallowEmptySelection={true}
                            aria-label="类型"
                        >
                            {TAG_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option.key}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </Select>
                    </div>
                    <div className="flex items-center">
                        <span className="text-sm font-semibold mr-2">变量</span>
                        <Switch
                            size="sm"
                            isSelected={isVariable}
                            isDisabled={type === "batch"}
                            onValueChange={handleVariableToggle}
                            aria-label="变量模式"
                        />
                    </div>
                </div>

                {/* 输入区域 - 统一结构 */}
                <div className="mt-3">
                    <div className="text-sm font-semibold mb-1">
                        {isVariable ? "变量名" : (type === "character" ? "角色选择" : "标签值")}
                    </div>
                    <div className="p-0.5">
                        {isVariable ? (
                            type === "prompt" || type === "character" || type === "element" ? (
                                <Input
                                    ref={variableNameInputRef}
                                    size="sm"
                                    placeholder="输入变量名称"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    variant="flat"
                                    className="w-full"
                                    isInvalid={!!nameError}
                                    errorMessage={nameError}
                                    autoFocus={true}
                                />
                            ) : (
                                <Input
                                    size="sm"
                                    value={name}
                                    isDisabled={true}
                                    variant="flat"
                                    className="w-full"
                                />
                            )
                        ) : (
                            <TagValueInput
                                value={value || getDefaultValueByType(type)}
                                type={type}
                                onChange={setValue}
                                onEnterPress={handleSubmit}
                                autoFocus={true}
                                onSelectCharacter={handleCharacterSelect}
                            />
                        )}
                    </div>
                </div>

                {/* 权重输入区域 - 仅对角色和元素类型显示 */}
                {(type === "character" || type === "element") && (
                    <div className="mt-3">
                        <div className="text-sm font-semibold mb-1">权重</div>
                        <div className="p-0.5">
                            <Slider
                                size="sm"
                                label="权重"
                                color="foreground"
                                step={0.05}
                                minValue={0.05}
                                maxValue={2}
                                defaultValue={1}
                                value={weight}
                                onChange={(val) => setWeight(val as number)}
                                className="w-full"
                                showSteps={false}
                                formatOptions={{ style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                            />
                        </div>
                    </div>
                )}

                {/* 表单错误提示 */}
                {formError && !nameError && (
                    <div className="mt-2">
                        <Alert
                            color="danger"
                            title={formError}
                        />
                    </div>
                )}
            </div>

            {/* 底部按钮区域 */}
            <div className="mt-5 pt-3">
                <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.1 }}
                    className="mt-1"
                >
                    <Button
                        size="sm"
                        variant="shadow"
                        color="primary"
                        className="w-full font-medium"
                        onPress={handleSubmit}
                    >
                        添加标签
                    </Button>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default AddTagForm;