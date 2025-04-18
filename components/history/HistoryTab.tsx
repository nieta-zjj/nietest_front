"use client";

import React, { useState, useEffect } from "react";
import { Select, SelectItem, Card, CardBody, CardHeader, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Image, useDisclosure, Chip } from "@heroui/react";
import { motion } from "framer-motion";

// 模拟历史数据
interface HistoryItem {
    id: string;
    timestamp: string;
    variables: Record<string, string[]>;
    results: Record<string, Record<string, string>>;
    title?: string;
    description?: string;
}

// 图片结果数据
interface ResultViewData {
    xAxis: string;
    yAxis: string;
    xValue: string;
    yValue: string;
    imageUrl: string;
    title: string;
}

// 模拟图片URL
const sampleImageUrls = [
    "https://images.unsplash.com/photo-1527960669566-f882ba85a4c6?q=80&w=1470&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1578645510447-e20b4311e3ce?q=80&w=1374&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?q=80&w=1374&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1612686635542-2244ed9f8ddc?q=80&w=1470&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?q=80&w=1470&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1599508704512-2f19efd1e35f?q=80&w=1335&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=1374&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1638803040283-7a5ffd48dad5?q=80&w=1374&auto=format&fit=crop",
    // 新增图片URL
    "https://images.unsplash.com/photo-1682687982501-1e58ab814714",
    "https://images.unsplash.com/photo-1682687982093-4c9ae83a8c3f",
    "https://images.unsplash.com/photo-1682687218147-9cac2c5f669b",
    "https://images.unsplash.com/photo-1682687220063-4742bd7fd538",
    "https://images.unsplash.com/photo-1682687220067-dced9a881b56",
    "https://images.unsplash.com/photo-1682687220208-22d7a2543e88",
    "https://images.unsplash.com/photo-1682687220015-0a5579aa2a5a",
    "https://images.unsplash.com/photo-1682687220199-d0124f48f95b",
    "https://images.unsplash.com/photo-1682687220923-c7a7cf9ece67",
    "https://images.unsplash.com/photo-1682687220305-ce8a9ab237b1",
    "https://images.unsplash.com/photo-1682687220509-61b8a906ca19",
    "https://images.unsplash.com/photo-1682687220795-796d3f6f7000"
];

// 生成随机图片URL
const getRandomImageUrl = () => {
    const randomIndex = Math.floor(Math.random() * sampleImageUrls.length);
    return sampleImageUrls[randomIndex];
};

// 示例数据
const sampleHistoryData: HistoryItem[] = [
    {
        id: "1",
        timestamp: "2023-05-15T10:30:00Z",
        title: "角色元素组合测试",
        description: "测试不同角色与元素的组合效果",
        variables: {
            "角色": ["克洛迪特", "君特", "阿米娅"],
            "元素": ["火", "水", "风", "雷"],
            "风格": ["写实", "动漫", "赛博朋克"],
            "比例": ["1:1", "4:3", "16:9"]
        },
        results: {
            "克洛迪特": {
                "火": getRandomImageUrl(),
                "水": getRandomImageUrl(),
                "风": getRandomImageUrl(),
                "雷": getRandomImageUrl()
            },
            "君特": {
                "火": getRandomImageUrl(),
                "水": getRandomImageUrl(),
                "风": getRandomImageUrl(),
                "雷": getRandomImageUrl()
            },
            "阿米娅": {
                "火": getRandomImageUrl(),
                "水": getRandomImageUrl(),
                "风": getRandomImageUrl(),
                "雷": getRandomImageUrl()
            }
        }
    },
    {
        id: "2",
        timestamp: "2023-05-16T14:45:00Z",
        title: "场景与时间测试",
        description: "测试不同场景与时间的组合效果",
        variables: {
            "角色": ["阿米娅", "克洛迪特"],
            "元素": ["火", "水"],
            "场景": ["城市", "森林", "海滩", "山地"],
            "时间": ["白天", "黄昏", "夜晚"]
        },
        results: {
            "阿米娅": {
                "火": getRandomImageUrl(),
                "水": getRandomImageUrl()
            },
            "克洛迪特": {
                "火": getRandomImageUrl(),
                "水": getRandomImageUrl()
            }
        }
    }
];

const HistoryTab: React.FC = () => {
    const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(sampleHistoryData[0]);
    const [xAxis, setXAxis] = useState<string>("");
    const [yAxis, setYAxis] = useState<string>("");
    const [availableVariables, setAvailableVariables] = useState<string[]>([]);
    const [selectedResult, setSelectedResult] = useState<ResultViewData | null>(null);

    // 结果查看模态框状态
    const { isOpen: isResultViewOpen, onOpen: onResultViewOpen, onClose: onResultViewClose } = useDisclosure();

    // 当选择的历史记录变化时，更新可用变量
    useEffect(() => {
        if (selectedHistory) {
            const variables = Object.keys(selectedHistory.variables);
            setAvailableVariables(variables);

            // 默认选择前两个变量作为X轴和Y轴
            if (variables.length >= 2) {
                setXAxis(variables[0]);
                setYAxis(variables[1]);
            } else if (variables.length === 1) {
                setXAxis(variables[0]);
                setYAxis("");
            } else {
                setXAxis("");
                setYAxis("");
            }
        }
    }, [selectedHistory]);

    // 生成表格数据
    const generateTableData = () => {
        if (!selectedHistory || !xAxis || !yAxis) return null;

        const xValues = selectedHistory.variables[xAxis] || [];
        const yValues = selectedHistory.variables[yAxis] || [];

        return {
            xValues,
            yValues,
            data: selectedHistory.results
        };
    };

    const tableData = generateTableData();

    // 全屏表格模态框状态
    const { isOpen: isTableViewOpen, onOpen: onTableViewOpen, onClose: onTableViewClose } = useDisclosure();

    // 处理查看历史记录
    const handleViewHistory = (history: HistoryItem) => {
        setSelectedHistory(history);
        onTableViewOpen();
    };

    return (
        <>
            <motion.div
                className="p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                <div className="mb-6">
                    <h2 className="text-xl font-bold mb-4">历史记录</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sampleHistoryData.map((history) => (
                            <Card key={history.id} className="shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-md font-medium">{history.title || `测试 ID: ${history.id}`}</h4>
                                        <span className="text-xs text-default-500">
                                            {new Date(history.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardBody className="pt-0">
                                    {history.description && (
                                        <p className="text-sm text-default-600 mb-3">{history.description}</p>
                                    )}
                                    <div className="mb-3">
                                        <h5 className="text-xs font-semibold mb-1">变量类型</h5>
                                        <div className="flex flex-wrap gap-1">
                                            {Object.keys(history.variables).map((variable) => (
                                                <Chip key={variable} size="sm" variant="flat" className="text-xs">
                                                    {variable}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <h5 className="text-xs font-semibold mb-1">结果数量</h5>
                                        <div className="text-xs">
                                            {Object.keys(history.results).reduce((count, key) => {
                                                return count + Object.keys(history.results[key]).length;
                                            }, 0)} 个结果
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button
                                            color="primary"
                                            size="sm"
                                            onPress={() => handleViewHistory(history)}
                                        >
                                            查看详情
                                        </Button>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* 全屏表格模态框 */}
            <Modal
                isOpen={isTableViewOpen}
                onClose={onTableViewClose}
                size="full"
                scrollBehavior="inside"
                hideCloseButton
            >
                <ModalContent>
                    {(onModalClose) => (
                        <>
                            <ModalHeader className="flex justify-between items-center">
                                <div>
                                    {selectedHistory && (
                                        <h2 className="text-xl">
                                            历史记录 ID: {selectedHistory.id} - {new Date(selectedHistory.timestamp).toLocaleString()}
                                        </h2>
                                    )}
                                </div>
                                <Button
                                    color="danger"
                                    variant="light"
                                    onPress={onModalClose}
                                >
                                    关闭
                                </Button>
                            </ModalHeader>
                            <ModalBody className="p-4">
                                {selectedHistory && (
                                    <div className="space-y-6">
                                        <Card className="mb-6">
                                            <CardHeader>
                                                <h3 className="text-lg font-semibold">XY表格设置</h3>
                                            </CardHeader>
                                            <CardBody>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <Select
                                                        label="X轴变量"
                                                        placeholder="选择X轴变量"
                                                        selectedKeys={xAxis ? [xAxis] : []}
                                                        onSelectionChange={(keys) => {
                                                            const keysArray = Array.from(keys);
                                                            if (keysArray.length > 0) {
                                                                const newXAxis = keysArray[0] as string;
                                                                // 如果新选择的X轴与当前Y轴相同，则清空Y轴
                                                                if (newXAxis === yAxis) {
                                                                    setYAxis("");
                                                                }
                                                                setXAxis(newXAxis);
                                                            }
                                                        }}
                                                    >
                                                        {availableVariables.map((variable) => (
                                                            <SelectItem key={variable}>
                                                                {variable}
                                                            </SelectItem>
                                                        ))}
                                                    </Select>
                                                    <Select
                                                        label="Y轴变量"
                                                        placeholder="选择Y轴变量"
                                                        selectedKeys={yAxis ? [yAxis] : []}
                                                        onSelectionChange={(keys) => {
                                                            const keysArray = Array.from(keys);
                                                            if (keysArray.length > 0) {
                                                                const newYAxis = keysArray[0] as string;
                                                                // 如果新选择的Y轴与当前X轴相同，则清空X轴
                                                                if (newYAxis === xAxis) {
                                                                    setXAxis("");
                                                                }
                                                                setYAxis(newYAxis);
                                                            }
                                                        }}
                                                    >
                                                        {availableVariables.map((variable) => (
                                                            <SelectItem key={variable} className={variable === xAxis ? "opacity-50 pointer-events-none" : ""}>
                                                                {variable}
                                                            </SelectItem>
                                                        ))}
                                                    </Select>
                                                </div>
                                            </CardBody>
                                        </Card>

                                        {tableData && (
                                            <Card>
                                                <CardHeader>
                                                    <h3 className="text-lg font-semibold">结果表格</h3>
                                                </CardHeader>
                                                <CardBody>
                                                    <div className="overflow-x-auto" style={{ maxWidth: '100%', overflowX: 'scroll' }}>
                                                        <table className="border-collapse" style={{ tableLayout: 'fixed', width: 'auto', borderSpacing: 0, borderCollapse: 'collapse', borderRadius: 0 }}>
                                                            <thead>
                                                                <tr>
                                                                    <th className="border p-1 bg-default-100 text-xs w-20" style={{ minWidth: '80px', borderRadius: 0 }}>{xAxis} / {yAxis}</th>
                                                                    {tableData.xValues.map((xValue) => (
                                                                        <th key={xValue} className="border p-1 bg-default-100 text-xs" style={{ width: '256px', minWidth: '256px', maxWidth: '256px', borderRadius: 0 }}>
                                                                            {xValue}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {tableData.yValues.map((yValue) => (
                                                                    <tr key={yValue}>
                                                                        <td className="border p-1 font-medium bg-default-50 text-xs w-20" style={{ minWidth: '80px', borderRadius: 0 }}>
                                                                            {yValue}
                                                                        </td>
                                                                        {tableData.xValues.map((xValue) => {
                                                                            // 由于tableData只有在selectedHistory存在时才会生成，所以这里可以安全断言selectedHistory不为null
                                                                            const resultKey = selectedHistory!.results[yValue]?.[xValue];
                                                                            return (
                                                                                <td key={`${yValue}-${xValue}`} className="border p-2 text-center" style={{ width: '256px', height: '256px', minWidth: '256px', minHeight: '256px', maxWidth: '256px', borderRadius: 0 }}>
                                                                                    {resultKey ? (
                                                                                        <div className="flex flex-col items-center">
                                                                                            <div className="w-64 h-64 overflow-hidden mb-1">
                                                                                                <Image
                                                                                                    src={resultKey}
                                                                                                    alt={`${yValue}-${xValue}`}
                                                                                                    width={256}
                                                                                                    height={256}
                                                                                                    radius="none"
                                                                                                    isZoomed
                                                                                                />
                                                                                            </div>
                                                                                            <Button
                                                                                                size="sm"
                                                                                                variant="flat"
                                                                                                color="primary"
                                                                                                onPress={() => {
                                                                                                    setSelectedResult({
                                                                                                        xAxis,
                                                                                                        yAxis,
                                                                                                        xValue,
                                                                                                        yValue,
                                                                                                        imageUrl: resultKey,
                                                                                                        title: `${yValue} + ${xValue}`
                                                                                                    });
                                                                                                    onResultViewOpen();
                                                                                                }}
                                                                                            >
                                                                                                查看
                                                                                            </Button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="flex flex-col items-center">
                                                                                            <div className="w-64 h-64 overflow-hidden mb-1">
                                                                                                <Image
                                                                                                    src="https://app.requestly.io/delay/5000/https://heroui.com/images/hero-card-complete.jpeg"
                                                                                                    alt="占位图片"
                                                                                                    width={256}
                                                                                                    height={256}
                                                                                                    radius="none"
                                                                                                    isZoomed
                                                                                                />
                                                                                            </div>
                                                                                            <span className="text-xs text-default-400 mt-1">无数据</span>
                                                                                        </div>
                                                                                    )}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        )}
                                    </div>
                                )}
                            </ModalBody>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* 结果查看模态框 */}
            <Modal
                isOpen={isResultViewOpen}
                onClose={onResultViewClose}
                size="full"
                scrollBehavior="inside"
                hideCloseButton
            >
                <ModalContent>
                    {(onModalClose) => (
                        <>
                            <ModalHeader className="flex justify-between items-center">
                                <div>
                                    {selectedResult && (
                                        <h2 className="text-xl">
                                            {selectedResult.title}
                                        </h2>
                                    )}
                                </div>
                                <Button
                                    color="danger"
                                    variant="light"
                                    onPress={onModalClose}
                                >
                                    关闭
                                </Button>
                            </ModalHeader>
                            <ModalBody className="p-0">
                                {selectedResult && (
                                    <div className="flex flex-col items-center justify-center min-h-[80vh]">
                                        <div className="relative w-full max-w-4xl">
                                            <Image
                                                src={selectedResult.imageUrl}
                                                alt={selectedResult.title}
                                                width={800}
                                                height={600}
                                                radius="md"
                                                shadow="md"
                                                isZoomed
                                            />
                                        </div>
                                        <div className="mt-4 p-4 bg-default-50 rounded-lg w-full max-w-4xl">
                                            <h3 className="text-lg font-semibold mb-2">图片信息</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm text-default-500">{selectedResult.xAxis}</p>
                                                    <p className="font-medium">{selectedResult.xValue}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-default-500">{selectedResult.yAxis}</p>
                                                    <p className="font-medium">{selectedResult.yValue}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter className="flex justify-between">
                                <Button color="default" variant="flat">
                                    下载图片
                                </Button>
                                <Button color="primary">
                                    应用这些参数
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
};

export default HistoryTab;
