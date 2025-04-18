"use client";

import React, { useState, useEffect } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Card,
    Spinner,
    Pagination
} from "@heroui/react";
import { Character } from "@/types/tags";
import { SearchType } from "@/types/api";
import { searchCharacterOrElement } from "@/app/api/client";
import { HeartFilledIcon, SearchIcon, CloseIcon } from "@/components/icons";

interface VtokenSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: {
        uuid: string;
        name: string;
        avatar_img: string;
        heat_score: number;
    }) => void;
    type: "character" | "element";
}

/**
 * 通用令牌搜索模态框组件
 * 可以搜索角色或元素
 */
const VtokenSearchModal: React.FC<VtokenSearchModalProps> = ({ isOpen, onClose, onSelect, type }) => {
    const [keyword, setKeyword] = useState("");
    const [searchResults, setSearchResults] = useState<Character[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const pageSize = 12;
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isFirstSearch, setIsFirstSearch] = useState(true);

    // 根据type获取相应的标题和提示文本
    const getTypeSpecificContent = () => {
        if (type === "character") {
            return {
                title: "角色搜索",
                placeholder: "输入角色名称关键词",
                emptyText: "未找到相关角色，请尝试其他关键词",
                searchButtonText: "搜索角色",
                errorPrefix: "搜索角色失败"
            };
        } else {
            return {
                title: "元素搜索",
                placeholder: "输入元素名称关键词",
                emptyText: "未找到相关元素，请尝试其他关键词",
                searchButtonText: "搜索元素",
                errorPrefix: "搜索元素失败"
            };
        }
    };

    const typeContent = getTypeSpecificContent();

    // 处理搜索
    const handleSearch = async () => {
        if (!keyword.trim()) return;

        try {
            setIsLoading(true);
            setErrorMessage(null);
            setPage(1); // 搜索时重置页码为1
            setIsFirstSearch(false); // 标记为已经进行过搜索

            const searchTypeParam = type === "character" ? SearchType.OC : SearchType.ELEMENTUM;

            const response = await searchCharacterOrElement(
                keyword,
                0, // API中页码从0开始，UI中从1开始，因此这里用0
                pageSize,
                searchTypeParam
            );

            if (response.data) {
                setSearchResults(response.data);
                // 从API响应的metadata中获取总页数和总结果数
                const totalPageCount = response.metadata?.total_page_size ?? 1;
                const totalCount = response.metadata?.total_size ?? 0;
                setTotalPages(totalPageCount);
                setTotalResults(totalCount);
                console.log(`总结果数: ${totalCount}, 总页数: ${totalPageCount}`);
            } else if (response.error) {
                // 如果API返回了明确的错误信息，显示该错误
                console.error(`${typeContent.errorPrefix}:`, response.error);

                // 检查是否是认证相关错误
                if (response.status === 401) {
                    setErrorMessage("请先登录再进行搜索");
                } else {
                    setErrorMessage(`${typeContent.errorPrefix}，原因：${response.error}`);
                }

                setSearchResults([]);
                setTotalPages(1);
                setTotalResults(0);
            } else {
                // 没有数据也没有错误，说明是空结果
                setSearchResults([]);
                setTotalPages(1);
                setTotalResults(0);
                console.log('无搜索结果，总页数设置为1');
            }
        } catch (error) {
            console.error(`${typeContent.errorPrefix}:`, error);
            setErrorMessage(`${typeContent.errorPrefix}，请稍后重试`);
            setSearchResults([]);
            setTotalPages(1);
            setTotalResults(0);
        } finally {
            setIsLoading(false);
        }
    };

    // 处理按键事件，支持回车键搜索
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    // 页码变更
    const handlePageChange = async (newPage: number) => {
        try {
            setIsLoading(true);
            setErrorMessage(null);
            setPage(newPage); // UI页码，从1开始

            const searchTypeParam = type === "character" ? SearchType.OC : SearchType.ELEMENTUM;

            const response = await searchCharacterOrElement(
                keyword,
                newPage - 1, // API中页码从0开始，UI中从1开始，所以减1
                pageSize,
                searchTypeParam
            );

            if (response.data) {
                setSearchResults(response.data);
                // 从API响应的metadata中获取总页数和总结果数
                const totalPageCount = response.metadata?.total_page_size ?? 1;
                const totalCount = response.metadata?.total_size ?? 0;
                setTotalPages(totalPageCount);
                setTotalResults(totalCount);
                console.log(`总结果数: ${totalCount}, 总页数: ${totalPageCount}`);
            } else if (response.error) {
                // 如果API返回了明确的错误信息，显示该错误
                console.error(`${typeContent.errorPrefix}:`, response.error);

                // 检查是否是认证相关错误
                if (response.status === 401) {
                    setErrorMessage("请先登录再进行搜索");
                } else {
                    setErrorMessage(`${typeContent.errorPrefix}，原因：${response.error}`);
                }

                setSearchResults([]);
                setTotalPages(1);
                setTotalResults(0);
            } else {
                // 没有数据也没有错误，说明是空结果
                setSearchResults([]);
                setTotalPages(1);
                setTotalResults(0);
                console.log('无搜索结果，总页数设置为1');
            }
        } catch (error) {
            console.error(`加载更多${type === "character" ? "角色" : "元素"}失败:`, error);
            setErrorMessage(`加载更多${type === "character" ? "角色" : "元素"}失败，请稍后重试`);
        } finally {
            setIsLoading(false);
        }
    };

    // 选择项目
    const handleSelectItem = (item: Character) => {
        onSelect({
            uuid: item.uuid,
            name: item.name,
            avatar_img: item.avatar_img,
            heat_score: item.heat_score
        });
    };

    // 渲染页码信息
    const renderPaginationInfo = () => {
        if (isLoading) return "正在加载...";
        if (totalResults === 0 && !isFirstSearch) return "暂无结果";
        if (isFirstSearch) return "输入关键词开始搜索";
        return `共 ${totalResults} 个结果，当前第 ${page}/${totalPages} 页`;
    };

    // 获取占位图SVG
    const getPlaceholderSvg = () => {
        const text = type === "character" ? "角色" : "元素";
        return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%23dddddd"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="12" fill="%23888888" text-anchor="middle" dominant-baseline="middle"%3E${text}%3C/text%3E%3C/svg%3E`;
    };

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onClose}
            size="3xl"
            hideCloseButton
            classNames={{
                base: "max-w-5xl h-[760px]",
                header: "py-4 px-6",
                body: "p-0",
                footer: "pb-6",
                wrapper: "pt-[18px] pb-[18px]",
            }}
        >
            <ModalContent>
                {(onModalClose: () => void) => (
                    <>
                        <ModalHeader className="flex justify-between items-center">
                            <div className="text-xl font-medium">{typeContent.title}</div>
                            <Button
                                isIconOnly
                                variant="light"
                                onPress={onModalClose}
                                className="text-foreground text-xl p-2 min-w-0 w-auto h-auto rounded-full"
                            >
                                <CloseIcon size={18} />
                            </Button>
                        </ModalHeader>
                        <ModalBody className="p-4">
                            <div className="flex flex-col h-full space-y-4">
                                {/* 搜索框 */}
                                <div className="flex gap-2 flex-shrink-0 mt-2">
                                    <Input
                                        placeholder={typeContent.placeholder}
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="flex-grow"
                                        size="sm"
                                        startContent={
                                            <SearchIcon className="text-default-400 pointer-events-none flex-shrink-0" />
                                        }
                                        autoFocus
                                    />
                                    <Button
                                        color="primary"
                                        onPress={handleSearch}
                                        size="sm"
                                    >
                                        搜索
                                    </Button>
                                </div>

                                {/* 错误消息显示 */}
                                {errorMessage && (
                                    <div className="text-danger text-sm">{errorMessage}</div>
                                )}

                                {/* 内容区域 - 固定高度并添加滚动 */}
                                <div className="flex-grow h-[500px] overflow-y-auto relative">
                                    {/* 加载状态覆盖层 */}
                                    {isLoading && (
                                        <div className="absolute inset-0 bg-background/50 flex justify-center items-center z-10">
                                            <Spinner label="正在搜索..." color="primary" />
                                        </div>
                                    )}

                                    {/* 搜索结果 - 始终保持DOM结构，避免闪烁 */}
                                    {searchResults.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                            {searchResults.map((item) => (
                                                <Card
                                                    key={item.uuid}
                                                    isPressable
                                                    isDisabled={isLoading}
                                                    className="overflow-hidden hover:scale-105 transition-transform"
                                                    onPress={() => handleSelectItem(item)}
                                                >
                                                    <div className="relative">
                                                        {/* 头像/图片 */}
                                                        <div className="w-full aspect-[3/4] overflow-hidden">
                                                            <img
                                                                src={item.avatar_img}
                                                                alt={item.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    // 图片加载失败时显示占位图
                                                                    (e.target as HTMLImageElement).src = getPlaceholderSvg();
                                                                }}
                                                            />
                                                        </div>

                                                        {/* 热度分数 */}
                                                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                                            <HeartFilledIcon size={12} className="text-danger" />
                                                            <span className="font-medium">
                                                                {item.heat_score || 0}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* 名称 */}
                                                    <div className="p-2">
                                                        <div className="text-sm font-medium truncate">
                                                            {item.name}
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        /* 无结果提示 - 仅在非加载状态且有搜索关键词时显示 */
                                        !isLoading && keyword && !isFirstSearch && (
                                            <div className="flex flex-col justify-center items-center h-full text-center">
                                                <div className="text-gray-400 mb-2">
                                                    {errorMessage || typeContent.emptyText}
                                                </div>
                                                <div className="text-gray-400 text-xs">
                                                    {errorMessage && errorMessage.includes("请先登录") ?
                                                        "请登录后再尝试搜索，登录后可获取更多内容" :
                                                        "提示：若首次搜索未返回结果，可能需要登录或者刷新页面"
                                                    }
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* 搜索统计和分页控件 - 固定在底部，始终保持DOM结构，避免布局跳动 */}
                                <div className="flex flex-col items-center mt-4 flex-shrink-0 py-2">
                                    {/* 搜索统计信息 */}
                                    <div className="text-xs text-gray-500 mb-2">
                                        {renderPaginationInfo()}
                                    </div>

                                    {/* 分页控件 - 当有结果时显示，加载中时禁用但不隐藏 */}
                                    {searchResults.length > 0 && (
                                        <div className="flex items-center gap-1 pt-1 pb-2">
                                            <Pagination
                                                isCompact
                                                showControls
                                                initialPage={1}
                                                total={totalPages}
                                                page={page}
                                                onChange={handlePageChange}
                                                isDisabled={isLoading}
                                                color="primary"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

// 导出特定类型的组件
export const CharacterSearchModal: React.FC<Omit<VtokenSearchModalProps, 'type'>> = (props) => (
    <VtokenSearchModal {...props} type="character" />
);

export const ElementSearchModal: React.FC<Omit<VtokenSearchModalProps, 'type'>> = (props) => (
    <VtokenSearchModal {...props} type="element" />
);

export default VtokenSearchModal;