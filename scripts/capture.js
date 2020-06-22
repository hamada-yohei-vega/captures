// puppeteer読み込み
const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
// jsonfile読み込み
const fs = require('fs');

var urls = JSON.parse(fs.readFileSync('./assets/urls.json', 'utf8'));
var queries = process.argv[2].split(",");

(async () => {
    const today = await new Date();
    const monthMM = ('0' + (today.getMonth() + 1)).slice(-2);
    const dayDD = ('0' + (today.getDate() + 1)).slice(-2);

    const now = today.getFullYear() + monthMM + dayDD;
    const { baseUrl, targets, outputs, waitsec } = urls["query"];
    await console.log("START:" + now);

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    for (const index in queries) {
        const query = queries[index];
        const dirPath = `./output/${query}`;
        if (!fs.existsSync(dirPath)){
            fs.mkdirSync(dirPath);
        }

        await console.log("query-START: " + query);
        const url = `${baseUrl}${query}`
        for (const index in targets) {
            const target = targets[index];
            // 画面サイズ指定
            if (target == 'PC') {
                // PCの画面サイズは1920×1080
                await page.setViewport({ width: 1920, height: 1080 });
            } else {
                // SPの画面サイズは「iPhone X」を使用。
                const device = devices.devicesMap[target];
                await page.emulate(device);
            }
            // URLアクセス
            await page.goto(url, { waitUntil: 'networkidle2' });
            // 末尾迄スクロール
            // https://github.com/GoogleChrome/puppeteer/issues/305#issuecomment-385145048
            const autoScroll = async (page) => {
                await page.evaluate(async () => {
                    await new Promise((resolve, reject) => {
                        let totalHeight = 0
                        let distance = 100
                        let timer = setInterval(() => {
                            let scrollHeight = document.body.scrollHeight
                            window.scrollBy(0, distance)
                            totalHeight += distance
                            if (totalHeight >= scrollHeight) {
                                clearInterval(timer)
                                resolve()
                            }
                        }, 100)
                    })
                })
            }
            autoScroll(page).catch(function (error) {});
            // 画面キャプチャーを取得するまでの待機秒数が設定されていれば待機する
            if (waitsec != '') {
                await page.waitFor(waitsec * 1000);
            }
            for (const index in outputs) {
                const output = outputs[index];
                const path = `${dirPath}/${target}_${now}.${output}`
                if (output == 'png') {
                    // 画面キャプチャ（png形式）
                    await page.screenshot({ path: path, fullPage: true });
                } else if(output == 'pdf') {
                    // 画面キャプチャ（pdf形式でA4の大きさで）
                    await page.pdf({ path: path, fullPage: true, format: 'A4' });
                }
            }
        }
        await console.log('query-DONE');

    }
    // ブラウザクローズ
    await page.close();
    await browser.close();
    await console.log('FINISH');

})();