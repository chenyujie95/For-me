/**
 * 115 云下载固定保存目录
 *
 * 目录：转录
 * CID：2409067043602038176
 */

const TARGET_CID = "2409067043602038176";

const url = $request.url || "";
let body = $request.body || "";

console.log("========== 115 离线目录脚本 ==========");
console.log(`[115] URL: ${url}`);
console.log(`[115] 原始 Body: ${body}`);

if (!body) {
    console.log("[115] Body 为空，无法修改");
    $done({});
} else {
    let newBody = body;

    // 判断是否为 JSON
    const trimmed = body.trim();

    if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
        try {
            const json = JSON.parse(body);

            json.wp_path_id = TARGET_CID;

            // 部分接口同时使用 savepath
            if ("savepath" in json) {
                json.savepath = "";
            }

            newBody = JSON.stringify(json);

            console.log("[115] JSON 请求修改成功");
        } catch (e) {
            console.log(`[115] JSON 解析失败: ${e}`);
        }
    } else {
        // application/x-www-form-urlencoded

        if (/(^|&)wp_path_id=[^&]*/.test(newBody)) {
            newBody = newBody.replace(
                /(^|&)wp_path_id=[^&]*/g,
                `$1wp_path_id=${TARGET_CID}`
            );

            console.log("[115] 已替换 wp_path_id");
        } else {
            newBody +=
                (newBody.endsWith("&") ? "" : "&") +
                `wp_path_id=${TARGET_CID}`;

            console.log("[115] 原请求无 wp_path_id，已追加");
        }

        // 如果存在 savepath，则清空
        if (/(^|&)savepath=[^&]*/.test(newBody)) {
            newBody = newBody.replace(
                /(^|&)savepath=[^&]*/g,
                "$1savepath="
            );
        }
    }

    console.log(`[115] 修改后 Body: ${newBody}`);
    console.log(`[115] 目标目录 CID: ${TARGET_CID}`);

    // 测试阶段弹一次通知，确认确实命中了脚本
    $notification.post(
        "115 离线下载",
        "已切换保存目录",
        `转录 / ${TARGET_CID}`
    );

    $done({
        body: newBody
    });
}