"use client";

import React from "react";
import { Card, CardBody, CardHeader, Progress, Chip, Button } from "@heroui/react";
import { motion } from "framer-motion";

// 模拟任务数据
interface Task {
    id: string;
    name: string;
    progress: number;
    status: "pending" | "running" | "completed" | "failed";
    createdAt: string;
    totalImages: number;
    completedImages: number;
}

const sampleTasks: Task[] = [
    {
        id: "task-1",
        name: "角色生成任务 #1",
        progress: 100,
        status: "completed",
        createdAt: "2023-05-15T10:30:00Z",
        totalImages: 12,
        completedImages: 12
    },
    {
        id: "task-2",
        name: "场景生成任务 #2",
        progress: 75,
        status: "running",
        createdAt: "2023-05-16T14:45:00Z",
        totalImages: 24,
        completedImages: 18
    },
    {
        id: "task-3",
        name: "元素测试任务 #3",
        progress: 0,
        status: "pending",
        createdAt: "2023-05-16T15:30:00Z",
        totalImages: 8,
        completedImages: 0
    },
    {
        id: "task-4",
        name: "风格对比任务 #4",
        progress: 30,
        status: "failed",
        createdAt: "2023-05-14T09:15:00Z",
        totalImages: 16,
        completedImages: 5
    }
];

const ProgressTab: React.FC = () => {
    // 获取状态对应的颜色
    const getStatusColor = (status: Task["status"]) => {
        switch (status) {
            case "pending": return "default";
            case "running": return "primary";
            case "completed": return "success";
            case "failed": return "danger";
            default: return "default";
        }
    };

    // 获取状态对应的文本
    const getStatusText = (status: Task["status"]) => {
        switch (status) {
            case "pending": return "等待中";
            case "running": return "进行中";
            case "completed": return "已完成";
            case "failed": return "失败";
            default: return "未知";
        }
    };

    return (
        <motion.div
            className="p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <h2 className="text-xl font-bold mb-4">任务进度</h2>
            
            <div className="space-y-4">
                {sampleTasks.map((task) => (
                    <Card key={task.id} className="w-full">
                        <CardHeader className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">{task.name}</h3>
                            <Chip color={getStatusColor(task.status)} variant="flat">
                                {getStatusText(task.status)}
                            </Chip>
                        </CardHeader>
                        <CardBody>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm">进度: {task.progress}%</span>
                                        <span className="text-sm">{task.completedImages}/{task.totalImages} 张图片</span>
                                    </div>
                                    <Progress 
                                        value={task.progress} 
                                        color={getStatusColor(task.status)}
                                        className="w-full"
                                    />
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-default-500">
                                        创建时间: {new Date(task.createdAt).toLocaleString()}
                                    </div>
                                    <div className="flex gap-2">
                                        {task.status === "running" && (
                                            <Button size="sm" color="danger" variant="flat">
                                                取消
                                            </Button>
                                        )}
                                        {task.status === "completed" && (
                                            <Button size="sm" color="primary" variant="flat">
                                                查看结果
                                            </Button>
                                        )}
                                        {task.status === "failed" && (
                                            <Button size="sm" color="primary" variant="flat">
                                                重试
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>
        </motion.div>
    );
};

export default ProgressTab;
