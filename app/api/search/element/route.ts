/**
 * 搜索类型枚举
 */
enum SearchType {
    OC = 'oc',
    ELEMENTUM = 'elementum'
}

/**
 * 搜索角色或元素
 * @param name 搜索关键词
 * @param pageIndex 页码（从0开始）
 * @param pageSize 每页数量
 * @param xToken 认证令牌
 * @param type 搜索类型
 */
async function search(
    name: string,
    pageIndex = 0,
    pageSize = 12,
    xToken: string | null = null,
    type: SearchType = SearchType.ELEMENTUM
): Promise<any[]> {
    try {
        // 构建API URL
        const url = `https://api.talesofai.cn/v2/travel/parent-search?keywords=${encodeURIComponent(name)}&page_index=${pageIndex}&page_size=${pageSize}&parent_type=${type}&sort_scheme=best`;

        // 设置请求头
        const headers: Record<string, string> = {
            'x-platform': 'nieta-app/web'
        };

        // 如果有token，添加到请求头
        if (xToken) {
            headers['x-token'] = xToken;
        }

        // 发送请求
        const response = await fetch(url, { headers });

        // 检查响应状态
        if (!response.ok) {
            console.error(`API请求失败: ${response.status} ${response.statusText}`);
            return [];
        }

        // 解析响应
        const responseData = await response.json();
        const totalSize = responseData.total;
        const resultList = responseData.list || [];

        // 处理响应数据
        const resultData = resultList.map((data: any) => ({
            uuid: data.uuid,
            type: data.type,
            name: data.name,
            avatar_img: data.config.avatar_img,
            header_img: data.config.header_img,
            heat_score: data.heat_score,
            total_size: totalSize
        }));

        return resultData;
    } catch (error) {
        console.error('搜索请求失败:', error);
        return [];
    }
}

/**
 * GET 请求处理函数
 */
export async function GET(request: Request): Promise<Response> {
    try {
        // 获取URL参数
        const url = new URL(request.url);
        const searchParams = url.searchParams;
        const keywords = searchParams.get('keywords');
        const pageIndex = parseInt(searchParams.get('page_index') || '0', 10);
        const pageSize = parseInt(searchParams.get('page_size') || '20', 10);

        // 获取认证令牌
        const xToken = request.headers.get('x-token');

        // 验证关键词是否存在
        if (!keywords) {
            return new Response(
                JSON.stringify({ error: '必须提供搜索关键词' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // 搜索元素
        const result = await search(
            keywords,
            pageIndex,
            pageSize,
            xToken,
            SearchType.ELEMENTUM
        );

        // 返回结果
        return new Response(
            JSON.stringify(result),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error('元素搜索API出错:', error);
        return new Response(
            JSON.stringify({ error: '搜索处理过程中出错' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}