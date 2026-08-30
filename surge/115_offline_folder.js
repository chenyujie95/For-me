/**
 * UDown / 115 云下载固定目录
 *
 * 目标目录：转录
 * CID：2409067043602038176
 */

const TARGET_CID = "2409067043602038176";
const TARGET_NAME = "转录";

const reqHeaders = $request.headers || {};

const cookie =
    reqHeaders["Cookie"] ||
    reqHeaders["cookie"] ||
    "";

const userAgent =
    reqHeaders["User-Agent"] ||
    reqHeaders["user-agent"] ||
    "Mozilla/5.0";

console.log("========== 115 UDown 目录切换 ==========");
console.log(`[115] 触发请求：${$request.url}`);
console.log(`[115] 目标目录：${TARGET_NAME}`);
console.log(`[115] CID：${TARGET_CID}`);

if (!cookie) {

    console.log("[115] 未获取到 Cookie，无法修改默认目录");

    $notification.post(
        "115 UDown",
        "目录切换失败",
        "没有获取到 115 Cookie"
    );

    $done({});

} else {

    const options = {
        url: "https://webapi.115.com/offine/downpath",

        headers: {
            "Cookie": cookie,
            "User-Agent": userAgent,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "*/*"
        },

        body: `file_id=${TARGET_CID}`
    };

    $httpClient.post(options, function(error, response, data) {

        if (error) {

            console.log(`[115] 设置目录请求失败：${error}`);

            $notification.post(
                "115 UDown",
                "目录切换失败",
                String(error)
            );

            $done({});
            return;
        }

        console.log(`[115] HTTP状态：${response.status}`);
        console.log(`[115] 返回数据：${data}`);

        try {

            const json = JSON.parse(data);

            if (json.state === true) {

                console.log(
                    `[115] 已成功切换至 ${TARGET_NAME} (${TARGET_CID})`
                );

                $notification.post(
                    "115 UDown",
                    "下载目录切换成功",
                    `${TARGET_NAME} · ${TARGET_CID}`
                );

            } else {

                console.log(
                    `[115] 接口返回失败：${JSON.stringify(json)}`
                );

                $notification.post(
                    "115 UDown",
                    "目录切换失败",
                    json.error || json.message || data
                );
            }

        } catch (e) {

            console.log(`[115] 返回值解析失败：${e}`);
            console.log(`[115] 原始返回：${data}`);

            $notification.post(
                "115 UDown",
                "目录接口返回异常",
                data || "无返回数据"
            );
        }

        /*
         * 等设置目录接口完成之后，
         * 再允许 UDown 原本的 task_lists 请求继续。
         */
        $done({});
    });
}