/**
 * 115 离线下载 → 固定「转录」目录
 *
 * CID: 2409067043602038176
 */

const TARGET_CID = "2409067043602038176";
const TARGET_NAME = "转录";

function getHeader(name) {
    const headers = $request.headers || {};

    const key = Object.keys(headers).find(
        k => k.toLowerCase() === name.toLowerCase()
    );

    return key ? String(headers[key] || "") : "";
}

function notify(title, subtitle, body) {
    $notification.post(title, subtitle, body);
}

function finish() {
    /*
     * 非常重要：
     *
     * 不再把 taskdg=1 放给原网页，
     * 防止 UDown 再按照自己的默认目录添加一次。
     */
    $done({
        url: "http://115.com/lx"
    });
}


// ==============================
// 读取快捷指令传进来的下载链接
// ==============================

const requestUrl = $request.url || "";

console.log(`[115] Trigger: ${requestUrl}`);

const match = requestUrl.match(/[?&]u=([^&]+)/);

if (!match) {

    notify(
        "115 离线下载",
        "没有找到下载链接",
        "缺少参数 u"
    );

    finish();

} else {

    let taskUrl;

    try {

        taskUrl = decodeURIComponent(match[1]);

    } catch (e) {

        taskUrl = match[1];
    }


    if (
        !taskUrl.startsWith("magnet:") &&
        !taskUrl.startsWith("ed2k:")
    ) {

        notify(
            "115 离线下载",
            "链接格式错误",
            taskUrl.substring(0, 100)
        );

        finish();

    } else {

        const cookie = getHeader("Cookie");

        const userAgent =
            getHeader("User-Agent") ||
            "Mozilla/5.0";


        if (!cookie) {

            notify(
                "115 离线下载",
                "获取登录状态失败",
                "115.com 请求中没有 Cookie"
            );

            finish();

        } else {

            const commonHeaders = {

                "Cookie": cookie,

                "User-Agent": userAgent,

                "Accept":
                    "application/json, text/javascript, */*; q=0.01",

                "Content-Type":
                    "application/x-www-form-urlencoded",

                "Origin":
                    "https://115.com",

                "Referer":
                    "https://115.com/"
            };


            // ==========================
            // 第一次：
            // 直接指定 wp_path_id 添加
            // ==========================

            const directBody = [
                "url=" + encodeURIComponent(taskUrl),
                "savepath=",
                "wp_path_id=" + TARGET_CID
            ].join("&");


            const addOptions = {

                url:
                    "https://115.com/web/lixian/" +
                    "?ct=lixian&ac=add_task_url",

                headers: commonHeaders,

                body: directBody
            };


            console.log("[115] 尝试直接创建离线任务");
            console.log(`[115] CID=${TARGET_CID}`);


            $httpClient.post(
                addOptions,

                function(error, response, data) {

                    if (!error) {

                        try {

                            const json = JSON.parse(data);

                            if (json.state === true) {

                                notify(
                                    "115 离线下载成功",
                                    `已保存到「${TARGET_NAME}」`,
                                    `CID：${TARGET_CID}`
                                );

                                finish();

                                return;
                            }

                        } catch (_) {}
                    }


                    /*
                     * 某些账号/API要求 sign、time、uid，
                     * 第一次失败后自动走完整鉴权。
                     */

                    console.log(
                        "[115] 直接添加失败，尝试完整鉴权"
                    );

                    getSignAndRetry();
                }
            );


            // ==============================
            // 获取 sign/time 后再次添加
            // ==============================

            function getSignAndRetry() {

                const timestamp = Date.now();

                const signOptions = {

                    url:
                        "https://115.com/" +
                        "?ct=offline" +
                        "&ac=space" +
                        "&_=" +
                        timestamp,

                    headers: {
                        "Cookie": cookie,
                        "User-Agent": userAgent,
                        "Accept": "*/*"
                    }
                };


                $httpClient.get(
                    signOptions,

                    function(signError, signResponse, signData) {

                        if (signError) {

                            notify(
                                "115 离线下载失败",
                                "获取 Sign 失败",
                                String(signError)
                            );

                            finish();
                            return;
                        }


                        let signJson;

                        try {

                            signJson =
                                JSON.parse(signData);

                        } catch (e) {

                            notify(
                                "115 离线下载失败",
                                "Sign 返回异常",
                                signData || String(e)
                            );

                            finish();
                            return;
                        }


                        if (
                            !signJson ||
                            !signJson.sign
                        ) {

                            notify(
                                "115 离线下载失败",
                                "没有获取到 Sign",
                                JSON.stringify(signJson)
                            );

                            finish();
                            return;
                        }


                        getUserIdAndRetry(
                            signJson.sign,
                            signJson.time || timestamp
                        );
                    }
                );
            }


            // ==============================
            // 获取 UID
            // ==============================

            function getUserIdAndRetry(sign, time) {

                const options = {

                    url:
                        "https://webapi.115.com/" +
                        "offine/downpath",

                    headers: {
                        "Cookie": cookie,
                        "User-Agent": userAgent,
                        "Accept": "*/*"
                    }
                };


                $httpClient.get(
                    options,

                    function(error, response, data) {

                        if (error) {

                            notify(
                                "115 离线下载失败",
                                "获取 UID 失败",
                                String(error)
                            );

                            finish();
                            return;
                        }


                        let json;

                        try {

                            json = JSON.parse(data);

                        } catch (e) {

                            notify(
                                "115 离线下载失败",
                                "UID 返回异常",
                                data || String(e)
                            );

                            finish();
                            return;
                        }


                        const uid =
                            json &&
                            json.data &&
                            json.data[0] &&
                            json.data[0].user_id;


                        if (!uid) {

                            notify(
                                "115 离线下载失败",
                                "未获取到 UID",
                                JSON.stringify(json)
                            );

                            finish();
                            return;
                        }


                        createFinalTask(
                            uid,
                            sign,
                            time
                        );
                    }
                );
            }


            // ==============================
            // 完整参数创建任务
            // ==============================

            function createFinalTask(
                uid,
                sign,
                time
            ) {

                const body = [

                    "url=" +
                        encodeURIComponent(taskUrl),

                    "savepath=",

                    "wp_path_id=" +
                        TARGET_CID,

                    "uid=" +
                        encodeURIComponent(uid),

                    "sign=" +
                        encodeURIComponent(sign),

                    "time=" +
                        encodeURIComponent(time)

                ].join("&");


                const options = {

                    url:
                        "https://115.com/" +
                        "web/lixian/" +
                        "?ct=lixian" +
                        "&ac=add_task_url",

                    headers: commonHeaders,

                    body: body
                };


                $httpClient.post(
                    options,

                    function(error, response, data) {

                        if (error) {

                            notify(
                                "115 离线下载失败",
                                "请求失败",
                                String(error)
                            );

                            finish();
                            return;
                        }


                        let json;

                        try {

                            json = JSON.parse(data);

                        } catch (e) {

                            notify(
                                "115 离线下载失败",
                                "返回数据异常",
                                data || String(e)
                            );

                            finish();
                            return;
                        }


                        if (json.state === true) {

                            notify(
                                "115 离线下载成功",
                                `已保存到「${TARGET_NAME}」`,
                                `CID：${TARGET_CID}`
                            );

                        } else {

                            notify(
                                "115 离线下载失败",
                                "115 拒绝任务",
                                json.error_msg ||
                                json.error ||
                                json.message ||
                                JSON.stringify(json)
                            );
                        }


                        finish();
                    }
                );
            }
        }
    }
}