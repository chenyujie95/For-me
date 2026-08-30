/**
 * 115 离线下载固定保存目录
 *
 * 目录：转录
 * CID：2409067043602038176
 */

const TARGET_CID = "2409067043602038176";

let body = $request.body || "";

if (!body) {
    console.log("[115离线] 请求 Body 为空，未修改");
    $done({});
} else {
    console.log(`[115离线] 原始 Body: ${body}`);

    // 如果请求中已经存在 wp_path_id，则直接替换
    if (/(^|&)wp_path_id=[^&]*/.test(body)) {
        body = body.replace(
            /(^|&)wp_path_id=[^&]*/g,
            `$1wp_path_id=${TARGET_CID}`
        );
    } else {
        // 如果不存在，则追加
        body += `${body.endsWith("&") ? "" : "&"}wp_path_id=${TARGET_CID}`;
    }

    console.log(`[115离线] 保存目录已强制设置为：${TARGET_CID}`);
    console.log(`[115离线] 修改后 Body: ${body}`);

    $done({
        body: body
    });
}