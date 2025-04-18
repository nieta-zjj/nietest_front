/**
 * 处理登录请求的API路由
 */
export async function POST(request: Request): Promise<Response> {
    console.log("登录API路由被调用");

    try {
        // 解析请求体
        let body;
        try {
            body = await request.json();
            console.log("请求体解析成功:", JSON.stringify(body));
        } catch (e) {
            console.error("请求体解析失败:", e);
            return new Response(
                JSON.stringify({ error: '无效的请求格式', details: String(e) }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        const { email, password } = body;

        // 验证请求参数
        if (!email || !password) {
            console.log("请求缺少必要参数");
            return new Response(
                JSON.stringify({ error: '必须提供邮箱和密码' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        console.log("准备发送请求到后端API");

        // 正确的后端URL和端口
        const backendUrl = 'http://localhost:8000/login';
        console.log(`发送请求到: ${backendUrl}`);

        try {
            // 创建表单数据而不是JSON - FastAPI的OAuth2需要表单格式
            const formData = new URLSearchParams();
            // 注意：FastAPI的OAuth2表单期望的参数是username而不是email
            formData.append('username', email); // 使用email作为username
            formData.append('password', password);

            // 设置正确的Content-Type为表单格式
            const headers: Record<string, string> = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-platform': 'nieta-app/web'
            };

            console.log("发送OAuth2表单数据");

            const response = await fetch(backendUrl, {
                method: 'POST',
                headers,
                body: formData
            });

            // 获取响应数据
            const responseText = await response.text();
            let data;

            try {
                data = JSON.parse(responseText);
                console.log("后端响应:", JSON.stringify(data));
            } catch (e) {
                console.error("解析后端响应失败:", e);
                console.log("原始响应:", responseText);
                return new Response(
                    JSON.stringify({ error: '解析后端响应失败', raw: responseText }),
                    {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }

            // 如果响应不成功，返回错误
            if (!response.ok) {
                console.log(`后端响应错误: ${response.status} ${response.statusText}`);
                return new Response(
                    JSON.stringify({
                        error: data.detail || '登录失败，请检查邮箱和密码',
                        status: response.status,
                        statusText: response.statusText,
                        data: data
                    }),
                    {
                        status: response.status,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }

            // 返回成功响应 - 注意FastAPI OAuth2返回的是access_token而不是token
            console.log("登录成功，返回token");
            return new Response(
                JSON.stringify({
                    access_token: data.access_token, // 使用access_token而不是token
                    token_type: data.token_type || 'bearer'
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        } catch (fetchError) {
            console.error("后端API请求失败:", fetchError);
            return new Response(
                JSON.stringify({
                    error: '无法连接到认证服务器',
                    details: String(fetchError)
                }),
                {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
    } catch (error) {
        console.error('登录处理失败:', error);
        return new Response(
            JSON.stringify({
                error: '服务器处理登录请求时出错',
                details: String(error)
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}