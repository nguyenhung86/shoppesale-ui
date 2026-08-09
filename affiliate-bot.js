import { getApi, autoLogin, clearSession, isLoggedIn, loginWithQR, extractCredentials } from "./src/core/zalo-client.js";
import { saveCredentials } from "./src/core/credentials.js";
import { addAccount } from "./src/core/accounts.js";
import { displayQR, getQRPath } from "./src/utils/qr-display.js";
import { startQrServer } from "./src/utils/qr-http-server.js";
import fs, { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from "fs";
import crypto from "crypto";
import path, { resolve, join } from "path";
import { chromium } from "playwright";
import express from "express";
import { getMachineId, validateLicenseKey } from "./src/utils/license.js";

const CONFIG_FILE = "./affiliate-config.json";
const groupInfoCache = {};
const productCache = new Map(); // Cache để tránh gọi trùng lặp Shopee API
let isBlockedByCaptcha = false;
let lastCaptchaReloadTime = 0;

function saveClickLog(logData) {
    try {
        appendFileSync('clicks_log.jsonl', JSON.stringify(logData) + '\n', 'utf8');
        console.log(`-> Đã lưu log click của user ${logData.zalo_user_id} vào clicks_log.jsonl`);
    } catch (err) {
        console.error(`[Log Click] Lỗi ghi file clicks_log.jsonl: ${err.message}`);
    }
}

function isTargetGroup(groupId) {
    return true;
}
const DEFAULT_USERS_FILE = "zalo_users.csv";

const savedUsersByFile = new Map();

function loadUsersFromFile(fileName) {
    const set = new Set();
    if (existsSync(fileName)) {
        try {
            const content = readFileSync(fileName, "utf-8");
            const lines = content.split("\n");
            // Bỏ qua dòng tiêu đề cột đầu tiên
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const parts = line.split(",");
                if (parts[0]) {
                    // Làm sạch BOM, dấu =, dấu ngoặc kép để trích xuất ID thuần
                    const id = parts[0]
                        .replace(/^\uFEFF/, "")
                        .replace(/=/g, "")
                        .replace(/"/g, "")
                        .trim();
                    if (id) set.add(id);
                }
            }
            console.log(`-> Đã tải ${set.size} người dùng duy nhất từ ${fileName}`);
        } catch (e) {
            console.error(`[Khởi tạo User] Lỗi đọc file ${fileName}: ${e.message}`);
        }
    }
    savedUsersByFile.set(fileName, set);
}

// Tải danh sách user đã lưu từ trước của các file để tránh trùng lặp khi khởi động lại bot
loadUsersFromFile(DEFAULT_USERS_FILE);
loadUsersFromFile("zalo_users_2001332429948371738.csv");
loadUsersFromFile("zalo_users_792555261028526883.csv");

function saveUniqueUser(userId, userName, groupId) {
    if (!userId || userId === "unknown") return;

    const targetFile = isTargetGroup(groupId) ? `zalo_users_${groupId}.csv` : DEFAULT_USERS_FILE;
    let savedUsers = savedUsersByFile.get(targetFile);
    if (!savedUsers) {
        savedUsers = new Set();
        savedUsersByFile.set(targetFile, savedUsers);
    }

    if (savedUsers.has(userId)) return;

    try {
        const fileExists = existsSync(targetFile);
        const header = "\uFEFFZalo User ID,Tên hiển thị\n";
        const cleanName = (userName || "Thành viên").replace(/"/g, '""');
        
        // Sử dụng định dạng CSV tiêu chuẩn để Excel phân cột chính xác và giữ nguyên phông chữ
        const line = `"${userId}","${cleanName}"\n`;
        
        if (!fileExists) {
            writeFileSync(targetFile, header + line, "utf8");
        } else {
            appendFileSync(targetFile, line, "utf8");
        }
        
        savedUsers.add(userId);
        console.log(`-> Đã lưu user mới vào Excel (CSV) [${targetFile}]: ${userName} (${userId})`);

        // Đồng bộ tự động thành viên/người dùng mới lên Google Sheet qua Apps Script Web App
        try {
            if (config && config.orderAppsScriptUrl) {
                fetch(config.orderAppsScriptUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'register_user',
                        token: 'DongChau@Secure2026',
                        userId: String(userId),
                        userName: String(userName || "Thành viên")
                    })
                }).then(res => res.json()).then(resJson => {
                    if (resJson && resJson.success) {
                        console.log(`-> [Sync Sheet] Đã đồng bộ thành viên mới ${userName} (${userId}) lên Google Sheet!`);
                    }
                }).catch(() => {});
            }
        } catch (e) {}
    } catch (err) {
        console.error(`[Lưu User] Lỗi ghi file ${targetFile}: ${err.message}`);
    }
}

function logInboxWelcome(msg) {
    console.log(msg);
    try {
        const timeStr = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
        const logLine = `[${timeStr}] ${msg}\n`;
        appendFileSync("inbox_welcome.log", logLine, "utf-8");
    } catch (e) {}
}

async function triggerInboxWelcome(inboxApi, inboxConfig, userId, userName, groupName) {
    if (!inboxApi || !userId) return;
    const cleanName = String(userName || "").replace(/[^a-zA-Z0-9ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơư\s]/g, "").trim().split(" ").pop() || "bạn";
    const delayMin = inboxConfig.minDelaySeconds || 4;
    const delayMax = inboxConfig.maxDelaySeconds || 8;

    logInboxWelcome(`✉️ [Inbox Welcome] Bắt đầu tiến trình gửi tin nhắn chào mừng cá nhân cho thành viên mới: ${userName} (UID: ${userId})`);

    const initialDelay = Math.floor(Math.random() * (delayMax - delayMin + 1) + delayMin) * 1000;
    await new Promise(r => setTimeout(r, initialDelay));

    try {
        if (inboxConfig.steps && inboxConfig.steps.length > 0) {
            for (let i = 0; i < inboxConfig.steps.length; i++) {
                const step = inboxConfig.steps[i];
                if (step.text) {
                    try {
                        let text = step.text.replace(/{name}/g, cleanName).replace(/{groupName}/g, groupName);
                        
                        try {
                            await inboxApi.sendTypingEvent(userId, 0);
                            await new Promise(r => setTimeout(r, 3000));
                        } catch(e){}
                        
                        await inboxApi.sendMessage({ msg: text }, userId, 0);
                        logInboxWelcome(`✉️ [Inbox Welcome] Đã gửi tin nhắn riêng bước ${i + 1}/${inboxConfig.steps.length} cho ${userName} thành công.`);
                    } catch (e) {
                        logInboxWelcome(`❌ [Inbox Welcome] Lỗi khi gửi tin nhắn riêng bước ${i + 1}: ${e.message}`);
                    }
                }
                
                if (step.image && existsSync(step.image)) {
                    try {
                        await new Promise(r => setTimeout(r, 1000));
                        logInboxWelcome(`✉️ [Inbox Welcome] Đang gửi ảnh hướng dẫn bước ${i + 1}: ${step.image}...`);
                        await inboxApi.sendMessage({ msg: "", attachments: [resolve(step.image)] }, userId, 0);
                        logInboxWelcome(`✉️ [Inbox Welcome] Gửi ảnh hướng dẫn thành công.`);
                    } catch (e) {
                        logInboxWelcome(`❌ [Inbox Welcome] Lỗi khi gửi ảnh bước ${i + 1}: ${e.message}`);
                    }
                }
                
                const stepDelay = Math.floor(Math.random() * (delayMax - delayMin + 1) + delayMin) * 1000;
                await new Promise(r => setTimeout(r, stepDelay));
            }
        }
    } catch (err) {
        logInboxWelcome(`❌ [Inbox Welcome] Lỗi gửi inbox chào mừng thành viên mới: ${err.message}`);
    }
}

async function syncCsvMembersToSheet(config) {
    if (!config || !config.orderAppsScriptUrl) return;
    const mainGroupId = config.tiktokGroupId || config.scheduler?.targetGroupId || "2001332429948371738";
    const csvFile = `zalo_users_${mainGroupId}.csv`;
    if (!existsSync(csvFile)) return;

    try {
        const csvContent = readFileSync(csvFile, "utf8");
        const lines = csvContent.split("\n").filter(l => l.trim());
        const users = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].replace(/\r/g, "");
            const parts = line.split(",");
            if (parts.length >= 2) {
                const uid = parts[0].replace(/["\uFEFF]/g, "").trim();
                const name = parts[1].replace(/["\uFEFF]/g, "").trim();
                if (uid && name) users.push({ userId: uid, userName: name });
            }
        }

        if (users.length === 0) return;
        console.log(`🤖 [Đồng bộ CSV -> Sheet] Đang quét và tự động đẩy ${users.length} thành viên trong file ${csvFile} lên Google Sheet...`);

        let pushedCount = 0;
        for (let i = 0; i < users.length; i += 15) {
            const batch = users.slice(i, i + 15);
            const promises = batch.map(u => 
                fetch(config.orderAppsScriptUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'register_user',
                        token: 'DongChau@Secure2026',
                        userId: String(u.userId),
                        userName: String(u.userName)
                    })
                }).then(r => r.json()).catch(() => ({ success: false }))
            );
            const results = await Promise.all(promises);
            results.forEach(r => { if (r && r.success) pushedCount++; });
            await new Promise(res => setTimeout(res, 100));
        }
        if (pushedCount > 0) {
            console.log(`✅ [Đồng bộ CSV -> Sheet] Đã đẩy thành công thêm ${pushedCount} thành viên từ file ${csvFile} lên Google Sheet!`);
        }
    } catch (err) {
        console.error(`❌ [Đồng bộ CSV -> Sheet] Lỗi: ${err.message}`);
    }
}

async function syncGroupMembersToCsv(api, config) {
    const mainGroupId = config.tiktokGroupId || config.scheduler?.targetGroupId || "2001332429948371738";
    console.log(`🤖 [Đồng bộ] Bắt đầu đồng bộ danh sách thành viên nhóm ${mainGroupId} lên Google Sheet & CSV...`);
    try {
        const groupInfo = await api.getGroupInfo(mainGroupId);
        const gridInfo = groupInfo?.gridInfoMap?.[mainGroupId] || groupInfo?.[mainGroupId];
        let memberUids = [];
        if (gridInfo?.memVerList) {
            memberUids = gridInfo.memVerList.map(item => item.split("_")[0]);
        } else if (gridInfo?.memberIds) {
            memberUids = Object.keys(gridInfo.memberIds);
        }
        
        if (memberUids.length === 0) {
            console.log(`🤖 [Đồng bộ] Không lấy được danh sách thành viên nhóm hoặc nhóm trống.`);
            await syncCsvMembersToSheet(config);
            return;
        }
        
        console.log(`🤖 [Đồng bộ] Tìm thấy ${memberUids.length} thành viên trong nhóm.`);
        
        const targetFile = `zalo_users_${mainGroupId}.csv`;
        let savedUsers = savedUsersByFile.get(targetFile);
        if (!savedUsers) {
            loadUsersFromFile(targetFile);
            savedUsers = savedUsersByFile.get(targetFile);
        }
        
        let newUsersCount = 0;
        for (let i = 0; i < memberUids.length; i += 30) {
            const batch = memberUids.slice(i, i + 30);
            try {
                const res = await api.getGroupMembersInfo(batch, mainGroupId);
                const profiles = res?.profiles || res || {};
                for (const [uid, p] of Object.entries(profiles)) {
                    const dispName = p.displayName || p.zaloName || "Thành viên";
                    saveUniqueUser(uid, dispName, mainGroupId);
                    newUsersCount++;
                }
            } catch (err) {
                console.error(`🤖 [Đồng bộ] Lỗi quét lô thành viên:`, err.message);
            }
            await new Promise(r => setTimeout(r, 100));
        }
        console.log(`🤖 [Đồng bộ] Hoàn thành đồng bộ Zalo Live! Đã ghi nhận và đẩy ${newUsersCount} thành viên lên Google Sheet & CSV.`);
        
        // Tự động quét và đẩy nốt 100% tất cả thành viên trong file CSV lên Google Sheet
        await syncCsvMembersToSheet(config);
    } catch (e) {
        console.error(`🤖 [Đồng bộ] Lỗi trong quá trình quét đồng bộ: ${e.message}`);
        await syncCsvMembersToSheet(config);
    }
}

function cleanNameString(str) {
    if (!str) return "";
    return String(str)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

function isReferralActive() {
    return true; // Áp dụng chương trình giới thiệu 10.000đ
}

function saveMemberJoinDate(userId) {
    if (!userId || userId === "unknown") return;
    let joinDates = {};
    if (existsSync("member_join_dates.json")) {
        try {
            joinDates = JSON.parse(readFileSync("member_join_dates.json", "utf8"));
        } catch (e) {}
    }
    if (!joinDates[userId]) {
        joinDates[userId] = Date.now();
        try {
            writeFileSync("member_join_dates.json", JSON.stringify(joinDates, null, 2), "utf8");
            console.log(`🤖 [Join Tracker] Đã lưu ngày gia nhập cho thành viên mới Zalo UID: ${userId}`);
        } catch (e) {
            console.error("Lỗi ghi file member_join_dates.json:", e);
        }
    }
}

async function findGroupMemberByName(api, groupId, targetName) {
    try {
        const groupInfo = await api.getGroupInfo(groupId);
        const gridInfo = groupInfo?.gridInfoMap?.[groupId] || groupInfo?.[groupId];
        let memberUids = [];
        if (gridInfo?.memVerList) {
            memberUids = gridInfo.memVerList.map(item => item.split("_")[0]);
        } else if (gridInfo?.memberIds) {
            memberUids = Object.keys(gridInfo.memberIds);
        }
        
        if (memberUids.length === 0) return null;
        
        const targetClean = cleanNameString(targetName);
        if (!targetClean) return null;
        
        const matches = [];
        for (let i = 0; i < memberUids.length; i += 30) {
            const batch = memberUids.slice(i, i + 30);
            try {
                const res = await api.getGroupMembersInfo(batch, groupId);
                const profiles = res?.profiles || res || {};
                for (const [uid, p] of Object.entries(profiles)) {
                    const dispName = p.displayName || p.zaloName || "";
                    const cleanDispName = cleanNameString(dispName);
                    
                    if (cleanDispName === targetClean) {
                        return { id: uid, name: dispName };
                    }
                    if (cleanDispName.includes(targetClean)) {
                        matches.push({ id: uid, name: dispName });
                    }
                }
            } catch (errBatch) {}
        }
        
        if (matches.length === 1) {
            return matches[0];
        } else if (matches.length > 1) {
            return { id: "multiple", name: targetName };
        }
        return null;
    } catch (e) {
        console.error(`[Referral] Lỗi khi tìm thành viên "${targetName}":`, e.message);
        return null;
    }
}

function getShopItemId(url) {
    try {
        const urlObj = new URL(url);
        let shopid = "";
        let itemid = "";

        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        if (pathParts.length >= 2) {
            const last = pathParts[pathParts.length - 1];
            const prev = pathParts[pathParts.length - 2];
            if (/^\d+$/.test(last) && /^\d+$/.test(prev)) {
                shopid = prev;
                itemid = last;
            }
        }

        if (!shopid || !itemid) {
            const patterns = [
                /-i\.(\d+)\.(\d+)/,
                /\/product\/(\d+)\/(\d+)/,
                /shopid=(\d+).*itemid=(\d+)/,
                /itemid=(\d+).*shopid=(\d+)/,
                /\/(?:product|opaanlp)\/(\d+)\/(\d+)/
            ];

            for (const p of patterns) {
                const m = url.match(p);
                if (!m) continue;

                if (p.toString().includes("itemid")) {
                    shopid = m[2];
                    itemid = m[1];
                } else {
                    shopid = m[1];
                    itemid = m[2];
                }
                break;
            }
        }

        if (shopid && itemid) {
            return { shopid, itemid };
        }
    } catch (e) {
        // Ignored
    }
    return null;
}

async function getProductDetailsViaShopeeApi(originUrl, appId, secretKey) {
    const endpoint = "https://open-api.affiliate.shopee.vn/api/v1/graphql";
    const payload = {
        query: `query {
            productOfferV2(keyword: "${originUrl}", limit: 1) {
                nodes {
                    productName
                    price
                    priceMin
                    priceMax
                    commissionRate
                    imageUrl
                }
            }
        }`
    };

    const timestamp = Math.floor(Date.now() / 1000);
    const bodyStr = JSON.stringify(payload);
    const factor = `${appId}${timestamp}${bodyStr}${secretKey}`;
    const signature = crypto.createHash("sha256").update(factor).digest("hex");

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `SHA256 Credential=${appId},Timestamp=${timestamp},Signature=${signature}`
        },
        body: bodyStr
    });

    const result = await response.json();
    if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
    }

    const node = result.data?.productOfferV2?.nodes?.[0];
    if (!node) {
        throw new Error("Không tìm thấy sản phẩm qua Shopee Open API");
    }

    return {
        name: node.productName,
        price: parseFloat(node.price) / 100000,
        price_min: parseFloat(node.priceMin) / 100000,
        price_max: parseFloat(node.priceMax) / 100000,
        commission_rate: parseFloat(node.commissionRate),
        imageUrl: node.imageUrl
    };
}

async function getProductDetailsViaCookie(shopid, itemid, cookie) {
    const api = `https://shopee.vn/api/v4/item/get?shopid=${shopid}&itemid=${itemid}`;
    
    const response = await fetch(api, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Referer": `https://shopee.vn/product/${shopid}/${itemid}`,
            "Cookie": cookie
        },
        signal: AbortSignal.timeout(10000)
    });

    if (response.status === 403) {
        throw new Error("Cookie đã hết hạn hoặc bị Shopee chặn (Lỗi 403)");
    }

    if (response.status !== 200) {
        throw new Error(`Shopee API phản hồi lỗi: ${response.status}`);
    }

    const resJson = await response.json();
    const item = resJson.data;
    if (!item) {
        throw new Error(resJson.error_msg || "Không lấy được dữ liệu sản phẩm (data rỗng)");
    }

    return {
        name: item.name,
        price: item.price / 100000,
        price_min: item.price_min / 100000,
        price_max: item.price_max / 100000,
        price_before_discount: item.price_before_discount / 100000,
        imageUrl: item.image
    };
}

async function getProductDetailsViaLichSuGia(shopid, itemid) {
    const api = `https://base.lichsugia.net/api/public/products/platform/${shopid}/${itemid}`;
    const triggerUrl = `https://lichsugia.net/product/a-i.${shopid}.${itemid}`;
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
    };

    console.log("-> Gọi API Lịch Sử Giá kiểm tra sản phẩm...");
    let response = await fetch(api, { headers, signal: AbortSignal.timeout(6000) }).catch(() => null);

    if (response && response.status === 200) {
        const resJson = await response.json();
        if (resJson && resJson.price > 0) {
            return {
                name: resJson.name,
                price: resJson.price,
                price_min: resJson.price_min,
                price_max: resJson.price_max,
                price_before_discount: resJson.price_before_discount,
                imageUrl: resJson.image
            };
        }
    }

    // Nếu sản phẩm chưa tồn tại (404), kích hoạt cào ngầm
    console.log("-> Sản phẩm chưa có trên Lịch Sử Giá. Đang kích hoạt cào ngầm...");
    fetch(triggerUrl, {
        headers: {
            "User-Agent": headers["User-Agent"],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8"
        }
    }).catch(() => {}); // Yêu cầu fire-and-forget không chặn luồng

    // Chờ 4 giây để hệ thống Lịch Sử Giá cào dữ liệu
    console.log("   Chờ 4 giây để Lịch Sử Giá xử lý...");
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Thử lại lần hai
    console.log("-> Thử lại API Lịch Sử Giá lần 2...");
    response = await fetch(api, { headers, signal: AbortSignal.timeout(6000) }).catch(() => null);
    if (response && response.status === 200) {
        const resJson = await response.json();
        if (resJson && resJson.price > 0) {
            console.log("-> Lấy giá thành công ở lần thử thứ 2!");
            return {
                name: resJson.name,
                price: resJson.price,
                price_min: resJson.price_min,
                price_max: resJson.price_max,
                price_before_discount: resJson.price_before_discount,
                imageUrl: resJson.image
            };
        }
    }

    throw new Error("Sản phẩm không có trên Lịch Sử Giá hoặc chưa hoàn tất cào ngầm");
}

let cdpBrowser = null;
let cdpPage = null;
let cdpKeepAliveInterval = null;
let isCdpBusy = false;

function startCDPKeepAlive(port = 9222) {
    if (cdpKeepAliveInterval) return;

    console.log("-> Khởi động cơ chế giữ ấm tab Shopee (Keep-alive) với thời gian ngẫu nhiên (4 - 7 phút)...");
    
    async function keepAliveLoop() {
        if (isCdpBusy) {
            console.log("[Keep-alive] Bot đang bận xử lý sản phẩm. Bỏ qua lượt làm mới này.");
            // Lên lịch lại sau 1 phút nếu bận
            cdpKeepAliveInterval = setTimeout(keepAliveLoop, 60000);
            return;
        }

        if (cdpPage) {
            try {
                isCdpBusy = true;
                await cdpPage.title();
                const currentUrl = cdpPage.url();
                console.log("[Keep-alive] Đang làm mới tab Shopee để giữ ấm phiên...");
                
                if (currentUrl.includes("affiliate.shopee.vn")) {
                    await cdpPage.reload({ waitUntil: "commit", timeout: 10000 });
                } else {
                    await cdpPage.goto("https://affiliate.shopee.vn/offer/product_offer", { waitUntil: "commit", timeout: 15000 });
                }
                console.log("[Keep-alive] Đã giữ ấm phiên Shopee thành công!");
            } catch (e) {
                console.log(`[Keep-alive] Lỗi làm mới tab Shopee: ${e.message}`);
                cdpBrowser = null;
                cdpPage = null;
                cdpKeepAliveInterval = null;
                return; // Dừng vòng lặp để connectToCDP tạo lại ở lượt sau
            } finally {
                isCdpBusy = false;
            }
        }
        
        // Thời gian ngẫu nhiên từ 4 đến 7 phút
        const nextDelay = (Math.floor(Math.random() * 4) + 4) * 60 * 1000 + Math.floor(Math.random() * 60000);
        console.log(`[Keep-alive] Lượt giữ ấm tiếp theo sẽ diễn ra sau ${(nextDelay / 60000).toFixed(1)} phút.`);
        cdpKeepAliveInterval = setTimeout(keepAliveLoop, nextDelay);
    }

    // Bắt đầu vòng lặp giữ ấm sau 5 phút ban đầu
    cdpKeepAliveInterval = setTimeout(keepAliveLoop, 5 * 60 * 1000);
}

async function isPageShowingCaptcha(page) {
    try {
        const url = page.url();
        if (url.includes("/verify/") || url.includes("captcha") || url.includes("yoda") || url.includes("/universal-link/")) {
            console.log(`-> isPageShowingCaptcha: Khớp URL Captcha: ${url}`);
            return true;
        }

        const selectors = [
            'iframe[src*="captcha"]',
            'iframe[src*="verify"]',
            'iframe[src*="yoda"]',
            '.shopee-captcha',
            '.shopee-security-verify',
            '#yoda-modal-outer',
            '.yoda-modal',
            '.slider-verify',
            '.sc-captcha-container'
        ];
        
        for (const s of selectors) {
            const el = await page.$(s);
            if (el) {
                const visible = await el.isVisible().catch(() => false);
                if (visible) {
                    console.log(`-> isPageShowingCaptcha: Khớp Selector Captcha hiển thị: ${s}`);
                    return true;
                }
            }
        }
    } catch (e) {
        // Bỏ qua
    }
    return false;
}

let captchaIntervalId = null;
function startCaptchaChecker(page) {
    if (captchaIntervalId) {
        clearInterval(captchaIntervalId);
    }
    captchaIntervalId = setInterval(async () => {
        if (!isBlockedByCaptcha) return;
        
        try {
            const showing = await isPageShowingCaptcha(page);
            if (!showing) {
                console.log("-> CDP: Phát hiện Captcha đã được giải (hoặc biến mất)! Tự động tiếp tục hoạt động...");
                isBlockedByCaptcha = false;
            } else {
                // Tự động F5 / Reload trang nếu có thông báo lỗi tải Captcha từ Shopee (chờ ít nhất 8 giây giữa các lần reload)
                const now = Date.now();
                if (now - lastCaptchaReloadTime > 8000) {
                    const errorIndicators = [
                        'text="Lỗi tải"',
                        'text="sự có tải"',
                        'text="sự cố tải"',
                        'text="Thử Lại"',
                        'text="Thử lại"',
                        'text="Retry"',
                        '.yoda-btn'
                    ];
                    let hasError = false;
                    
                    // Kiểm tra lỗi ở trang chính và trong toàn bộ các iframes (rất quan trọng vì Captcha thường nằm trong iframe)
                    const frames = [page, ...page.frames()];
                    for (const frame of frames) {
                        for (const sel of errorIndicators) {
                            try {
                                const el = frame.locator(sel).first();
                                if (el && await el.isVisible().catch(() => false)) {
                                    console.log(`-> CDP: Phát hiện lỗi tải Captcha (${sel}) trong frame: ${frame.url()}`);
                                    hasError = true;
                                    break;
                                }
                            } catch (e) {}
                        }
                        if (hasError) break;
                    }
                    
                    if (hasError) {
                        console.log("-> CDP: Phát hiện Captcha bị lỗi tải. Đang tiến hành reload (F5) trang...");
                        lastCaptchaReloadTime = now;
                        await page.reload({ waitUntil: "commit", timeout: 10000 }).catch(async () => {
                            // Fallback reload dùng JS
                            await page.evaluate(() => { window.location.reload(); }).catch(() => {});
                        });
                    }
                }
            }
        } catch (e) {
            // Bỏ qua
        }
    }, 2000); // Kiểm tra mỗi 2 giây
}

async function connectToCDP(port = 9222) {
    if (cdpBrowser && cdpPage) {
        try {
            await cdpPage.title();
            // Đảm bảo checker luôn chạy trên tab hoạt động
            startCaptchaChecker(cdpPage);
            return { browser: cdpBrowser, page: cdpPage };
        } catch (e) {
            console.log("-> Kết nối CDP cũ đã mất hiệu lực. Đang tạo kết nối mới...");
            cdpBrowser = null;
            cdpPage = null;
        }
    }

    try {
        console.log(`-> Đang kết nối tới Chrome qua CDP trên cổng ${port}...`);
        cdpBrowser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
        console.log("✅ Đã kết nối thành công tới Chrome qua CDP!");

        const contexts = cdpBrowser.contexts();
        if (contexts.length === 0) {
            throw new Error("Không tìm thấy browser context nào. Hãy chắc chắn Chrome đang hoạt động.");
        }
        const context = contexts[0];
        const pages = context.pages();

        for (const p of pages) {
            const url = p.url();
            if (url.includes("affiliate.shopee.vn") || url.includes("shopee.vn/verify/") || url.includes("captcha")) {
                cdpPage = p;
                console.log(`-> Sử dụng lại tab Shopee đang mở: ${url}`);
                break;
            }
        }

        if (!cdpPage) {
            console.log("-> Không tìm thấy tab Shopee Affiliate nào. Đang mở tab mới...");
            cdpPage = await context.newPage();
        }

        // Ẩn danh thuộc tính webdriver trên tab CDP
        try {
            await cdpPage.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            });
            await cdpPage.evaluate(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            });
        } catch (e) {
            // Bỏ qua
        }

        // startCDPKeepAlive(port); // Vô hiệu hóa Keep-alive định kỳ để tránh captcha
        
        // Bắt đầu kiểm tra trạng thái Captcha tự động
        startCaptchaChecker(cdpPage);

        return { browser: cdpBrowser, page: cdpPage };
    } catch (err) {
        cdpBrowser = null;
        cdpPage = null;
        throw new Error(`Không thể kết nối tới Chrome debug (Port ${port}): ${err.message}. Hãy chạy chrome.exe --remote-debugging-port=${port} trước.`);
    }
}

function parseShopeeAffiliateResponse(json) {
    if (!json) return null;
    
    // 1. REST API /api/v3/offer/product response format
    if (json.data && json.data.item_id) {
        const item = json.data.batch_item_for_item_card_full || {};
        const name = item.name || json.data.product_name || "";
        
        const rawPrice = item.price || json.data.price || 0;
        const rawPriceMin = item.price_min || json.data.price_min || rawPrice;
        const rawPriceMax = item.price_max || json.data.price_max || rawPrice;
        const rawPriceBeforeDiscount = item.price_before_discount || 0;
        
        const price = parseFloat(rawPrice) / 100000;
        const priceMin = parseFloat(rawPriceMin) / 100000;
        const priceMax = parseFloat(rawPriceMax) / 100000;
        const priceBeforeDiscount = parseFloat(rawPriceBeforeDiscount) / 100000;
        
        const detail = json.data.commission_rate_detail || {};
        const shopeeDetail = detail.shopee_commission_detail || {};
        const sellerDetail = detail.seller_commission_detail || {};
        
        let shopeeRate = shopeeDetail.social_media_item_base_exist_commission_rate || 
                        shopeeDetail.social_media_item_base_new_commission_rate || 
                        shopeeDetail.social_media_shop_base_exist_commission_rate || 
                        shopeeDetail.social_media_shop_base_new_commission_rate || 
                        shopeeDetail.social_media_check_out_base_exist_commission_rate || 
                        shopeeDetail.social_media_check_out_base_new_commission_rate || 
                        detail.shopee_commission_rate || 
                        detail.default_commission_rate || 0;
        
        let sellerRate = sellerDetail.social_media_item_exist_commission_rate || 
                        sellerDetail.social_media_item_new_commission_rate || 
                        sellerDetail.social_media_shop_exist_commission_rate || 
                        sellerDetail.social_media_shop_new_commission_rate || 
                        sellerDetail.social_media_default_exist_commission_rate || 
                        sellerDetail.social_media_default_new_commission_rate || 
                        detail.seller_commission_rate || 0;
        
        let rate = (shopeeRate + sellerRate) / 1000;
        
        if (rate <= 0) {
            const strRate = json.data.commission_rate?.max_commission_rate || "0%";
            rate = parseFloat(strRate.replace(/,/g, ".").replace(/%/g, "")) || 0;
        }
        
        const rawCap = detail.commission_cap !== undefined ? detail.commission_cap : (json.data.commission_rate?.commission_cap || 5000000000);
        const cap = parseFloat(rawCap) / 100000;
        
        return {
            name,
            price,
            price_min: priceMin,
            price_max: priceMax,
            price_before_discount: priceBeforeDiscount,
            commission_rate: rate,
            shopee_rate: shopeeRate > 0 ? shopeeRate / 1000 : 0,
            seller_rate: sellerRate > 0 ? sellerRate / 1000 : 0,
            commission_cap: cap,
            imageUrl: item.image || json.data.product_image || ""
        };
    }
    
    // 2. GraphQL /api/v3/gql response format
    let found = null;
    function search(obj) {
        if (found) return;
        if (!obj || typeof obj !== "object") return;

        const name = obj.productName || obj.itemName || obj.name;
        const rate = obj.commissionRate || obj.commission_rate || obj.commissionPercent || obj.commission_rate_percent || obj.totalCommissionRate;
        const price = obj.price || obj.priceMin || obj.price_min || obj.priceMax;
        const cap = obj.commissionCap || obj.commission_cap || obj.commissionCapValue || (obj.commissionRateDetail && (obj.commissionRateDetail.commissionCap || obj.commissionRateDetail.commission_cap));

        if (name && rate !== undefined && price !== undefined) {
            let finalPrice = parseFloat(price);
            let finalPriceMin = parseFloat(obj.priceMin || obj.price_min || price);
            let finalPriceMax = parseFloat(obj.priceMax || obj.price_max || price);
            
            if (finalPrice > 100000000) {
                finalPrice = finalPrice / 100000;
                finalPriceMin = finalPriceMin / 100000;
                finalPriceMax = finalPriceMax / 100000;
            }

            let finalCap = parseFloat(cap !== undefined ? cap : 5000000000);
            if (finalCap > 1000000) {
                finalCap = finalCap / 100000;
            }

            found = {
                name: String(name),
                price: finalPrice,
                price_min: finalPriceMin,
                price_max: finalPriceMax,
                price_before_discount: parseFloat(obj.priceBeforeDiscount || obj.price_before_discount || 0) / 100000,
                commission_rate: parseFloat(rate),
                commission_cap: finalCap,
                imageUrl: obj.imageUrl || obj.image || obj.productImage || ""
            };
            return;
        }

        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                search(obj[key]);
            }
        }
    }
    search(json);
    return found;
}

// ============================================================
// CHROME EXTENSION SYNC SERVER (EXPRESS)
// ============================================================
let taskIdCounter = 0;
const pendingTasks = new Map(); // id -> { resolve, reject, url, timestamp }
const taskQueue = []; // array of { id, url }
let lastExtensionActiveTime = 0;

let isSyncingAllOrders = false;

async function syncAllOrdersCache(config) {
    if (isSyncingAllOrders) return;
    isSyncingAllOrders = true;
    console.log("🔄 [VPS ORDER SYNC] Bắt đầu quét và đồng bộ 100% đơn hàng thành viên ngầm...");
    try {
        let allOrders = [];
        if (fs.existsSync("tiktok_registered_orders.json")) {
            try {
                const localOrders = JSON.parse(fs.readFileSync("tiktok_registered_orders.json", "utf8"));
                if (Array.isArray(localOrders)) allOrders.push(...localOrders);
            } catch(e) {}
        }

        if (config && config.orderAppsScriptUrl && fs.existsSync("sheet_users_backup.json")) {
            const sheetData = JSON.parse(fs.readFileSync("sheet_users_backup.json", "utf8"));
            const users = (sheetData && sheetData.data) ? sheetData.data : ((sheetData && sheetData.users) ? sheetData.users : []);
            const userIdsToFetch = users.map(u => u.userId).filter(Boolean);

            const batchSize = 10;
            for (let i = 0; i < userIdsToFetch.length; i += batchSize) {
                const chunk = userIdsToFetch.slice(i, i + batchSize);
                const fetchPromises = chunk.map(async (uid) => {
                    try {
                        const targetUrl = `${config.orderAppsScriptUrl}?action=unifiedSearch&query=${encodeURIComponent(uid)}`;
                        const response = await fetch(targetUrl);
                        const json = await response.json();
                        if (json && json.success && Array.isArray(json.data)) {
                            return json.data.map(ord => ({
                                ...ord,
                                subId: uid,
                                zaloId: uid,
                                userId: uid
                            }));
                        }
                    } catch(e) {}
                    return [];
                });
                const results = await Promise.all(fetchPromises);
                results.forEach(list => allOrders.push(...list));
                await new Promise(r => setTimeout(r, 150));
            }
        }

        const uniqueOrders = [];
        const seenMap = new Set();
        for (let o of allOrders) {
            const id = o.orderId || o.id;
            if (id && !seenMap.has(id)) {
                seenMap.add(id);
                // Nhận diện sàn dựa vào mã đơn nếu chưa có
                if (!o.platform) {
                    const idStr = String(id).trim();
                    if (/^\d{18,20}$/.test(idStr)) {
                        o.platform = "TikTok";
                    } else if (/^\d{13,17}$/.test(idStr)) {
                        o.platform = "Lazada";
                    } else {
                        o.platform = "Shopee";
                    }
                }
                uniqueOrders.push(o);
            }
        }

        uniqueOrders.sort((a, b) => {
            const dateA = new Date(a.orderDate || 0).getTime();
            const dateB = new Date(b.orderDate || 0).getTime();
            return dateB - dateA;
        });

        fs.writeFileSync("all_orders_cache.json", JSON.stringify({ timestamp: Date.now(), data: uniqueOrders }), "utf8");
        console.log(`✅ [VPS ORDER SYNC] Đã đồng bộ xong ${uniqueOrders.length} đơn hàng vào all_orders_cache.json!`);
    } catch(e) {
        console.error("Lỗi đồng bộ ngầm đơn hàng:", e.message);
    } finally {
        isSyncingAllOrders = false;
    }
}

function startExpressServer(config) {
    const app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    app.use('/bills', express.static('bills'));
    app.use(express.static('bills'));

    // Phục vụ trực tiếp ảnh bill dạng /bill_...
    app.use((req, res, next) => {
        if (req.path.startsWith('/bill_')) {
            const fileName = path.basename(req.path);
            const fullPath = path.join(process.cwd(), 'bills', fileName);
            if (fs.existsSync(fullPath)) {
                return res.sendFile(fullPath);
            }
        }
        next();
    });

    // Chạy đồng bộ đơn ngầm trên VPS khi khởi động 
    setTimeout(() => syncAllOrdersCache(config), 3000);
    
    // Đồng bộ định kỳ 30 phút/lần, nhưng CHỈ HOẠT ĐỘNG TRONG KHUNG GIỜ 08:00 - 10:00 SÁNG
    setInterval(() => {
        const vnTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
        const hour = vnTime.getHours();
        if (hour >= 8 && hour < 10) {
            syncAllOrdersCache(config);
        }
    }, 30 * 60 * 1000);

    // Tự động đồng bộ đơn hàng bất cứ khi nào file sheet_users_backup.json được cập nhật 
    // (tức là khi sếp chạy lệnh /dongbo trên bot Zalo chính)
    if (fs.existsSync("sheet_users_backup.json")) {
        fs.watchFile("sheet_users_backup.json", { interval: 5000 }, (curr, prev) => {
            if (curr.mtime > prev.mtime) {
                console.log("🔔 [VPS ORDER SYNC] Lệnh /dongbo vừa được kích hoạt! Tự động quét cập nhật đơn hàng...");
                syncAllOrdersCache(config);
            }
        });
    }

    app.all("/api/web", async (req, res, next) => {
        try {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
            res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

            if (req.method === "OPTIONS") {
                return res.sendStatus(200);
            }

            let reqBody = req.body || {};
            if (typeof reqBody === "string") {
                try { reqBody = JSON.parse(reqBody); } catch(e){}
            }

            const action = req.query.action || reqBody.action;
            
            if (action === "getPayoutList") {
                let usersData = [];
                // Đọc từ file backup do lệnh /dongbo tạo ra
                if (fs.existsSync("sheet_users_backup.json")) {
                    const sheetData = JSON.parse(fs.readFileSync("sheet_users_backup.json", "utf8"));
                    usersData = (sheetData && sheetData.data) ? sheetData.data : ((sheetData && sheetData.users) ? sheetData.users : []);
                }
                
                // Lọc những người có unpaid > 0
                const payoutUsers = usersData.filter(u => (u.unpaid && u.unpaid > 0) || (u.unpaidReferral && u.unpaidReferral > 0));
                return res.json({ success: true, data: payoutUsers });
            } 

            if (action === "getPaymentHistory") {
                const zaloId = req.query.zaloId || req.query.userId || reqBody.zaloId || reqBody.userId;
                if (!zaloId) return res.json({ success: true, data: [] });
                
                try {
                    const response = await fetch(`${config.orderAppsScriptUrl}?action=getPaymentHistory&zaloId=${encodeURIComponent(zaloId)}`);
                    const data = await response.json();
                    return res.json(data);
                } catch(e) {
                    return res.json({ success: false, error: e.message, data: [] });
                }
            }
            
            if (action === "confirm_payout") {
                const { userId, amount, billBase64 } = reqBody;
                const transferAmount = Number(amount);
                
                let billUrl = "";
                if (billBase64 && billBase64.startsWith("data:image/")) {
                    const matches = billBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
                        const buffer = Buffer.from(matches[2], "base64");
                        const now = new Date();
                        const pad = n => String(n).padStart(2, '0');
                        const randomSuffix = Math.random().toString(36).substring(2, 8);
                        const fileName = `bill_${timeStampStr}_${randomSuffix}.${ext}`;
                        if (!fs.existsSync("bills")) {
                            fs.mkdirSync("bills", { recursive: true });
                        }
                        const filePath = path.join("bills", fileName);
                        fs.writeFileSync(filePath, buffer);
                        
                        // Trả về link đẹp hoàn hảo trực tiếp từ hoantienonline.io.vn
                        billUrl = `https://hoantienonline.io.vn/${fileName}`;
                    }
                }

                // Trừ tiền ngay trên VPS (Tốc độ ánh sáng)
                if (fs.existsSync("sheet_users_backup.json")) {
                    let sheetData = JSON.parse(fs.readFileSync("sheet_users_backup.json", "utf8"));
                    let usersList = (sheetData && sheetData.data) ? sheetData.data : ((sheetData && sheetData.users) ? sheetData.users : []);
                    
                    for (let u of usersList) {
                        if (String(u.userId) === String(userId)) {
                            u.unpaid = Math.max(0, (u.unpaid || 0) - transferAmount);
                            u.paid = (u.paid || 0) + transferAmount;
                            break;
                        }
                    }
                    
                    if (sheetData.data) sheetData.data = usersList;
                    else if (sheetData.users) sheetData.users = usersList;
                    
                    fs.writeFileSync("sheet_users_backup.json", JSON.stringify(sheetData, null, 2), "utf8");
                }

                // Bắn ngầm báo cáo lên Google Sheets để đồng bộ dữ liệu gốc
                if (config.orderAppsScriptUrl) {
                    try {
                        fetch(config.orderAppsScriptUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                action: "confirm_payout",
                                userId: userId,
                                amount: transferAmount,
                                billUrl: billUrl,
                                billBase64: billBase64
                            })
                        }).catch(e => console.error("Lỗi báo cáo GG Sheets ngầm:", e));
                    } catch(e) {}
                }

                // Ghi lịch sử payment_history.json trên VPS
                let payHistory = [];
                if (fs.existsSync("payment_history.json")) {
                    try {
                        payHistory = JSON.parse(fs.readFileSync("payment_history.json", "utf8"));
                    } catch (e) {}
                }
                payHistory.push({
                    userId,
                    amount: transferAmount,
                    billUrl,
                    timestamp: new Date().toISOString()
                });
                fs.writeFileSync("payment_history.json", JSON.stringify(payHistory, null, 2), "utf8");

                return res.json({ success: true, billUrl });
            }

            if (action === "getLeaderboard") {
                const month = req.query.month || (req.body && req.body.month);
                const year = req.query.year || (req.body && req.body.year);
                let targetUrl = `${config.orderAppsScriptUrl}?action=getLeaderboard`;
                if (month && year) targetUrl += `&month=${month}&year=${year}`;
                const response = await fetch(targetUrl);
                const data = await response.json();
                return res.json(data);
            }

            if (action === "unifiedSearch") {
                const query = req.query.query || req.query.subId || (req.body && (req.body.query || req.body.subId));
                const date = req.query.date || (req.body && req.body.date);
                let targetUrl = `${config.orderAppsScriptUrl}?action=unifiedSearch&query=${encodeURIComponent(query || "")}`;
                if (date) targetUrl += `&date=${date}`;
                const response = await fetch(targetUrl);
                const data = await response.json();
                return res.json(data);
            }
            
            if (action === "adminLogin") {
                const username = req.query.username || (req.body && req.body.username);
                const password = req.query.password || (req.body && req.body.password);
                const adminCfg = config.adminConfig || { username: "admin", password: "Baophan54@" };
                if (username === adminCfg.username && password === adminCfg.password) {
                    const token = "admin_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
                    return res.json({ success: true, token, username });
                } else {
                    return res.status(401).json({ success: false, error: "Sai tên đăng nhập hoặc mật khẩu Admin!" });
                }
            }

            if (action === "getAdminUsers") {
                let usersData = [];
                if (fs.existsSync("sheet_users_backup.json")) {
                    const sheetData = JSON.parse(fs.readFileSync("sheet_users_backup.json", "utf8"));
                    usersData = (sheetData && sheetData.data) ? sheetData.data : ((sheetData && sheetData.users) ? sheetData.users : []);
                }
                return res.json({ success: true, data: usersData, total: usersData.length });
            }

            if (action === "updateUserBalance") {
                const { userId, unpaid, paid, unpaidReferral, bankBin, bankAcc } = req.body || {};
                if (!userId) return res.status(400).json({ success: false, error: "Thiếu userId" });

                let updated = false;
                if (fs.existsSync("sheet_users_backup.json")) {
                    let sheetData = JSON.parse(fs.readFileSync("sheet_users_backup.json", "utf8"));
                    let usersList = (sheetData && sheetData.data) ? sheetData.data : ((sheetData && sheetData.users) ? sheetData.users : []);

                    for (let u of usersList) {
                        if (String(u.userId) === String(userId)) {
                            if (unpaid !== undefined) u.unpaid = Number(unpaid);
                            if (paid !== undefined) u.paid = Number(paid);
                            if (unpaidReferral !== undefined) u.unpaidReferral = Number(unpaidReferral);
                            if (bankBin !== undefined) u.bankBin = bankBin;
                            if (bankAcc !== undefined) u.bankAcc = bankAcc;
                            updated = true;
                            break;
                        }
                    }

                    if (sheetData.data) sheetData.data = usersList;
                    else if (sheetData.users) sheetData.users = usersList;

                    fs.writeFileSync("sheet_users_backup.json", JSON.stringify(sheetData, null, 2), "utf8");
                }

                // Gửi báo cáo ngầm lên Google Sheets
                if (config.orderAppsScriptUrl) {
                    try {
                        fetch(config.orderAppsScriptUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "save_bank_info", userId, bankBin, bankAcc })
                        }).catch(() => {});
                    } catch (e) {}
                }

                return res.json({ success: updated, message: updated ? "Cập nhật thành công" : "Không tìm thấy user" });
            }

            if (action === "getAdminOrders") {
                const query = req.query.query || (req.body && req.body.query) || "";
                
                // Nếu tìm kiếm theo từ khóa / mã đơn cụ thể
                if (query) {
                    if (config.orderAppsScriptUrl) {
                        try {
                            const targetUrl = `${config.orderAppsScriptUrl}?action=unifiedSearch&query=${encodeURIComponent(query)}`;
                            const response = await fetch(targetUrl);
                            const json = await response.json();
                            if (json && json.success && Array.isArray(json.data)) {
                                const enrichedData = json.data.map(o => {
                                    if (!o.platform) {
                                        const idStr = String(o.orderId || o.id || '').trim();
                                        if (/^\d{18,20}$/.test(idStr)) o.platform = "TikTok";
                                        else if (/^\d{13,17}$/.test(idStr)) o.platform = "Lazada";
                                        else o.platform = "Shopee";
                                    }
                                    return o;
                                });
                                return res.json({ success: true, data: enrichedData, total: enrichedData.length });
                            }
                        } catch(e) {}
                    }
                    return res.json({ success: true, data: [], total: 0 });
                }

                // Trả về TỨC THÌ từ file all_orders_cache.json trên VPS (Tốc độ <10ms, không bao giờ bị timeout HTTP!)
                let cachedOrders = [];
                if (fs.existsSync("all_orders_cache.json")) {
                    try {
                        const cached = JSON.parse(fs.readFileSync("all_orders_cache.json", "utf8"));
                        if (cached && Array.isArray(cached.data)) {
                            cachedOrders = cached.data;
                        }
                    } catch(e) {}
}

                // Nếu chưa có cache thì kích hoạt quét đồng bộ ngầm ngay lập tức
                if (cachedOrders.length === 0) {
                    syncAllOrdersCache(config);
                }

                return res.json({ success: true, data: cachedOrders, total: cachedOrders.length, timestamp: Date.now() });
            }

            if (action === "updateOrderStatus") {
                const { orderId, orderStatus, paymentStatus } = req.body || {};
                if (config.orderAppsScriptUrl) {
                    try {
                        await fetch(config.orderAppsScriptUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "update_order_status", orderId, orderStatus, paymentStatus })
                        });
                    } catch (e) {}
                }
                return res.json({ success: true, message: "Đã cập nhật trạng thái đơn" });
            }
            
            // Universal Proxy cho các action khác (linkZaloId, savePhone, getUserInfo, vv...) sang Google Apps Script
            if (config.orderAppsScriptUrl) {
                try {
                    const queryParams = new URLSearchParams();
                    // Copy all req.query
                    for (const [k, v] of Object.entries(req.query || {})) {
                        queryParams.set(k, v);
                    }
                    if (!queryParams.has("action") && action) {
                        queryParams.set("action", action);
                    }
                    
                    const fullTargetUrl = `${config.orderAppsScriptUrl}${(config.orderAppsScriptUrl.includes("?") ? "&" : "?")}${queryParams.toString()}`;
                    
                    if (req.method === "GET") {
                        const response = await fetch(fullTargetUrl);
                        const data = await response.json();
                        return res.json(data);
                    } else {
                        const response = await fetch(fullTargetUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(reqBody)
                        });
                        const data = await response.json();
                        return res.json(data);
                    }
                } catch(proxyErr) {
                    return res.json({ success: false, error: proxyErr.message });
                }
            }

            return res.json({ success: false, error: "Action không hợp lệ: " + action });
        } catch (e) {
            res.setHeader("Access-Control-Allow-Origin", "*");
            return res.status(500).json({ success: false, error: e.message });
        }
    });

    app.get("/api/web/leaderboard", async (req, res) => {
        try {
            const { month, year } = req.query;
            let targetUrl = `${config.orderAppsScriptUrl}?action=getLeaderboard`;
            if (month && year) targetUrl += `&month=${month}&year=${year}`;
            const response = await fetch(targetUrl);
            const data = await response.json();
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json(data);
        } catch (e) {
            res.json({ success: false, data: [] });
        }
    });

    app.get("/api/web/orders", async (req, res) => {
        try {
            const { query, subId, date } = req.query;
            let targetUrl = `${config.orderAppsScriptUrl}?action=unifiedSearch&query=${encodeURIComponent(query || subId || "")}`;
            if (date) targetUrl += `&date=${date}`;
            const response = await fetch(targetUrl);
            const data = await response.json();
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json(data);
        } catch (e) {
            res.json({ success: false, data: [] });
        }
    });

    app.post("/api/payout/notify", async (req, res) => {
        try {
            const body = req.body || {};
            const { userId, userName, amount, billBase64, note, bonus, reason, referralBonus, totalPaid, billUrl } = body;
            console.log(`🤖 [Zalo Bot API] Nhận yêu cầu gửi thông báo thanh toán cho ${userName} (${userId}) số tiền ${amount}...`);
            
            // Không lưu và gửi ảnh đính kèm nữa theo yêu cầu
            let attachments = [];
            
            const now = new Date();
            const pad = (n) => n.toString().padStart(2, '0');
            const currentDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
            
            let amountDetailsText = "";
            const bonusNum = Number(bonus) || 0;
            let refBonusNum = Number(referralBonus) || 0;
            const totalAmt = Math.round(Number(amount));

            // Tự động nhận diện nếu khoản chuyển là Thưởng giới thiệu
            if (refBonusNum === 0 && (
                (reason && (reason.toLowerCase().includes("giới thiệu") || reason.toLowerCase().includes("gt"))) ||
                totalAmt === 10000
            )) {
                refBonusNum = Math.max(0, totalAmt - bonusNum);
            }

            const commission = Math.max(0, totalAmt - bonusNum - refBonusNum);
            
            let parts = [];
            if (commission > 0) {
                parts.push(`${commission.toLocaleString("vi-VN")}đ hoa hồng`);
            }
            if (refBonusNum > 0) {
                parts.push(`${refBonusNum.toLocaleString("vi-VN")}đ thưởng giới thiệu`);
            }
            if (bonusNum > 0) {
                parts.push(`${bonusNum.toLocaleString("vi-VN")}đ ${reason || 'thưởng thêm'}`);
            }
            
            if (parts.length === 1) {
                amountDetailsText = parts[0];
            } else if (parts.length > 1) {
                amountDetailsText = `${parts.join(" + ")} = ${totalAmt.toLocaleString("vi-VN")}đ`;
            } else {
                amountDetailsText = `${totalAmt.toLocaleString("vi-VN")}đ`;
            }
            
            let text = `✅ Xác nhận thanh toán thành công!\n` +
                       `👤 User: @${userName}\n` +
                       `💰 Số tiền: ${amountDetailsText}\n`;
            
            if (totalPaid) {
                text += `📥 Tổng đã nhận: ${Math.round(Number(totalPaid)).toLocaleString("vi-VN")}đ\n`;
            }
            
            text += `📆 Ngày: ${currentDate}\n`;
            
            if (billUrl) {
                text += `🔗 Bill: ${billUrl}`;
            } else if (note && note.startsWith("http")) {
                text += `🔗 Bill: ${note}`;
            }
            
            text = text.trim();
            
            const activeApi = getApi();
            const targetGroupId = config.scheduler?.targetGroupId || (config.groupAffiliates ? Object.keys(config.groupAffiliates)[0] : null) || config.tiktokGroupId || "2001332429948371738";
            
            const mentionPos = text.indexOf(`@${userName}`);
            const replyPayload = {
                msg: text
            };
            if (mentionPos >= 0 && userId) {
                replyPayload.mentions = [
                    {
                        pos: mentionPos,
                        uid: String(userId),
                        len: userName.length + 1
                    }
                ];
            }
            if (attachments && attachments.length > 0) {
                replyPayload.attachments = attachments;
            }
            
            await activeApi.sendMessage(replyPayload, targetGroupId, 1);
            res.json({ success: true });
        } catch (err) {
            console.error(`⚠️ [Zalo Bot API] Gửi thông báo thanh toán thất bại: ${err.message}`);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    
    
    // CORS headers to allow connection from chrome-extension://
    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        if (req.method === "OPTIONS") return res.sendStatus(200);
        next();
    });

    // Endpoint for Extension to poll pending tasks
    app.get("/api/tasks", (req, res) => {
        lastExtensionActiveTime = Date.now();
        const tasksToSend = taskQueue.filter(t => !t.processing);
        tasksToSend.forEach(t => t.processing = true);
        res.json(tasksToSend);
    });

    // Endpoint for Extension to submit commission details
    app.post("/api/tasks/resolve", (req, res) => {
        const { id, success, data, error } = req.body;
        if (!id) {
            return res.status(400).json({ error: "Missing task id" });
        }

        console.log(`🤖 [Zalo Bot API] Nhận kết quả cho task ${id}: success=${success}, error=${error}`);
        try {
            appendFileSync('scratch/tasks_resolve_log.jsonl', JSON.stringify({ timestamp: new Date().toISOString(), id, success, error }) + '\n', 'utf8');
        } catch (e) {}
        if (pendingTasks.has(id)) {
            const pending = pendingTasks.get(id);
            pendingTasks.delete(id);

            // Remove from taskQueue
            const idx = taskQueue.findIndex(t => t.id === id);
            if (idx !== -1) taskQueue.splice(idx, 1);

            if (success) {
                if (data && data.raw) {
                    try {
                        writeFileSync('scratch/shopee_raw_payload.json', JSON.stringify(data.raw, null, 2), 'utf8');
                        console.log("🤖 [Zalo Bot API] Đã lưu file debug: scratch/shopee_raw_payload.json");
                    } catch (fsErr) {
                        console.error("🤖 [Zalo Bot API] Lỗi ghi file debug raw json:", fsErr.message);
                    }
                    console.log("🤖 [Zalo Bot API] RAW API JSON RECEIVED:", JSON.stringify(data.raw, null, 2));
                    pending.resolve(data.parsed);
                } else {
                    pending.resolve(data);
                }
            } else {
                pending.reject(new Error(error || "Lỗi không xác định từ extension"));
            }
            res.json({ status: "success" });
        } else {
            res.status(404).json({ error: "Task not found or timed out" });
        }
    });

    // Endpoint for Extension Popup to check connection status
    app.get("/api/ping", (req, res) => {
        res.json({ status: "ok", bot: "ZaloBot", version: "1.0.0" });
    });

    const port = config.shopee?.zalobotApiPort || 9225;
    app.listen(port, "127.0.0.1", () => {
        console.log(`🤖 [Zalo Bot API] Máy chủ kết nối Extension đang chạy tại http://127.0.0.1:${port}`);
    });
}

function getProductDetailsViaExtension(url) {
    return new Promise((resolve, reject) => {
        const id = `task_${Date.now()}_${++taskIdCounter}`;
        let programType = "1"; // Mặc định là 1 cho tài khoản thường
        try {
            const config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
            if (config.shopee && config.shopee.programType) {
                programType = String(config.shopee.programType);
            }
        } catch (e) {
            // bỏ qua
        }
        const task = { id, url, programType };
        taskQueue.push(task);
        pendingTasks.set(id, { resolve, reject, url, timestamp: Date.now() });
        console.log(`🤖 [Zalo Bot API] Đã thêm link vào hàng đợi Extension: ${url} (Task ID: ${id})`);
        
        // Timeout 15s
        setTimeout(() => {
            if (pendingTasks.has(id)) {
                pendingTasks.delete(id);
                const idx = taskQueue.findIndex(t => t.id === id);
                if (idx !== -1) taskQueue.splice(idx, 1);
                reject(new Error("Hết thời gian chờ phản hồi từ Chrome Extension (15s)"));
            }
        }, 15000);
    });
}

function getLazadaDetailsViaExtension(url, subId) {
    return new Promise((resolve, reject) => {
        const id = `task_${Date.now()}_${++taskIdCounter}`;
        const task = { id, url, platform: "lazada", subId };
        taskQueue.push(task);
        pendingTasks.set(id, { resolve, reject, url, timestamp: Date.now() });
        console.log(`🤖 [Zalo Bot API] Đã thêm link Lazada vào hàng đợi Extension: ${url} (Task ID: ${id})`);
        
        // Timeout 15s
        setTimeout(() => {
            if (pendingTasks.has(id)) {
                pendingTasks.delete(id);
                const idx = taskQueue.findIndex(t => t.id === id);
                if (idx !== -1) taskQueue.splice(idx, 1);
                reject(new Error("Hết thời gian chờ phản hồi từ Chrome Extension cho link Lazada (15s)"));
            }
        }, 15000);
    });
}

async function getProductDetailsViaCDP(productUrl, port = 9222) {
    isCdpBusy = true;
    try {
        const { page } = await connectToCDP(port);

        // Kiểm tra xem trình duyệt có đang hiển thị Captcha hay không trước khi chạy lệnh
        const hasCaptcha = await isPageShowingCaptcha(page);
        if (hasCaptcha) {
            console.log("-> CDP: Phát hiện trình duyệt đang bị chặn bởi Captcha! Tạm dừng quét CDP...");
            isBlockedByCaptcha = true;
            throw new Error("Trình duyệt đang bị khóa bởi Captcha");
        }

        // Mô phỏng hành vi di chuyển chuột nhẹ và cuộn trang để vượt qua Akamai telemetry
        try {
            await page.mouse.move(Math.floor(Math.random() * 200) + 100, Math.floor(Math.random() * 200) + 100);
            await page.mouse.wheel(0, Math.floor(Math.random() * 50) + 20);
        } catch (e) {}

        const ids = getShopItemId(productUrl);
        
        console.log("-> CDP: Đang thiết lập bộ lắng nghe phản hồi API GraphQL/REST...");

        let onResponse;
        const productDetails = await new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                page.off("response", onResponse);
                reject(new Error("Hết thời gian chờ phản hồi từ Shopee Console (15s)"));
            }, 15000);

            onResponse = async (response) => {
                const url = response.url();
                if (url.includes("/api/v3/gql") || url.includes("/api/v3/offer/product")) {
                    const req = response.request();
                    try {
                        let isTarget = false;
                        
                        if (url.includes("/api/v3/offer/product")) {
                            isTarget = ids && url.includes(ids.itemid);
                        } else {
                            const postData = JSON.parse(req.postData() || "{}");
                            const variables = postData.variables || {};
                            isTarget = (ids && JSON.stringify(variables).includes(ids.itemid)) ||
                                       JSON.stringify(variables).includes(productUrl) || 
                                       postData.query?.includes("getProductOfferList") || 
                                       postData.query?.includes("productOffer") ||
                                       postData.query?.includes("getProductOfferDetail");
                        }
                        
                        if (isTarget) {
                            const json = await response.json();
                            const parsedProduct = parseShopeeAffiliateResponse(json);
                            if (parsedProduct && parsedProduct.name) {
                                clearTimeout(timeoutId);
                                page.off("response", onResponse);
                                resolve(parsedProduct);
                            }
                        }
                    } catch (e) {
                        // Bỏ qua
                    }
                }
            };

            page.on("response", onResponse);

            // 1. Nếu có ItemID, tiến hành chuyển hướng trực tiếp (Được hỗ trợ chính xác hơn tìm kiếm trên một số tài khoản)
            if (ids && ids.itemid) {
                const targetUrl = `https://affiliate.shopee.vn/offer/product_offer/${ids.itemid}`;
                
                // Trì hoãn ngẫu nhiên 500ms - 1500ms trước khi điều hướng để tránh bị đánh giá là bot phản hồi quá nhanh
                const delay = Math.floor(Math.random() * 1000) + 500;
                await new Promise(r => setTimeout(r, delay));

                console.log(`-> CDP: Đang chuyển hướng bằng JavaScript nội bộ tới: ${targetUrl}...`);
                try {
                    // Thử điều hướng bằng JS nội bộ trước để tránh các dấu vết điều khiển tự động của CDP
                    await page.evaluate((url) => { window.location.href = url; }, targetUrl);
                } catch (e) {
                    console.log(`-> CDP: JS redirect gặp lỗi, fallback dùng page.goto...`);
                    try {
                        await page.goto(targetUrl, { waitUntil: "commit", timeout: 15000 });
                    } catch (err) {
                        clearTimeout(timeoutId);
                        page.off("response", onResponse);
                        return reject(err);
                    }
                }
            } 
            // 2. Nếu không có ItemID, sử dụng ô tìm kiếm làm fallback
            else {
                try {
                    const currentUrl = page.url();
                    if (!currentUrl.includes("affiliate.shopee.vn/offer/product_offer") || currentUrl.includes("/product_offer/")) {
                        await page.goto("https://affiliate.shopee.vn/offer/product_offer", { waitUntil: "commit", timeout: 15000 });
                    }

                    console.log("-> CDP: Nhập từ khóa tìm kiếm...");
                    const searchInputSelectors = [
                        'input[placeholder*="Tìm kiếm"]',
                        'input[placeholder*="Search"]',
                        'input[type="text"]',
                        '.el-input__inner'
                    ];
                    
                    let searchInput = null;
                    for (const selector of searchInputSelectors) {
                        try {
                            await page.waitForSelector(selector, { timeout: 3000 });
                            searchInput = page.locator(selector).first();
                            if (searchInput) break;
                        } catch (e) {}
                    }
                    
                    if (!searchInput) {
                        throw new Error("Không tìm thấy ô tìm kiếm trên trang Shopee Affiliate Console");
                    }

                    await searchInput.click();
                    await page.keyboard.press("Control+A");
                    await page.keyboard.press("Backspace");
                    await searchInput.fill(productUrl);
                    await page.waitForTimeout(300);
                    
                    const searchButtonSelectors = [
                        'button:has-text("Tìm kiếm")',
                        'button:has-text("Search")',
                        'button[type="submit"]',
                        '.el-button--primary'
                    ];
                    
                    let clicked = false;
                    for (const selector of searchButtonSelectors) {
                        try {
                            const btn = page.locator(selector).first();
                            if (await btn.isVisible()) {
                                await btn.click();
                                clicked = true;
                                break;
                            }
                        } catch (e) {}
                    }
                    
                    if (!clicked) {
                        await searchInput.press("Enter");
                    }
                } catch (e) {
                    clearTimeout(timeoutId);
                    page.off("response", onResponse);
                    reject(e);
                }
            }
        });

        return productDetails;
    } catch (err) {
        try {
            const { page } = await connectToCDP(port).catch(() => ({}));
            if (page) {
                const hasCaptcha = await isPageShowingCaptcha(page);
                if (hasCaptcha) {
                    console.log("-> CDP: Lỗi xảy ra do Captcha xuất hiện! Tạm dừng quét CDP...");
                    isBlockedByCaptcha = true;
                }
            }
        } catch (e) {}
        throw err;
    } finally {
        isCdpBusy = false;
    }
}

const cdpQueue = [];
let isProcessingQueue = false;

async function processCdpQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    while (cdpQueue.length > 0) {
        const task = cdpQueue.shift();
        try {
            console.log(`-> CDP Queue: Đang xử lý yêu cầu trong hàng đợi (Còn lại: ${cdpQueue.length})...`);
            const data = await getProductDetailsViaCDP(task.url, task.port);
            task.resolve(data);
        } catch (err) {
            task.reject(err);
        }
    }

    isProcessingQueue = false;
}

function queueGetProductDetailsViaCDP(url, port) {
    return new Promise((resolve, reject) => {
        cdpQueue.push({ url, port, resolve, reject });
        console.log(`-> CDP Queue: Đã thêm yêu cầu vào hàng đợi (Đang có: ${cdpQueue.length} yêu cầu chờ)`);
        processCdpQueue();
    });
}


async function getProductDetailsViaAddLiveTag(productUrl) {
    try {
        console.log(`🤖 [AddLiveTag API] Đang tra cứu thông tin sản phẩm trên AddLiveTag...`);
        const response = await fetch(`https://addlivetag.com/product/?q=${encodeURIComponent(productUrl)}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            },
            signal: AbortSignal.timeout(6000)
        });
        const html = await response.text();
        
        let productName = "";
        let price = 0;
        let rate = 0;
        let value = 0;
        
        // 1. Parse JSON-LD Product schema
        const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (schemaMatch) {
            try {
                const schema = JSON.parse(schemaMatch[1]);
                if (schema["@type"] === "Product") {
                    productName = schema.name || "";
                    if (schema.offers && schema.offers.price) {
                        price = parseInt(schema.offers.price, 10) || 0;
                    }
                }
            } catch(e) {}
        }
        
        // Fallback name
        if (!productName) {
            const titleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i) || 
                               html.match(/content="([^"]+)"\s+property="og:title"/i);
            if (titleMatch) {
                const titleText = titleMatch[1];
                const parts = titleText.split("—");
                if (parts.length >= 2) {
                    productName = parts.slice(1).join("—").replace(/\s*\|\s*AddLiveTag/i, "").trim();
                } else {
                    productName = titleText.replace(/\s*\|\s*AddLiveTag/i, "").trim();
                }
            }
        }
        
        // 2. Parse Commission Rate & Amount
        let shopeeRate = 0;
        let sellerRate = 0;
        const descMatch = html.match(/<meta name="description" content="([^"]+)"/i);
        if (descMatch) {
            const desc = descMatch[1];
            const commMatch = desc.match(/(?:tổng|tong)\s*([0-9.,]+)\s*[đd]?\s*\(\s*([0-9.,]+)\s*%\s*\)/i);
            if (commMatch) {
                value = parseInt(commMatch[1].replace(/[.,]/g, ""), 10) || 0;
                rate = parseFloat(commMatch[2].replace(",", ".")) || 0;
            }
            
            const shopeeMatch = desc.match(/Shopee\s*([0-9.,]+)\s*%/i);
            const sellerMatch = desc.match(/Seller\s*([0-9.,]+)\s*%/i);
            shopeeRate = shopeeMatch ? parseFloat(shopeeMatch[1].replace(",", ".")) : 0;
            sellerRate = sellerMatch ? parseFloat(sellerMatch[1].replace(",", ".")) : 0;
        }
        
        if (productName) {
            console.log(`🤖 [AddLiveTag API] Lấy thông tin thành công: ${productName}, Rate=${rate}%, Amount=${value}đ (Shopee=${shopeeRate}%, Seller=${sellerRate}%)`);
            return {
                productName,
                price,
                commission_rate: rate,
                commission_amount: value,
                shopee_rate: shopeeRate,
                seller_rate: sellerRate
            };
        }
    } catch (e) {
        console.warn(`⚠️ [AddLiveTag API] Lỗi tra cứu: ${e.message}`);
    }
    return null;
}

// Hàm rút gọn tên sản phẩm cho ngắn gọn, súc tích (tối đa 45 ký tự)
function getShortProductName(name) {
    if (!name) return "";
    let clean = name.replace(/\s+/g, ' ').trim();
    if (clean.length > 45) {
        clean = clean.substring(0, 42) + "...";
    }
    return clean;
}

async function convertTikTokViaRioHub(rawUrl, senderUserId, resolvedUrl = "") {
    let cfg = {};
    try {
        cfg = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    } catch (e) {}

    const riohubConfig = cfg.riohub || {};
    const apiKey = riohubConfig.apiKey || "rhk_5e184fd38ebff8c159abbe6fb302d875cc4f00c4bbf162bc";
    const creatorUsername = riohubConfig.creatorUsername || "con.muon.noi6";

    if (!apiKey || !creatorUsername) {
        throw new Error("Chưa cấu hình RioHub API Key hoặc creatorUsername.");
    }

    const subId = senderUserId ? String(senderUserId) : "zalo-user";
    
    console.log(`⚡ [RioHub API] Đang tạo link TikTok siêu tốc cho URL: ${rawUrl} (SubID: ${subId})...`);

    const res = await fetch("https://riohub.vn/api/v1/partner/tiktok/affiliate/links", {
        method: "POST",
        headers: {
            "X-Riohub-Api-Key": apiKey,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            creator_username: creatorUsername,
            product_url: rawUrl,
            sub_id: subId
        })
    });

    if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after") || 5;
        console.warn(`⚠️ [RioHub API] Bị giới hạn tần suất (429). Retry-After: ${retryAfter}s`);
        throw new Error(`Hệ thống đang bận. Vui lòng thử lại sau ${retryAfter} giây.`);
    }

    const json = await res.json();
    if (!res.ok) {
        if (json?.error?.code === "product_not_promotable") {
            return {
                success: false,
                errorMsg: "⚠️ Sản phẩm TikTok này hiện tại không có hoa hồng tiếp thị liên kết. Sếp vui lòng chọn sản phẩm khác nhé!"
            };
        }
        throw new Error(json?.error?.message || `RioHub API Error (${res.status})`);
    }

    const affiliateLink = json.affiliate_link;
    const productId = json.product_id;

    let productName = "";
    let formattedComm2 = "6%";
    let priceNum = 0;
    let commAmtNum = 0;
    let commRateNum = 0;
    let imageUrlStr = "";

    if (productId) {
        try {
            const pRes = await fetch(`https://riohub.vn/api/v1/partner/tiktok/affiliate/products?creator_username=${encodeURIComponent(creatorUsername)}&product_id=${encodeURIComponent(productId)}`, {
                headers: { "X-Riohub-Api-Key": apiKey }
            });
            if (pRes.ok) {
                const pJson = await pRes.json();
                if (pJson.products && pJson.products.length > 0) {
                    const item = pJson.products[0];
                    if (item.title) productName = item.title;
                    
                    let ratePercent = "";
                    if (item.commission && item.commission.rate) {
                        ratePercent = (item.commission.rate / 100).toFixed(1).replace(/\.0$/, "") + "%";
                    }
                    
                    let commAmountStr = "";
                    if (item.commission && item.commission.amount) {
                        const rawParts = String(item.commission.amount).split("-").map(p => Math.round(parseFloat(p.trim()) || 0)).filter(v => v > 0);
                        if (rawParts.length > 0) {
                            const minComm = Math.min(...rawParts);
                            commAmountStr = minComm.toLocaleString("vi-VN") + "đ";
                        }
                    }

                    if (item.main_image_url) imageUrlStr = item.main_image_url;
                    if (item.sales_price && item.sales_price.minimum_amount) {
                        priceNum = parseFloat(item.sales_price.minimum_amount) || 0;
                    }
                    if (item.commission) {
                        if (item.commission.rate) {
                            commRateNum = parseFloat(item.commission.rate) / 100;
                        }
                        if (item.commission.amount) {
                            const rawParts = String(item.commission.amount).split("-").map(p => Math.round(parseFloat(p.trim()) || 0)).filter(v => v > 0);
                            if (rawParts.length > 0) commAmtNum = Math.min(...rawParts);
                        }
                    }
                    if (commAmtNum === 0 && priceNum > 0 && commRateNum > 0) {
                        commAmtNum = Math.round(priceNum * commRateNum / 100);
                    }

                    if (!commAmountStr && commAmtNum > 0) {
                        commAmountStr = commAmtNum.toLocaleString("vi-VN") + "đ";
                    }

                    if (commAmountStr && ratePercent) {
                        formattedComm2 = `${commAmountStr} (${ratePercent})`;
                    } else if (commAmountStr) {
                        formattedComm2 = commAmountStr;
                    } else if (ratePercent) {
                        formattedComm2 = ratePercent;
                    }
                }
            }
        } catch(eProd) {}
    }

    if (!productName || !imageUrlStr) {
        try {
            const fullUrlStr = rawUrl + " " + (resolvedUrl || "");
            const ogMatch = fullUrlStr.match(/og_info=([^&]+)/);
            if (ogMatch) {
                const ogObj = JSON.parse(decodeURIComponent(ogMatch[1]));
                if (!productName && ogObj.title) productName = ogObj.title;
                if (!imageUrlStr && ogObj.image) imageUrlStr = ogObj.image;
            }
        } catch(eOg) {}
    }

    console.log(`🎯 [RioHub API] Chuyển đổi TikTok siêu tốc thành công! Link=${affiliateLink}, Hoa Hồng=${formattedComm2}, SP=${productName}`);
    return {
        success: true,
        affiliateLink,
        productName: productName || "Sản phẩm TikTok Shop",
        formattedComm2,
        imageUrl: imageUrlStr,
        price: priceNum,
        commissionAmount: commAmtNum,
        commissionRate: commRateNum
    };
}


async function syncTikTokOrdersViaRioHub() {
    let cfg = {};
    try {
        cfg = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    } catch (e) {}

    const riohubConfig = cfg.riohub || {};
    const apiKey = riohubConfig.apiKey || "rhk_5e184fd38ebff8c159abbe6fb302d875cc4f00c4bbf162bc";
    const creatorUsername = riohubConfig.creatorUsername || "con.muon.noi6";
    const orderAppsScriptUrl = cfg.orderAppsScriptUrl;

    if (!apiKey || !creatorUsername) {
        console.log("⚠️ [TikTok Sync] Chưa cấu hình RioHub API Key hoặc Creator Username.");
        return { success: false, message: "Chưa cấu hình RioHub API Key." };
    }

    console.log("🔄 [TikTok Sync] Đang quét danh sách đơn hàng TikTok từ RioHub API...");

    try {
        const res = await fetch(`https://riohub.vn/api/v1/partner/tiktok/affiliate/orders?creator_username=${encodeURIComponent(creatorUsername)}&page=1&page_size=200`, {
            headers: { "X-Riohub-Api-Key": apiKey }
        });

        if (!res.ok) {
            console.error(`⚠️ [TikTok Sync] RioHub API Lỗi (${res.status})`);
            return { success: false, message: `Lỗi kết nối RioHub API (${res.status})` };
        }

        const json = await res.json();
        const orders = json.orders || [];
        console.log(`✅ [TikTok Sync] Tìm thấy ${orders.length} đơn hàng TikTok từ RioHub.`);

        if (orders.length === 0) {
            return { success: true, count: 0, message: "Không có đơn hàng mới." };
        }

        const ordersToSync = [];
        for (const ord of orders) {
            const orderId = ord.order_id;
            const zaloId = ord.sub1 || ord.sub_id;
            const productName = ord.product_name || "Sản phẩm TikTok";
            const commEst = parseFloat(ord.est_commission || 0) || 0;
            const commActual = parseFloat(ord.actual_commission || 0) || 0;
            const commAmount = Math.round(commActual > 0 ? commActual : commEst);
            
            let checkoutStatus = "Pending";
            if (ord.status === 2 || ord.settlement_status === "SETTLED" || ord.settlement_status === "PAID") {
                checkoutStatus = "Waiting for payment";
            } else if (ord.status === 3 || ord.settlement_status === "REFUNDED" || ord.settlement_status === "CANCELLED") {
                checkoutStatus = "Invalid";
            }

            let reportDate = new Date().toISOString().split("T")[0];
            if (ord.time_created) {
                reportDate = ord.time_created.split(" ")[0];
            }

            const targetSubId = zaloId ? zaloId : "6817145022757067591"; // Chuẩn 100% theo Google Sheet: Các đơn này thuộc tài khoản Phòng Đăng Ký (ID: 6817145022757067591)

            ordersToSync.push({
                report_date: reportDate,
                order_sn: orderId,
                item_name: productName,
                commission: commAmount,
                checkout_status: checkoutStatus,
                sub_id: targetSubId
            });
        }

        if (ordersToSync.length > 0 && orderAppsScriptUrl) {
            console.log(`[TikTok Sync] Đang đẩy ${ordersToSync.length} đơn TikTok lên Google Sheet...`);
            const response = await fetch(orderAppsScriptUrl, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "sync_orders",
                    token: "DongChau@Secure2026",
                    orders: ordersToSync
                })
            });

            const resultText = await response.text();
            const result = JSON.parse(resultText);
            console.log(`🎉 [TikTok Sync] Kết quả lưu Sheet: inserted=${result.inserted || 0}, updated=${result.updated || 0}`);
            return { success: true, count: ordersToSync.length, inserted: result.inserted || 0, updated: result.updated || 0 };
        } else {
            return { success: true, count: ordersToSync.length, message: "Đã xử lý xong danh sách đơn." };
        }
    } catch (err) {
        console.error("❌ [TikTok Sync] Lỗi thực thi:", err.message);
        return { success: false, message: err.message };
    }
}

function startTikTokDailyScheduler() {
    console.log("⏰ [TikTok Daily Scheduler] Đã kích hoạt lịch tự động đồng bộ đơn TikTok: Quét và đẩy đơn lên Google Sheet trong khung giờ từ 7h30 sáng đến 8h30 sáng hằng ngày (thử định kỳ mỗi 15 phút tại 7:30, 7:45, 8:00, 8:15, 8:30).");

    let executedSlots = new Set();
    let currentDayStr = "";

    const checkAndRunSync = async () => {
        try {
            const now = new Date();
            const formatterDate = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" });
            const formatterTime = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false });
            
            const dateStr = formatterDate.format(now);
            const timeStr = formatterTime.format(now);
            const [hourStr, minuteStr] = timeStr.split(":");
            const hour = parseInt(hourStr, 10);
            const minute = parseInt(minuteStr, 10);

            // Reset slots khi bước sang ngày mới
            if (currentDayStr !== dateStr) {
                currentDayStr = dateStr;
                executedSlots.clear();
            }

            const totalMinutes = hour * 60 + minute;
            const startMinutes = 7 * 60 + 30; // 7h30 (450 phút)
            const endMinutes = 8 * 60 + 30;   // 8h30 (510 phút)

            // Kiểm tra xem hiện tại có nằm trong khung giờ 7h30 - 8h30 sáng không
            if (totalMinutes >= startMinutes && totalMinutes <= endMinutes) {
                // Kiểm tra xem có trúng mốc 15 phút không (7h30, 7h45, 8h00, 8h15, 8h30)
                if (minute % 15 === 0 || totalMinutes === startMinutes || totalMinutes === endMinutes) {
                    const slotKey = `${dateStr}-${hour}:${minute}`;
                    if (executedSlots.has(slotKey)) {
                        return;
                    }
                    executedSlots.add(slotKey);

                    console.log(`⏰ [TikTok Daily Scheduler] Đã đến lịch ${timeStr} sáng! Bắt đầu đồng bộ tự động đơn TikTok từ RioHub...`);
                    const result = await syncTikTokOrdersViaRioHub();
                    
                    if (result && result.success) {
                        console.log(`✅ [TikTok Daily Scheduler] Lần thử lúc ${timeStr} hoàn tất thành công! Ghi nhận ${result.count || 0} đơn (Mới: ${result.inserted || 0}, Cập nhật: ${result.updated || 0}).`);
                    } else {
                        console.error(`⚠️ [TikTok Daily Scheduler] Lần thử lúc ${timeStr} thất bại: ${result ? result.message : 'Unknown error'}. Sẽ thử lại ở mốc 15 phút tiếp theo.`);
                    }
                }
            }
        } catch (err) {
            console.error("Lỗi trong TikTok Daily Scheduler:", err.message);
        }
    };

    // 1. Quét định kỳ mỗi 30 giây để không bỏ lỡ từng phút 7h30, 7h45, 8h00, 8h15, 8h30
    setInterval(checkAndRunSync, 30000);

    // 2. NẾU BOT KHỞI ĐỘNG TRONG KHUNG GIỜ 7H30 - 8H30 SÁNG ➔ KÍCH HOẠT QUÉT ĐỒNG BỘ NGAY LẬP TỨC!
    const now = new Date();
    const formatterTime = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false });
    const [hStr, mStr] = formatterTime.format(now).split(":");
    const curTot = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
    if (curTot >= (7 * 60 + 30) && curTot <= (8 * 60 + 30)) {
        console.log(`⏰ [TikTok Daily Scheduler] Bot khởi động TRONG KHUNG GIỜ 7h30 - 8h30 SÁNG! Kích hoạt chạy đồng bộ đơn TikTok ngay lập tức...`);
        setTimeout(checkAndRunSync, 3000);
    }
}

// Biểu thức chính quy tìm các link Shopee
// Bắt các định dạng: shopee.vn, shope.ee, shp.ee, s.shopee.vn, v.v.
const SHOPEE_REGEX = /https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:shopee\.vn|shp\.ee|shope\.ee)\/\S+/gi;

// Biểu thức chính quy tìm các link Lazada
// Bắt các định dạng: lazada.vn, s.lazada.vn, v.v.
const LAZADA_REGEX = /https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:lazada\.vn|lazada\.co\.th|lazada\.sg|lazada\.com\.my|lazada\.co\.id|lazada\.com\.ph)\/\S+/gi;

// Biểu thức chính quy tìm các link TikTok
const TIKTOK_REGEX = /https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:tiktok\.com|vt\.tiktok\.com)\/\S+/gi;

// Hàm trích xuất văn bản/đường dẫn từ các dạng tin nhắn Zalo khác nhau (chữ thô, thẻ link card, file, v.v.)
function extractTextFromMessage(msg) {
    const content = msg.data?.content;
    if (typeof content === "string") {
        return content;
    }
    if (content && typeof content === "object") {
        const parts = [];
        if (content.params?.message) parts.push(content.params.message);
        if (content.text) parts.push(content.text);
        if (content.msg) parts.push(content.msg);
        if (content.href) parts.push(content.href);
        if (content.title) parts.push(content.title);
        if (content.description) parts.push(content.description);
        return parts.join(" ");
    }
    return "";
}

// Hàm phân giải link rút gọn thành link sản phẩm gốc
async function resolveRedirect(url) {
    try {
        let response = await fetch(url, { redirect: "follow", method: "HEAD" });
        if (response.url) return response.url;
        
        response = await fetch(url, { redirect: "follow", method: "GET" });
        return response.url || url;
    } catch (e) {
        console.log(`[Phân giải Link] Không thể giải mã redirect của ${url}: ${e.message}`);
        return url;
    }
}

// Hàm phân giải link rút gọn Lazada s.lazada.vn
async function resolveLazadaUrl(url) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        
        // Thử tìm thẻ meta refresh
        const refreshMatch = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*url=([^"'>\s]+)/i);
        if (refreshMatch && refreshMatch[1]) {
            return decodeURIComponent(refreshMatch[1].trim());
        }
        
        // Thử tìm lệnh gán window.location.href trong script
        const scriptMatch = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i);
        if (scriptMatch && scriptMatch[1]) {
            return scriptMatch[1].trim();
        }
        
        return response.url || url;
    } catch (e) {
        return url;
    }
}

// Hàm tải trang sản phẩm gốc và bóc tách thông tin (Tiêu đề & Giá) từ Lazada
async function fetchLazadaDetails(url) {
    try {
        const resolved = await resolveLazadaUrl(url);
        const response = await fetch(resolved);
        const html = await response.text();
        
        let title = "No Title";
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
            // Làm sạch tiêu đề (bỏ phần | Lazada.vn)
            title = title.replace(/\s*\|\s*Lazada\s*(?:Việt Nam|vn|\.vn)?$/i, "");
        }
        
        let price = 0;
        const priceMatch = html.match(/"pdt_price"\s*:\s*["']([^"']+)["']/i);
        if (priceMatch && priceMatch[1]) {
            const priceStr = priceMatch[1].replace(/[^0-9]/g, "");
            price = parseInt(priceStr) || 0;
        } else {
            const fallbackMatch = html.match(/"price"\s*:\s*["']([0-9.]+)["']/i);
            if (fallbackMatch && fallbackMatch[1]) {
                const priceStr = fallbackMatch[1].replace(/[^0-9]/g, "");
                price = parseInt(priceStr) || 0;
            }
        }
        
        return { title, price };
    } catch (e) {
        console.log(`[Lazada Details] Lỗi khi bóc tách thông tin: ${e.message}`);
    }
    return { title: "No Title", price: 0 };
}

// Hàm làm sạch URL Shopee để loại bỏ các tham số tracking thừa
function cleanShopeeUrl(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes("shopee.vn")) {
            let shopId = "";
            let itemId = "";

            const pathParts = urlObj.pathname.split("/").filter(Boolean);
            if (pathParts.length >= 2) {
                const last = pathParts[pathParts.length - 1];
                const prev = pathParts[pathParts.length - 2];
                if (/^\d+$/.test(last) && /^\d+$/.test(prev)) {
                    shopId = prev;
                    itemId = last;
                }
            }

            if (!shopId || !itemId) {
                const match = url.match(/-i\.(\d+)\.(\d+)/) || url.match(/i\.(\d+)\.(\d+)/);
                if (match) {
                    shopId = match[1];
                    itemId = match[2];
                }
            }

            if (shopId && itemId) {
                return `https://shopee.vn/product/${shopId}/${itemId}`;
            }
        }
        urlObj.search = "";
        urlObj.hash = "";
        return urlObj.toString();
    } catch (e) {
        return url;
    }
}

// Hàm lấy tiêu đề sản phẩm (Sử dụng User-Agent Facebook Crawler để tránh 403)
async function getProductDetails(url) {
    let title = "";
    let targetUrl = url;

    try {
        let shopId = "";
        let itemId = "";

        // Trích xuất shopId và itemId để tạo URL dạng canonical (tránh trang SPA của Shopee bị lỗi trống thông tin)
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        if (pathParts.length >= 2) {
            const last = pathParts[pathParts.length - 1];
            const prev = pathParts[pathParts.length - 2];
            if (/^\d+$/.test(last) && /^\d+$/.test(prev)) {
                shopId = prev;
                itemId = last;
            }
        }

        if (!shopId || !itemId) {
            const match = url.match(/-i\.(\d+)\.(\d+)/) || url.match(/i\.(\d+)\.(\d+)/);
            if (match) {
                shopId = match[1];
                itemId = match[2];
            }
        }

        if (shopId && itemId) {
            targetUrl = `https://shopee.vn/product/${shopId}/${itemId}`;
        }
    } catch (e) {
        // Fallback về url gốc
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_patched.html)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8"
            },
            signal: AbortSignal.timeout(6000)
        });
        const html = await response.text();

        const titleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i) || 
                           html.match(/content="([^"]+)"\s+property="og:title"/i) ||
                           html.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
        }
    } catch (e) {
        console.log(`[Chi tiết Sản phẩm] Không thể lấy thông tin sản phẩm từ ${targetUrl}: ${e.message}`);
    }
    return { title };
}

// Gọi API Shopee để tạo link Affiliate rút gọn (s.shopee.vn)
async function convertViaShopeeApi(originUrl, appId, secretKey, subId) {
    const endpoint = "https://open-api.affiliate.shopee.vn/api/v1/graphql";
    const payload = {
        query: `mutation {
            generateShortLink(input: { originLink: "${originUrl}"${subId ? `, subIds: ["${subId}"]` : ""} }) {
                shortLink
            }
        }`
    };

    const timestamp = Math.floor(Date.now() / 1000);
    const bodyStr = JSON.stringify(payload);
    const factor = `${appId}${timestamp}${bodyStr}${secretKey}`;
    const signature = crypto.createHash("sha256").update(factor).digest("hex");

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `SHA256 Credential=${appId},Timestamp=${timestamp},Signature=${signature}`
        },
        body: bodyStr
    });

    const result = await response.json();
    if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
    }
    const shortLink = result.data?.generateShortLink?.shortLink;
    if (!shortLink) {
        throw new Error("Shopee API không trả về link rút gọn");
    }
    return shortLink;
}

// Gọi API Accesstrade để tạo link Affiliate (Deeplink)
async function convertViaAccesstrade(originUrl, token, utmSource, utmContent) {
    let endpoint = `https://api.accesstrade.vn/v1/deeplinks?url=${encodeURIComponent(originUrl)}`;
    if (utmSource) {
        endpoint += `&utm_source=${encodeURIComponent(utmSource)}`;
    }
    if (utmContent) {
        endpoint += `&utm_content=${encodeURIComponent(utmContent)}`;
    }
    const response = await fetch(endpoint, {
        method: "GET",
        headers: {
            "Authorization": `Token ${token}`,
            "Content-Type": "application/json"
        }
    });

    const result = await response.json();
    if (result.data && result.data[0] && result.data[0].short_link) {
        return result.data[0].short_link;
    }
    if (result.message) {
        throw new Error(result.message);
    }
    throw new Error("Accesstrade không trả về link rút gọn");
}

// Hàm băm đơn giản để sinh hoa hồng ổn định cho cùng một sản phẩm
function getHashValue(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) & 0xFFFF;
    }
    return hash;
}

// Hàm trích xuất giá từ văn bản
function extractPriceFromText(text) {
    if (!text) return 0;
    const patterns = [
        /[đĐ₫]\s*(\d{1,3}(?:\.\d{3})+)/i,
        /(\d{1,3}(?:\.\d{3})+)\s*[đĐ₫]/i,
        /(\d{1,3}(?:\.\d{3})+)\s*VND/i,
        /[đĐ₫]\s*(\d{3,9})\b/i,
        /(\d{3,9})\s*[đĐ₫]/i,
        /\b(\d+)\s*k\b/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            let val = match[1].replace(/\./g, "").trim();
            let price = parseInt(val, 10);
            
            // Tránh khớp nhầm các thông số vàng Karat (10K, 14K, 18K, 24K) làm giá tiền
            if (pattern.source.includes("k\\b")) {
                const valInt = parseInt(val, 10);
                if ([10, 14, 18, 22, 24].includes(valInt)) {
                    const idx = text.toLowerCase().indexOf(match[0].toLowerCase());
                    const context = text.slice(Math.max(0, idx - 15), idx).toLowerCase();
                    if (context.match(/(vàng|gold|karat|carat|k|mạ|tuổi|nhẫn|lắc|vòng|bông tai|khuyên)/)) {
                        continue;
                    }
                }
            }

            if (pattern.source.includes("k\\b")) {
                price = price * 1000;
            }
            if (price > 1000 && price < 100000000) {
                return price;
            }
        }
    }
    return 0;
}

// Hàm kiểm tra tiêu đề sản phẩm hợp lệ (tránh lấy nhầm URL hoặc tiêu đề mặc định của Shopee)
function isValidProductName(name) {
    if (!name) return false;
    const trimmed = name.trim();
    if (trimmed.length < 3) return false;
    if (trimmed === "Shopee Việt Nam") return false;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return false;
    if (trimmed.includes("shopee.vn") || trimmed.includes("shope.ee") || trimmed.includes("shp.ee")) return false;
    return true;
}

// Hàm gắn tất cả sự kiện vào listener và xử lý mất kết nối/đăng nhập lại
function fetchAppsScriptJson(url) {
    return fetch(url).then(r => r.json()).catch(e => ({ success: false, error: e.message }));
}

function getYesterdayDateVN() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const pad = n => String(n).padStart(2, '0');
    return `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;
}

function formatDisplayDate(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
}

function formatVND(amount) {
    const num = Math.round(Number(amount) || 0);
    return num.toLocaleString('vi-VN') + 'đ';
}

process.on('uncaughtException', (err) => {
    console.error('⚠️ [BẢO VỆ BOT] Phát hiện lỗi ngoài dự kiến (uncaughtException):', err ? err.message : err);
});
function saveSpammerId(uid, config) {
    if (!uid) return;
    try {
        const configFile = "affiliate-config.json";
        if (existsSync(configFile)) {
            const currentConfig = JSON.parse(readFileSync(configFile, "utf8"));
            if (!currentConfig.blacklistNames) {
                currentConfig.blacklistNames = [];
            }
            const strUid = String(uid);
            if (!currentConfig.blacklistNames.includes(strUid)) {
                currentConfig.blacklistNames.push(strUid);
                writeFileSync(configFile, JSON.stringify(currentConfig, null, 2), "utf8");
                console.log(`🤖 [Blacklist Sync] Đã tự động lưu UID ${strUid} của kẻ spam vào blacklistNames trong cấu hình.`);
                config.blacklistNames = currentConfig.blacklistNames;
            }
        }
    } catch (err) {
        console.error("Lỗi tự động lưu UID vào file cấu hình:", err.message);
    }
}

function attachHandlers(api, config) {
    api.listener.on("message", async (msg) => {
        try {
            const text = extractTextFromMessage(msg);
            const groupId = msg.threadId;
            const senderName = msg.data.dName || "thành viên";
            const conversationType = msg.type === 1 ? "Nhóm" : "Cá nhân";

        if (msg.isSelf) {
            return; // Bỏ qua log tin nhắn của chính Bot cho gọn
        }

        // Chỉ xử lý và log tin nhắn từ các nhóm được cấu hình trong groupAffiliates.
        if (msg.type === 1 && config.groupAffiliates && Object.keys(config.groupAffiliates).length > 0 && !config.groupAffiliates[groupId]) {
            console.log(`[DEBUG] Đã chặn tin nhắn từ nhóm ${groupId} vì không có trong cấu hình groupAffiliates.`);
            return;
        }

        console.log(`[Nhận tin nhắn] [${conversationType}: ${groupId}] ${senderName}: "${text}" (isSelf: ${msg.isSelf})`);

        const senderId = msg.data.uidFrom;

        // Tự động lưu và đẩy Zalo ID thành viên lên Google Sheet ngay khi nhắn tin trong nhóm
        if (senderId && senderId !== "unknown" && !msg.isSelf && msg.type === 1) {
            saveUniqueUser(senderId, senderName, groupId);
        }
        const blacklistNames = config.blacklistNames || [];
        const matchesBlacklist = blacklistNames.some(item => 
            senderName.toLowerCase().includes(item.toLowerCase()) || (senderId && String(senderId) === String(item))
        );

        if (matchesBlacklist && msg.type === 1) { // Chỉ áp dụng trong nhóm (1: Group)
            console.log(`[Blacklist] Phát hiện thành viên trong danh sách đen gửi tin nhắn: ${senderName} (UID: ${senderId})`);
            saveSpammerId(senderId, config);
            
            let groupDetails = groupInfoCache[groupId];
            if (!groupDetails) {
                try {
                    const info = await api.getGroupInfo(groupId);
                    if (info?.gridInfoMap?.[groupId]) {
                        groupDetails = info.gridInfoMap[groupId];
                        groupInfoCache[groupId] = groupDetails;
                    }
                } catch (e) {
                    console.log(`[Cảnh báo] Không thể lấy thông tin nhóm: ${e.message}`);
                }
            }

            const creatorId = groupDetails?.creatorId;
            const adminIds = groupDetails?.adminIds || [];
            const isAdmin = (creatorId && String(senderId) === String(creatorId)) || (adminIds && adminIds.map(String).includes(String(senderId)));

            if (isAdmin) {
                console.log(`-> Bỏ qua vì người gửi trong blacklist là Chủ nhóm hoặc Admin.`);
            } else {
                const botOwnId = api.getOwnId ? api.getOwnId() : null;
                const isBotAdmin = botOwnId && (
                    (creatorId && String(botOwnId) === String(creatorId)) ||
                    (adminIds && adminIds.map(String).includes(String(botOwnId)))
                );

                if (isBotAdmin) {
                    try {
                        // 1. Thu hồi tin nhắn vi phạm
                        const deletePayload = {
                            threadId: groupId,
                            type: msg.type,
                            data: {
                                msgId: String(msg.data.msgId),
                                cliMsgId: String(msg.data.cliMsgId || msg.data.msgId),
                                uidFrom: String(msg.data.uidFrom)
                            }
                        };
                        await api.deleteMessage(deletePayload, false);
                        console.log(`[Blacklist] Đã thu hồi tin nhắn của ${senderName}`);
                    } catch (err) {
                        console.error(`[Blacklist] Thất bại khi thu hồi tin nhắn: ${err.message}`);
                    }

                    try {
                        // 2. Mời thành viên vi phạm khỏi nhóm
                        await api.removeUserFromGroup([senderId], groupId);
                        console.log(`[Blacklist] Đã mời ${senderName} khỏi nhóm`);
                    } catch (err) {
                        console.error(`[Blacklist] Thất bại khi mời thành viên khỏi nhóm: ${err.message}`);
                    }

                    try {
                        // 3. Block thành viên đó khỏi nhóm
                        await api.addGroupBlockedMember(senderId, groupId);
                        console.log(`[Blacklist] Đã chặn (block) ${senderName} khỏi nhóm`);
                    } catch (err) {
                        console.error(`[Blacklist] Thất bại khi block thành viên: ${err.message}`);
                    }
                }
                return;
            }
        }

        // --- KIỂM TRA TỪ KHÓA BỊ CHẶN (CHỈ THU HỒI TIN NHẮN SPAM) ---
        const blacklistKeywords = config.blacklistKeywords || [];
        const matchesKeyword = text && blacklistKeywords.some(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase())
        );

        if (matchesKeyword && msg.type === 1) { // Chỉ áp dụng trong nhóm (1: Group)
            console.log(`[Keyword Blacklist] Phát hiện tin nhắn chứa từ khóa bị chặn từ ${senderName} (UID: ${senderId}): "${text}"`);
            
            let groupDetails = groupInfoCache[groupId];
            if (!groupDetails) {
                try {
                    const info = await api.getGroupInfo(groupId);
                    if (info?.gridInfoMap?.[groupId]) {
                        groupDetails = info.gridInfoMap[groupId];
                        groupInfoCache[groupId] = groupDetails;
                    }
                } catch (e) {}
            }

            const creatorId = groupDetails?.creatorId;
            const adminIds = groupDetails?.adminIds || [];
            const isAdmin = (creatorId && String(senderId) === String(creatorId)) || (adminIds && adminIds.map(String).includes(String(senderId)));

            if (!isAdmin) {
                const botOwnId = api.getOwnId ? api.getOwnId() : null;
                const isBotAdmin = botOwnId && (
                    (creatorId && String(botOwnId) === String(creatorId)) ||
                    (adminIds && adminIds.map(String).includes(String(botOwnId)))
                );

                if (isBotAdmin) {
                    try {
                        const deletePayload = {
                            threadId: groupId,
                            type: msg.type,
                            data: {
                                msgId: String(msg.data.msgId),
                                cliMsgId: String(msg.data.cliMsgId || msg.data.msgId),
                                uidFrom: String(msg.data.uidFrom)
                            }
                        };
                        await api.deleteMessage(deletePayload, false);
                        console.log(`[Keyword Blacklist] Đã thu hồi tin nhắn chứa từ khóa rác của ${senderName}`);
                    } catch (err) {
                        console.error(`[Keyword Blacklist] Thất bại khi thu hồi tin nhắn: ${err.message}`);
                    }
                }
                return; // Kết thúc xử lý tin nhắn chứa từ khóa rác
            }
        }

        // --- XỬ LÝ LỆNH /dongbo (DÀNH CHO ADMIN) ---
        if (text && (text.trim().toLowerCase() === "/dongbo" || text.trim().toLowerCase() === "/sync")) {
            console.log(`[Command] Admin ${senderName} thực hiện lệnh đồng bộ dữ liệu từ Google Sheet & Zalo ID...`);
            try {
                const { execSync } = await import('child_process');
                execSync("node import_data_from_sheet.js", { stdio: 'inherit' });
                
                // Đồng bộ quét và đẩy toàn bộ Zalo ID thành viên nhóm lên Google Sheet
                syncGroupMembersToCsv(api, config).catch(e => {
                    console.error("[Command /dongbo] Lỗi đồng bộ Zalo ID:", e.message);
                });

                const replyText = `@${senderName} ✅ Đã đồng bộ thành công toàn bộ dữ liệu đơn hàng, hoa hồng & Zalo ID thành viên nhóm lên Google Sheet & VPS!`;
                await api.sendMessage({
                    msg: replyText,
                    mentions: [{ pos: 0, uid: msg.data.uidFrom, len: senderName.length + 1 }],
                    quote: msg.data
                }, groupId, msg.type);
            } catch(eSync) {
                console.error("Lỗi khi chạy lệnh đồng bộ:", eSync.message);
            }
            return;
        }

        // --- XỬ LÝ LỆNH CHỤP VÀ GỬI ẢNH BÁO CÁO GOOGLE SHEET (/baocao, /chupanh, /chupsheet) ---
        if (text && (
            text.trim().toLowerCase() === "/baocao" || 
            text.trim().toLowerCase() === "/chupanh" || 
            text.trim().toLowerCase() === "/chupsheet"
        )) {
            const senderUserId = msg.data.uidFrom || "unknown";
            console.log(`[Command] Nhận lệnh chụp ảnh báo cáo từ ${senderName} (UID: ${senderUserId})`);
            
            try {
                await api.sendMessage({
                    msg: `@${senderName} ⏳ Đang mở Google Sheet và chụp ảnh báo cáo mới nhất, sếp vui lòng chờ vài giây nhé...`,
                    mentions: [{ pos: 0, uid: senderUserId, len: senderName.length + 1 }]
                }, groupId, msg.type);

                const { execSync } = await import('child_process');
                const yesterdayStrIso = getYesterdayDateVN();
                execSync(`node capture_sheet.js ${yesterdayStrIso}`, { stdio: 'inherit' });
                
                const reportImgPath = resolve("assets/bao_cao_hang_ngay.jpg");
                if (existsSync(reportImgPath)) {
                    // Lấy mốc ngày mới nhất được chụp từ file last_report_date.txt (VD: 07/08)
                    let reportDateStr = "";
                    const dateFilePath = resolve("assets/last_report_date.txt");
                    if (existsSync(dateFilePath)) {
                        try { reportDateStr = readFileSync(dateFilePath, "utf8").trim(); } catch(e){}
                    }
                    if (!reportDateStr) {
                        reportDateStr = formatDisplayDate(yesterdayStrIso).substring(0, 5);
                    }

                    const reportCaption = `@All 🛍️✨ Em gửi cả nhà danh sách các đơn hàng đã ghi nhận hoa hồng ngày ${reportDateStr} nhé.\n\n` +
                                          `Cảm ơn cả nhà đã luôn ủng hộ và đồng hành cùng nhóm ạ! 🥰`;
                    
                    // Luôn đăng ảnh báo cáo và caption mới sang Nhóm chính (💎 Hoàn Tiền Shopee - Lazada- TikTok)
                    const mainGroupId = config.tiktokGroupId || config.scheduler?.targetGroupId || "2001332429948371738";
                    await api.sendMessage({
                        msg: reportCaption,
                        mentions: [{ pos: 0, uid: "-1", len: 4 }],
                        attachments: [reportImgPath]
                    }, mainGroupId, 1);
                    
                    console.log(`[Command /baocao] Đã chụp và phát ảnh báo cáo ngày ${reportDateStr} sang nhóm chính (${mainGroupId}) thành công!`);

                    // Nếu câu lệnh được gọi từ nhóm khác (VD: Nhóm test 792555261028526883) -> Báo xác nhận lại nhóm đó
                    if (String(groupId) !== String(mainGroupId)) {
                        await api.sendMessage({
                            msg: `@${senderName} ✅ Đã chụp và phát thông báo danh sách hoa hồng ngày ${reportDateStr} sang nhóm chính thành công!`,
                            mentions: [{ pos: 0, uid: senderUserId, len: senderName.length + 1 }]
                        }, groupId, msg.type);
                    }
                } else {
                    await api.sendMessage({
                        msg: `@${senderName} ❌ Không tìm thấy file ảnh báo cáo sau khi chụp. Vui lòng thử lại sau!`,
                        mentions: [{ pos: 0, uid: senderUserId, len: senderName.length + 1 }]
                    }, groupId, msg.type);
                }
            } catch (errReport) {
                console.error(`[Command /baocao] Lỗi: ${errReport.message}`);
                await api.sendMessage({
                    msg: `@${senderName} ❌ Lỗi khi chụp ảnh báo cáo Google Sheet: ${errReport.message}`,
                    mentions: [{ pos: 0, uid: senderUserId, len: senderName.length + 1 }]
                }, groupId, msg.type);
            }
            return;
        }

        // --- XỬ LÝ LỆNH /blacklist add [name/uid] hoặc /blacklist remove [name/uid] ---
        if (text && text.trim().toLowerCase().startsWith("/blacklist")) {
            const senderUserId = msg.data.uidFrom || "unknown";
            
            // Kiểm tra xem người gửi có phải Admin/Chủ nhóm hoặc có trong danh sách phân quyền không
            let groupDetails = groupInfoCache[groupId];
            if (!groupDetails && msg.type === 1) {
                try {
                    const info = await api.getGroupInfo(groupId);
                    if (info?.gridInfoMap?.[groupId]) {
                        groupDetails = info.gridInfoMap[groupId];
                        groupInfoCache[groupId] = groupDetails;
                    }
                } catch (e) {}
            }

            const creatorId = groupDetails?.creatorId;
            const adminIds = groupDetails?.adminIds || [];
            const isAuthorized = (creatorId && String(senderUserId) === String(creatorId)) ||
                                 (adminIds && adminIds.map(String).includes(String(senderUserId))) ||
                                 String(senderUserId) === "60961192439956996" || 
                                 String(senderUserId) === "487262173614365471";

            if (!isAuthorized) {
                console.log(`[Command] Từ chối lệnh /blacklist từ thành viên không có quyền Admin: ${senderName} (UID: ${senderUserId})`);
                return;
            }

            const parts = text.trim().split(/\s+/);
            const action = parts[1] ? parts[1].toLowerCase() : "";
            const value = parts.slice(2).join(" ").trim();

            if (!action || (action !== "add" && action !== "remove" && action !== "list")) {
                await api.sendMessage({ msg: "⚠️ Cú pháp không hợp lệ. Vui lòng sử dụng:\n- `/blacklist add [Tên_Zalo/UID]` để thêm vào danh sách đen.\n- `/blacklist remove [Tên_Zalo/UID]` để loại bỏ khỏi danh sách đen.\n- `/blacklist list` để xem danh sách." }, groupId, msg.type);
                return;
            }

            if (action === "list") {
                const list = config.blacklistNames || [];
                await api.sendMessage({ msg: `📋 Danh sách đen hiện tại (${list.length} mục):\n${list.length > 0 ? list.map((item, index) => `${index + 1}. ${item}`).join("\n") : "Trống (Chưa có ai)"}` }, groupId, msg.type);
                return;
            }

            if (!value) {
                await api.sendMessage({ msg: "⚠️ Vui lòng nhập Tên Zalo hoặc UID cần thêm/bớt." }, groupId, msg.type);
                return;
            }

            if (action === "add") {
                if (!config.blacklistNames) config.blacklistNames = [];
                if (config.blacklistNames.includes(value)) {
                    await api.sendMessage({ msg: `⚠️ "${value}" đã có sẵn trong danh sách đen.` }, groupId, msg.type);
                    return;
                }
                config.blacklistNames.push(value);
                try {
                    writeFileSync("affiliate-config.json", JSON.stringify(config, null, 2), "utf8");
                    await api.sendMessage({ msg: `✅ Đã thêm "${value}" vào danh sách đen thành công!` }, groupId, msg.type);
                    console.log(`[Blacklist Command] Đã thêm "${value}" vào danh sách đen.`);
                } catch (err) {
                    console.error(`[Blacklist Command] Lỗi ghi file config: ${err.message}`);
                    await api.sendMessage({ msg: `❌ Thất bại khi lưu cấu hình: ${err.message}` }, groupId, msg.type);
                }
            } else if (action === "remove") {
                if (!config.blacklistNames || !config.blacklistNames.includes(value)) {
                    await api.sendMessage({ msg: `⚠️ "${value}" không có trong danh sách đen.` }, groupId, msg.type);
                    return;
                }
                config.blacklistNames = config.blacklistNames.filter(item => item !== value);
                try {
                    writeFileSync("affiliate-config.json", JSON.stringify(config, null, 2), "utf8");
                    await api.sendMessage({ msg: `✅ Đã loại bỏ "${value}" khỏi danh sách đen thành công!` }, groupId, msg.type);
                    console.log(`[Blacklist Command] Đã loại bỏ "${value}" khỏi danh sách đen.`);
                } catch (err) {
                    console.error(`[Blacklist Command] Lỗi ghi file config: ${err.message}`);
                    await api.sendMessage({ msg: `❌ Thất bại khi lưu cấu hình: ${err.message}` }, groupId, msg.type);
                }
            }
            return;
        }

        // --- XỬ LÝ LỆNH /idzalo ---
        if (text && text.trim().toLowerCase() === "/idzalo") {
            const senderUserId = msg.data.uidFrom || "unknown";
            
            // Nếu người dùng gõ /idzalo trong nhóm chat chung -> Nhắc khách nhắn tin riêng cho Bot để bảo mật
            if (msg.type === 1) {
                const replyText = `@${senderName} ⚠️ Vì lý do bảo mật và riêng tư, vui lòng nhắn tin riêng (chat riêng 1-1) trực tiếp cho Bot và gửi lệnh /idzalo để lấy Zalo ID của bạn nhé!`;
                try {
                    await api.sendMessage({
                        msg: replyText,
                        mentions: [{ pos: 0, uid: senderUserId, len: senderName.length + 1 }]
                    }, groupId, msg.type);
                } catch (e) {}
                return;
            }

            console.log(`[Command Main] Nhận lệnh /idzalo riêng từ ${senderName} (UID: ${senderUserId})`);
            const webDomain = (config.customRedirectDomain || config.orderSearchWebUrl || "https://hoantienonline.io.vn").replace(/\/+$/, "");

            try {
                let isLinked = false;
                let userEmail = "";
                let userNameOnSheet = "";

                if (config.orderAppsScriptUrl) {
                    try {
                        const queryUrl = `${config.orderAppsScriptUrl}?action=getZaloUserInfo&zaloId=${senderUserId}&zaloName=${encodeURIComponent(senderName)}`;
                        const result = await fetchAppsScriptJson(queryUrl);
                        if (result && result.success && result.email) {
                            isLinked = true;
                            userEmail = result.email;
                            userNameOnSheet = result.name || "";
                        }
                    } catch (eInfo) {}
                }

                let replyText = "";
                if (isLinked) {
                    replyText = `@${senderName} ℹ️ Thông tin tài khoản của bạn:\n` +
                                 `🔹 Email: ${userEmail}\n` +
                                 (userNameOnSheet ? `🔹 Tên trên Sheet: ${userNameOnSheet}\n` : "") +
                                 `✅ Trạng thái: Đã liên kết tài khoản!\n\n` +
                                 `👇 Nhấn giữ tin nhắn số dưới đây để Sao chép Zalo ID:`;
                } else {
                    replyText = `@${senderName} ℹ️ Thông tin tài khoản của bạn:\n` +
                                 `❌ Trạng thái: Chưa liên kết tài khoản!\n\n` +
                                 `👉 Vui lòng đăng nhập Web tại ${webDomain} và thực hiện liên kết để tự động tích lũy và tra cứu hoa hồng nhé.\n\n` +
                                 `👇 Nhấn giữ tin nhắn số dưới đây để Sao chép Zalo ID:`;
                }

                await api.sendMessage({
                    msg: replyText,
                    mentions: [{ pos: 0, uid: senderUserId, len: senderName.length + 1 }]
                }, groupId, msg.type);

                // Gửi tin nhắn thứ 2 chứa duy nhất Zalo ID dạng số để khách dễ bấm giữ sao chép
                await api.sendMessage({ msg: String(senderUserId) }, groupId, msg.type);
            } catch (err) {
                console.error(`[Command Error] Lỗi xử lý /idzalo: ${err.message}`);
                await api.sendMessage({ msg: `@${senderName} 🆔 ID Zalo của bạn là: ${senderUserId}` }, groupId, msg.type);
                await api.sendMessage({ msg: String(senderUserId) }, groupId, msg.type);
            }
            return;
        }

        // --- XỬ LÝ LỆNH /donhang ---
        if (text && text.trim().toLowerCase() === "/donhang") {
            const senderUserId = msg.data.uidFrom || "unknown";
            console.log(`[Command] Nhận lệnh /donhang từ ${senderName} (UID: ${senderUserId})`);
            
            if (!config.orderAppsScriptUrl) {
                return;
            }
            
            try {
                const yesterdayStr = getYesterdayDateVN();
                const yesterdayDisplay = formatDisplayDate(yesterdayStr);
                
                const queryUrl = `${config.orderAppsScriptUrl}?action=searchBySubId&subId=${senderUserId}&date=${yesterdayStr}`;
                const result = await fetchAppsScriptJson(queryUrl);
                
                let replyText = "";
                let mentions = [{ pos: 0, uid: senderUserId, len: senderName.length + 1 }];
                
                if (result.success && result.data && result.data.length > 0) {
                    replyText = `@${senderName} 🛒 Danh sách đơn hàng ngày ${yesterdayDisplay} của bạn:\n`;
                    result.data.forEach((order, idx) => {
                        let shortName = order.itemName || "Sản phẩm";
                        if (shortName.length > 40) {
                            shortName = shortName.substring(0, 37).trim() + "...";
                        }
                        replyText += `${idx + 1}. ${shortName}\n` +
                                     `   🔹 Mã ĐH: ${order.orderId}\n` +
                                     `   🔹 Hoa hồng: +${formatVND(order.commission)}\n`;
                    });
                    replyText += `\n💰 Tổng hoa hồng: ${formatVND(result.totalCommission)}\n\n`;
                } else {
                    replyText = `@${senderName} 📪 Ngày ${yesterdayDisplay} anh/chị chưa có đơn hàng nào.\n\n`;
                }
                
                replyText += `Để xem đầy đủ các đơn hàng, vui lòng tra cứu tại: https://hoantienonline.io.vn`;
                
                await api.sendMessage({ msg: replyText, mentions: mentions }, groupId, msg.type);
            } catch (err) {
                console.error(`[Command Error] Lỗi khi tra cứu đơn hàng: ${err.message}`);
                try {
                    const fallbackMsg = `@${senderName} ⚠️ Chưa thể kết nối với hệ thống đơn hàng lúc này do đường truyền bận.\n\n` +
                                        `Anh/chị vui lòng truy cập website:\n` +
                                        `👉 https://hoantienonline.io.vn\n` +
                                        `để tra cứu danh sách đơn hàng thực tế nhé! 🛒✨`;
                    await api.sendMessage({ msg: fallbackMsg, mentions: [{ pos: 0, uid: senderUserId, len: senderName.length + 1 }] }, groupId, msg.type);
                } catch (e) {}
            }
            return;
        }

        // --- XỬ LÝ LỆNH /vitien ---
        if (text && text.trim().toLowerCase() === "/vitien") {
            const senderUserId = msg.data.uidFrom || "unknown";
            console.log(`[Command] Nhận lệnh /vitien từ ${senderName} (UID: ${senderUserId})`);
            
            if (!config.orderAppsScriptUrl) {
                return;
            }
            
            try {
                // Khởi chạy song song gọi API Google Sheets để tối ưu tốc độ phản hồi
                const queryUrl = `${config.orderAppsScriptUrl}?action=searchBySubId&subId=${senderUserId}`;
                const fetchPromise = fetchAppsScriptJson(queryUrl);

                // Lấy thông tin trưởng nhóm để tag (chạy song song)
                let leaderId = "";
                let leaderName = "Trưởng nhóm";
                const leaderPromise = (async () => {
                    if (msg.type === 1) { // Chỉ nhóm mới có trưởng nhóm
                        let groupDetails = groupInfoCache[groupId];
                        if (groupDetails && groupDetails._cachedLeaderName) {
                            leaderId = groupDetails.creatorId;
                            leaderName = groupDetails._cachedLeaderName;
                            return;
                        }
                        if (!groupDetails) {
                            try {
                                const info = await api.getGroupInfo(groupId);
                                if (info?.gridInfoMap?.[groupId]) {
                                    groupDetails = info.gridInfoMap[groupId];
                                    groupInfoCache[groupId] = groupDetails;
                                }
                            } catch (e) {}
                        }
                        leaderId = groupDetails?.creatorId;
                        if (leaderId) {
                            try {
                                const leaderInfo = await api.getUserInfo(leaderId);
                                const leaderProfile = leaderInfo?.changed_profiles?.[leaderId] || leaderInfo?.changed_profiles?.[`${leaderId}_0`] || {};
                                leaderName = leaderProfile.displayName || leaderProfile.zaloName || "Trưởng nhóm";
                                if (groupDetails) groupDetails._cachedLeaderName = leaderName;
                            } catch (e) {}
                        }
                    }
                })();

                const [result] = await Promise.all([fetchPromise, leaderPromise]);
                
                let replyText = "";
                let mentions = [{ pos: 0, uid: senderUserId, len: senderName.length + 1 }];
                const leaderMentionText = leaderId ? `@${leaderName}` : "Trưởng nhóm";

                if (result.success) {
                    let totalPending = 0;
                    let totalCompleted = 0;
                    let totalReceived = 0;
                    let totalComm = 0;

                    let totalReferralRewardAll = 0;
                    let totalReferralRewardPending = 0;
                    let referralCount = 0;

                    if (result.data && Array.isArray(result.data)) {
                        for (const order of result.data) {
                            const comm = Number(order.commission) || 0;
                            const st = String(order.orderStatus || "").toLowerCase().trim();
                            const paySt = String(order.paymentStatus || "").toLowerCase().trim();

                            if (order.orderId === "Thưởng GT") {
                                totalReferralRewardAll += comm;
                                referralCount++;
                                if (paySt !== "đã tt" && paySt !== "đã thanh toán") {
                                    totalReferralRewardPending += comm;
                                }
                                continue;
                            }

                            if (st.includes("hủy") || st.includes("invalid") || st.includes("cancelled")) {
                                continue; // Bỏ qua đơn hủy
                            }

                            totalComm += comm;

                            if (paySt.includes("đã tt") || paySt.includes("đã thanh toán")) {
                                totalReceived += comm;
                            } else if (st.includes("pending") || st.includes("chờ") || st.includes("đang")) {
                                totalPending += comm;
                            } else {
                                totalCompleted += comm;
                            }
                        }
                    } else {
                        const summary = result.summary || result;
                        totalPending = Number(summary.totalPending || result.totalPending) || 0;
                        totalCompleted = Number(summary.totalCompleted || result.totalCompleted) || 0;
                        totalReceived = Number(summary.totalReceived || result.totalReceived) || 0;
                        totalComm = Number(summary.totalCommission || result.totalCommission) || (totalPending + totalCompleted + totalReceived);
                    }

                    const totalReferralRewardReceived = totalReferralRewardAll - totalReferralRewardPending;
                    const totalOrderCommAll = Math.max(0, totalComm);
                    const totalOrderCommPending = Math.max(0, totalCompleted);
                    const totalOrderCommReceived = Math.max(0, totalReceived);
                    const totalAllReceived = totalOrderCommReceived + Math.max(0, totalReferralRewardReceived);

                    const refText = totalReferralRewardAll > 0 
                        ? ` (Tổng: ${formatVND(totalReferralRewardAll)} từ ${referralCount} người)` 
                        : "";
                    const recText = totalReferralRewardReceived > 0 
                        ? ` (Hoa hồng: ${formatVND(totalOrderCommReceived)} + Giới thiệu: ${formatVND(totalReferralRewardReceived)})` 
                        : "";

                    replyText = `@${senderName} 💳VÍ TIỀN CỦA SẾP!\n` +
                                `💰  Tổng hoa hồng:   ${formatVND(totalOrderCommAll)}\n` +
                                `⏳  Đang chờ xử lý:  ${formatVND(totalPending)}\n` +
                                `✅  Đã hoàn thành:   ${formatVND(totalOrderCommPending)}\n` +
                                `🎁  Thưởng giới thiệu: ${formatVND(totalReferralRewardPending)}${refText}\n` +
                                `💵  Có thể rút ngay: ${formatVND(totalCompleted)}\n` +
                                `📥  Đã nhận:        ${formatVND(totalAllReceived)}${recText}\n` +
                                `>  Đã trừ thuế shopee và chia bạn 8 phần mình 2 phần. Hợp tác vui vẻ lâu dài!\n` +
                                `>  Liên hệ Trưởng nhóm ${leaderMentionText} để rút tiền\n\n` +
                                `👉 Tra cứu ví tiền chi tiết tại: https://hoantienonline.io.vn`;

                    if (leaderId) {
                        const leaderPos = replyText.indexOf(leaderMentionText);
                        if (leaderPos !== -1) {
                            mentions.push({
                                pos: leaderPos,
                                uid: leaderId,
                                len: leaderMentionText.length
                            });
                        }
                    }
                } else {
                    replyText = `@${senderName} ⚠️ Chưa thể lấy thông tin ví tiền lúc này do đường truyền bận.\n\n` +
                                `Anh/chị vui lòng truy cập website:\n` +
                                `👉 https://hoantienonline.io.vn\n` +
                                `để tra cứu đầy đủ danh sách ví tiền & đơn hàng thực tế nhé! 🛒✨`;
                }

                await api.sendMessage({ msg: replyText, mentions: mentions }, groupId, msg.type);
            } catch (err) {
                console.error(`[Command Error] Lỗi khi tra cứu ví tiền: ${err.message}`);
                try {
                    const fallbackMsg = `@${senderName} ⚠️ Chưa thể lấy thông tin ví tiền lúc này do đường truyền bận.\n\n` +
                                        `Anh/chị vui lòng truy cập website:\n` +
                                        `👉 https://hoantienonline.io.vn\n` +
                                        `để tra cứu đầy đủ danh sách ví tiền & đơn hàng thực tế nhé! 🛒✨`;
                    await api.sendMessage({ msg: fallbackMsg, mentions: [{ pos: 0, uid: senderUserId, len: senderName.length + 1 }] }, groupId, msg.type);
                } catch (e) {}
            }
            return;
        }

        // --- XỬ LÝ LỆNH /thanhtoan ---
        if (text && text.trim().toLowerCase() === "/thanhtoan") {
            console.log(`[Command] Nhận lệnh /thanhtoan từ ${senderName} (UID: ${msg.data.uidFrom})`);
            
            const targetGroupId = (String(groupId) === "792555261028526883") 
                ? (config.tiktokGroupId || config.scheduler?.targetGroupId || "2001332429948371738") 
                : groupId;
            
            let leaderId = "";
            let leaderName = "Trưởng nhóm";
            try {
                let groupDetails = groupInfoCache[targetGroupId];
                if (!groupDetails) {
                    const info = await api.getGroupInfo(targetGroupId);
                    if (info?.gridInfoMap?.[targetGroupId]) {
                        groupDetails = info.gridInfoMap[targetGroupId];
                        groupInfoCache[targetGroupId] = groupDetails;
                    }
                }
                leaderId = groupDetails?.creatorId;
                if (leaderId) {
                    const leaderInfo = await api.getUserInfo(leaderId);
                    const leaderProfile = leaderInfo?.changed_profiles?.[leaderId] || leaderInfo?.changed_profiles?.[`${leaderId}_0`] || {};
                    leaderName = leaderProfile.displayName || leaderProfile.zaloName || "Trưởng nhóm";
                }
            } catch (e) {
                console.log(`[Cảnh báo] Không thể lấy thông tin Trưởng nhóm cho thông báo thanh toán: ${e.message}`);
            }

            const leaderText = leaderId ? `@${leaderName}` : "Trưởng nhóm";
            const notificationMsg = 
                `@All 📢 THÔNG BÁO THANH TOÁN HOA HỒNG\n\n` +
                `Hệ thống sẽ tự động thanh toán hoa hồng hằng ngày khi ví của anh/chị đủ điều kiện:\n\n` +
                `✅ Hoa hồng từ các đơn đã hoàn tất đạt trên 10.000đ\n\n` +
                `👉 Đối với số dư dưới 10.000đ, nếu anh/chị có nhu cầu rút tiền sớm, vui lòng liên hệ trực tiếp ${leaderText} để được hỗ trợ nhanh chóng nhé! 🥰\n\n` +
                `Anh/chị có thể kiểm tra nhanh bằng lệnh:\n\n` +
                `🔎 /donhang – Xem đơn hàng của ngày hôm trước\n` +
                `💰 /vitien – Kiểm tra số dư hoa hồng trong ví\n\n` +
                `👉 Tra cứu đầy đủ ví tiền và đơn hàng tại:\n` +
                `https://hoantienonline.io.vn`;
                
            try {
                const mentions = [{ pos: 0, uid: "-1", len: 4 }];
                if (leaderId) {
                    const leaderPos = notificationMsg.indexOf(`@${leaderName}`);
                    if (leaderPos !== -1) {
                        mentions.push({ pos: leaderPos, uid: leaderId, len: leaderName.length + 1 });
                    }
                }

                await api.sendMessage({ msg: notificationMsg, mentions: mentions }, targetGroupId, 1);
                console.log(`[Command] Đã gửi thông báo thanh toán hoa hồng vào nhóm (${targetGroupId})`);
                
                if (String(groupId) === "792555261028526883" && targetGroupId !== groupId) {
                    await api.sendMessage({ msg: `✅ Đã gửi thông báo thanh toán hoa hồng sang nhóm chính thành công!` }, groupId, 1);
                }
            } catch (err) {
                console.error(`[Command] Thất bại khi gửi thông báo thanh toán hoa hồng: ${err.message}`);
                try {
                    await api.sendMessage({ msg: `❌ Thất bại khi gửi thông báo: ${err.message}` }, groupId, 1);
                } catch(e){}
            }
            return;
        }

        // --- XỬ LÝ LỆNH TỰ ĐĂNG KÝ TÀI KHOẢN NGÂN HÀNG (/stk) ---
        if (text && text.trim().toLowerCase().startsWith("/stk")) {
            const senderUserId = msg.data.uidFrom || "unknown";
            
            // Nếu người dùng gõ /stk trong nhóm chat chung -> Nhắc khách nhắn tin riêng cho Bot để bảo mật thông tin ngân hàng
            if (msg.type === 1) {
                const replyText = `@${senderName} ⚠️ Vì lý do bảo mật thông tin tài khoản ngân hàng, vui lòng nhắn tin riêng (chat riêng 1-1) trực tiếp cho Bot và gửi lệnh /stk để cài đặt tài khoản nhận tiền hoàn nhé!`;
                try {
                    await api.sendMessage({
                        msg: replyText,
                        mentions: [{ pos: 0, uid: senderUserId, len: senderName.length + 1 }]
                    }, groupId, msg.type);
                } catch (e) {}
                return;
            }

            console.log(`[Command] Nhận lệnh cài đặt STK riêng từ ${senderName} (UID: ${senderUserId}): "${text}"`);
            
            if (!config.orderAppsScriptUrl) {
                return;
            }

            const BANK_MAP = {
                "vcb": "970436", "vietcombank": "970436", "vietcom": "970436",
                "ctg": "970415", "vietinbank": "970415", "vietin": "970415",
                "tcb": "970407", "techcombank": "970407", "techcom": "970407",
                "mb": "970422", "mbbank": "970422", "mb-bank": "970422",
                "bidv": "970418", "bid": "970418",
                "tpb": "970423", "tpbank": "970423", "tp-bank": "970423",
                "arg": "970405", "agribank": "970405", "agri": "970405",
                "vpb": "970432", "vpbank": "970432", "vp-bank": "970432",
                "stb": "970403", "sacombank": "970403", "sacon": "970403",
                "hdb": "970437", "hdbank": "970437",
                "lpb": "970449", "lpbank": "970449", "lienviet": "970449",
                "acb": "970416", "acbbank": "970416",
                "vib": "970441", "vibbank": "970441",
                "shb": "970443", "shbbank": "970443",
                "msb": "970426", "maritimebank": "970426",
                "timo": "963388", "cake": "546034",
                "momo": "971025", "viettelpay": "971005", "zalopay": "970469"
            };

            const BANK_PRETTY_NAMES = {
                "970436": "Vietcombank (VCB)",
                "970415": "VietinBank (CTG)",
                "970407": "Techcombank (TCB)",
                "970422": "MBBank (MB)",
                "970418": "BIDV",
                "970423": "TPBank (TPB)",
                "970405": "Agribank (ARG)",
                "970432": "VPBank (VPB)",
                "970403": "Sacombank (STB)",
                "970437": "HDBank (HDB)",
                "970449": "LPBank (LPB)",
                "970416": "ACB",
                "970441": "VIB",
                "970443": "SHB",
                "970426": "MSB",
                "963388": "Timo",
                "546034": "Cake by VPBank",
                "971025": "Ví MoMo",
                "971005": "Viettel Money",
                "970469": "Ví ZaloPay"
            };

            const parts = text.trim().split(/\s+/);
            const isGroup = msg.type === 1;
            const mentionPrefix = isGroup ? `@${senderName} ` : "";
            const mentions = isGroup ? [{ pos: 0, uid: senderUserId, len: senderName.length + 1 }] : [];

            if (parts.length < 3) {
                const instructions = 
                    `${mentionPrefix}⚠️ CÚ PHÁP ĐĂNG KÝ TÀI KHOẢN NHẬN TIỀN HOÀN:\n` +
                    `👉 /stk [Tên_Ngân_Hàng_Hoặc_Ví] [Số_Tài_Khoản_Hoặc_SĐT]\n\n` +
                    `Ví dụ ngân hàng: /stk vcb 1234567890\n` +
                    `Ví dụ ví MoMo: /stk momo 0912345678`;
                await api.sendMessage({ msg: instructions, mentions: mentions }, groupId, msg.type);
                return;
            }

            const rawBank = parts[1].toLowerCase().replace(/[^a-z0-9]/g, '');
            const rawAcc = parts[2].trim();

            const bankBin = BANK_MAP[rawBank];
            if (!bankBin) {
                const errorBank = `${mentionPrefix}❌ Ngân hàng "${parts[1]}" chưa hỗ trợ hoặc sai tên.\n` +
                                  `Các ngân hàng thông dụng: VCB, CTG, TCB, MB, BIDV, TPB, ARG, VPB, STB, HDB, LPB, ACB, VIB, SHB, MSB, MOMO, VIETTELPAY, ZALOPAY`;
                await api.sendMessage({ msg: errorBank, mentions: mentions }, groupId, msg.type);
                return;
            }

            const cleanAcc = rawAcc.replace(/[^0-9]/g, '');
            if (!/^\d{6,20}$/.test(cleanAcc)) {
                const errorAcc = `${mentionPrefix}❌ Số tài khoản / SĐT "${rawAcc}" không hợp lệ (phải từ 6-20 chữ số).`;
                await api.sendMessage({ msg: errorAcc, mentions: mentions }, groupId, msg.type);
                return;
            }

            const prettyBank = BANK_PRETTY_NAMES[bankBin] || parts[1].toUpperCase();

            // 1. Cập nhật ngay dữ liệu STK trên máy chủ VPS
            if (fs.existsSync("sheet_users_backup.json")) {
                try {
                    let sheetData = JSON.parse(fs.readFileSync("sheet_users_backup.json", "utf8"));
                    let usersList = (sheetData && sheetData.data) ? sheetData.data : ((sheetData && sheetData.users) ? sheetData.users : []);
                    let foundUser = false;
                    for (let u of usersList) {
                        if (String(u.userId) === String(senderUserId)) {
                            u.bankBin = bankBin;
                            u.bankAcc = rawAcc;
                            foundUser = true;
                            break;
                        }
                    }
                    if (!foundUser) {
                        usersList.push({
                            userId: senderUserId,
                            zaloName: senderName,
                            bankBin: bankBin,
                            bankAcc: rawAcc,
                            unpaid: 0,
                            paid: 0,
                            unpaidReferral: 0
                        });
                    }
                    if (sheetData.data) sheetData.data = usersList;
                    else if (sheetData.users) sheetData.users = usersList;
                    fs.writeFileSync("sheet_users_backup.json", JSON.stringify(sheetData, null, 2), "utf8");
                } catch(eBackup) {}
            }

            // 2. Gửi đồng bộ đẩy thông tin ngân hàng lên Google Sheet
            try {
                if (config.orderAppsScriptUrl) {
                    await fetch(config.orderAppsScriptUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: "save_bank_info",
                            userId: senderUserId,
                            bankBin: bankBin,
                            bankAcc: rawAcc,
                            zaloName: senderName
                        })
                    }).catch(() => {});
                }

                const successMsg = `${mentionPrefix}✅ ĐÃ ĐĂNG KÝ THÔNG TIN NHẬN TIỀN THÀNH CÔNG!\n` +
                                   `🏦 Ngân hàng: ${prettyBank}\n` +
                                   `💳 Số tài khoản: ${rawAcc}\n\n` +
                                   `Hệ thống sẽ tự động chuyển khoản tiền hoàn về tài khoản này của bạn khi sếp chuyển tiền!`;
                await api.sendMessage({ msg: successMsg, mentions: mentions }, groupId, msg.type);
            } catch (e) {
                console.error("Lỗi khi lưu thông tin STK:", e.message);
                const successMsg = `${mentionPrefix}✅ ĐÃ ĐĂNG KÝ THÔNG TIN NHẬN TIỀN THÀNH CÔNG!\n` +
                                   `🏦 Ngân hàng: ${prettyBank}\n` +
                                   `💳 Số tài khoản: ${rawAcc}\n\n` +
                                   `Hệ thống sẽ tự động chuyển khoản tiền hoàn về tài khoản này của bạn khi sếp chuyển tiền!`;
            }
            return;
        }

        // --- XỬ LÝ LỆNH ĐỒNG BỘ ĐƠN TIKTOK SHOP (/dongbotiktok HOẶC /dbtt) ---
        if (text && (text.trim().toLowerCase().startsWith("/dongbotiktok") || text.trim().toLowerCase().startsWith("/dbtt"))) {
            const senderId = msg.data.uidFrom;
            try {
                await api.sendMessage({
                    msg: `@${senderName} ⏳ Đang kết nối RioHub API để đồng bộ danh sách đơn hàng TikTok Shop lên Google Sheet, sếp vui lòng chờ giây lát...`,
                    mentions: [{
                        pos: 0,
                        uid: senderId,
                        len: senderName.length + 1
                    }]
                }, groupId, msg.type);

                const result = await syncTikTokOrdersViaRioHub();
                let replyMsg = "";
                if (result.success) {
                    replyMsg = `@${senderName} ✅ Đã đồng bộ thành công ${result.count} đơn hàng TikTok Shop từ RioHub lên Google Sheet! Các đơn hàng đã được khớp ID Zalo tự động. 🎉`;
                } else {
                    replyMsg = `@${senderName} ⚠️ Lỗi đồng bộ TikTok: ${result.message}`;
                }

                await api.sendMessage({
                    msg: replyMsg,
                    mentions: [{
                        pos: 0,
                        uid: senderId,
                        len: senderName.length + 1
                    }]
                }, groupId, msg.type);
            } catch (errSync) {
                console.error("Lỗi thực thi /dongbotiktok:", errSync.message);
            }
            return;
        }

        // --- XỬ LÝ CÚ PHÁP ĐĂNG KÝ NGƯỜI GIỚI THIỆU (/gt) ---
        if (text && (text.trim().startsWith("/gt ") || text.trim().startsWith("/gt"))) {
            const senderId = msg.data.uidFrom;
            
            // 1. Kiểm tra xem người dùng đã từng đăng ký người giới thiệu chưa
            let referrals = {};
            if (existsSync("referrals.json")) {
                try {
                    referrals = JSON.parse(readFileSync("referrals.json", "utf8"));
                } catch(e){}
            }
            if (referrals[senderId]) {
                try {
                    await api.sendMessage({
                        msg: `@${senderName} ⚠️ Bạn đã được ghi nhận người giới thiệu từ trước rồi nhé sếp!`,
                        mentions: [{ pos: 0, uid: senderId, len: senderName.length + 1 }]
                    }, groupId, msg.type);
                } catch(e){}
                return;
            }

            // 2. Kiểm tra xem có phải thành viên mới gia nhập nhóm gần đây không (Chống gian lận thành viên cũ)
            let joinDates = {};
            if (existsSync("member_join_dates.json")) {
                try {
                    joinDates = JSON.parse(readFileSync("member_join_dates.json", "utf8"));
                } catch (e) {}
            }
            const joinTime = joinDates[senderId];
            const limitDays = config.referralRegisterLimitDays || 3;
            const limitMs = limitDays * 24 * 60 * 60 * 1000;
            
            if (!joinTime || joinTime === "blocked") {
                try {
                    await api.sendMessage({
                        msg: `@${senderName} ⚠️ Lệnh này chỉ dành cho thành viên mới gia nhập nhóm khai báo người giới thiệu mình. Thành viên cũ không được sử dụng tính năng này sếp nhé!`,
                        mentions: [{ pos: 0, uid: senderId, len: senderName.length + 1 }]
                    }, groupId, msg.type);
                } catch(e){}
                return;
            } else if (Date.now() - joinTime > limitMs) {
                try {
                    await api.sendMessage({
                        msg: `@${senderName} ⚠️ Bạn đã tham gia nhóm được hơn ${limitDays} ngày. Lệnh này chỉ áp dụng cho thành viên mới gia nhập nhóm trong vòng ${limitDays} ngày đầu thôi sếp nhé!`,
                        mentions: [{ pos: 0, uid: senderId, len: senderName.length + 1 }]
                    }, groupId, msg.type);
                } catch(e){}
                return;
            }
            
            let referrerId = null;
            let referrerName = "Người giới thiệu";
            const mentions = msg.data?.mentions || [];
            
            if (mentions.length > 0) {
                referrerId = mentions[0].uid;
                try {
                    const refInfo = await api.getUserInfo(referrerId);
                    const refProfile = refInfo?.changed_profiles?.[referrerId] || refInfo?.changed_profiles?.[`${referrerId}_0`] || {};
                    referrerName = refProfile.displayName || refProfile.zaloName || "Người giới thiệu";
                } catch(e){}
            } else {
                const cmdText = text.trim();
                let searchName = "";
                if (cmdText.startsWith("/gt ")) {
                    searchName = cmdText.substring(4).trim();
                } else if (cmdText.startsWith("/gt")) {
                    searchName = cmdText.substring(3).trim();
                }
                
                if (searchName.startsWith("@")) {
                    searchName = searchName.substring(1).trim();
                }
                
                if (!searchName) {
                    try {
                        await api.sendMessage({
                            msg: `@${senderName} ⚠️ Vui lòng nhập tên người giới thiệu sau lệnh (Ví dụ: /gt Loan Lưu hoặc /gt @Loan Lưu)`,
                            mentions: [{ pos: 0, uid: senderId, len: senderName.length + 1 }]
                        }, groupId, msg.type);
                    } catch(e){}
                    return;
                }
                
                console.log(`[Referral] Đang tìm thành viên "${searchName}" trong nhóm ${groupId}...`);
                const matchedMember = await findGroupMemberByName(api, groupId, searchName);
                if (matchedMember) {
                    if (matchedMember.id === "multiple") {
                        try {
                            await api.sendMessage({
                                msg: `@${senderName} ⚠️ Có nhiều thành viên trong nhóm trùng hoặc chứa tên "${searchName}". Vui lòng gõ tên đầy đủ chính xác hơn của người giới thiệu nha!`,
                                mentions: [{ pos: 0, uid: senderId, len: senderName.length + 1 }]
                            }, groupId, msg.type);
                        } catch(e){}
                        return;
                    }
                    referrerId = matchedMember.id;
                    referrerName = matchedMember.name;
                    console.log(`[Referral] Đã tìm thấy: ${referrerName} (UID: ${referrerId})`);
                } else {
                    try {
                        await api.sendMessage({
                            msg: `@${senderName} ❌ Không tìm thấy thành viên nào có tên "${searchName}" trong nhóm. Vui lòng kiểm tra lại chính xác tên hiển thị Zalo của người giới thiệu nhé!`,
                            mentions: [{ pos: 0, uid: senderId, len: senderName.length + 1 }]
                        }, groupId, msg.type);
                    } catch(e){}
                    return;
                }
            }
            
            if (String(referrerId) === String(senderId)) {
                try {
                    await api.sendMessage({
                        msg: `@${senderName} ⚠️ Bạn không thể tự giới thiệu chính mình!`,
                        mentions: [{ pos: 0, uid: senderId, len: senderName.length + 1 }]
                    }, groupId, msg.type);
                } catch(e){}
                return;
            }

            // Kiểm tra giới thiệu chéo hoặc vòng tròn (Chống gian lận 2 người mới cùng vào đánh lệnh /gt cho nhau)
            let isCircular = false;
            let currentRef = referrerId;
            const visited = new Set([senderId]);
            
            while (currentRef) {
                if (visited.has(String(currentRef))) {
                    isCircular = true;
                    break;
                }
                visited.add(String(currentRef));
                const nextRefObj = referrals[currentRef];
                currentRef = nextRefObj ? nextRefObj.referrerId : null;
            }
            
            if (isCircular) {
                try {
                    await api.sendMessage({
                        msg: `@${senderName} ⚠️ Không thể ghi nhận! Hệ thống phát hiện giới thiệu chéo hoặc vòng tròn (Ví dụ: hai người mới không được khai báo giới thiệu chéo cho nhau). Vui lòng chọn người giới thiệu hợp lệ sếp nhé!`,
                        mentions: [{ pos: 0, uid: senderId, len: senderName.length + 1 }]
                    }, groupId, msg.type);
                } catch(e){}
                return;
            }
            
            // Lưu liên kết giới thiệu
            referrals[senderId] = {
                referrerId: referrerId,
                referrerName: referrerName,
                status: "pending",
                timestamp: Date.now()
            };
            
            try {
                writeFileSync("referrals.json", JSON.stringify(referrals, null, 2), "utf8");
            } catch(e) {}
            
            // Đồng bộ đăng ký giới thiệu lên Google Sheet
            if (config.orderAppsScriptUrl) {
                try {
                    await fetch(config.orderAppsScriptUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: "register_referral",
                            token: "DongChau@Secure2026",
                            newUserId: senderId,
                            newUserName: senderName,
                            referrerId: referrerId,
                            referrerName: referrerName
                        })
                    }).catch(() => {});
                } catch(e){}
            }
            
            try {
                const msgPrefix = `@${senderName} ✅ Đã ghi nhận `;
                const msgMiddle = ` là người giới thiệu của bạn. Người giới thiệu sẽ được cộng thưởng 10.000đ khi bạn phát sinh đơn hàng đầu tiên!`;
                const finalMsgText = `${msgPrefix}@${referrerName}${msgMiddle}`;
                
                await api.sendMessage({
                    msg: finalMsgText,
                    mentions: [
                        { pos: 0, uid: senderId, len: senderName.length + 1 },
                        { pos: msgPrefix.length, uid: referrerId, len: referrerName.length + 1 }
                    ]
                }, groupId, msg.type);
            } catch (e) {}
            return;
        }

        // =========================================================================
        // --- BỘ KIỂM DUYỆT TỰ ĐỘNG BẢO VỆ NHÓM CHAT (MODERATION ENGINE) ---
        // 1. MỜI VÀO NHÓM KHÁCH / LINK NHÓM ➔ THU HỒI + KICK + BLOCK + BLACKLIST
        // 2. GỬI ẢNH MÃ QR / QR NHÓM KHÁC ➔ THU HỒI + KICK + BLOCK + BLACKLIST
        // 3. NÓI BẬY / TỪ NGỮ TỤC TĨU ➔ THU HỒI + CẢNH BÁO VĂN MINH
        // =========================================================================
        if (msg.type === 1) { // 1: Nhóm (Group)
            const senderId = msg.data.uidFrom;
            const msgLower = (text || "").toLowerCase().trim();

            // 1. REGEX VÀ TỪ KHÓA MỜI SANG NHÓM KHÁC
            const GROUP_INVITE_REGEX = /(zalo\.me\/(g|j|b)\/[a-zA-Z0-9]+|zaloapp\.com\/g\/[a-zA-Z0-9]+|t\.me\/[a-zA-Z0-9_]+|chat\.whatsapp\.com\/[a-zA-Z0-9]+|facebook\.com\/groups\/|fb\.com\/groups\/)/i;
            const GROUP_INVITE_PHRASES = ["vào nhóm", "mời vào nhóm", "qua nhóm này", "nhóm hoàn tiền khác", "link nhóm", "mã qr nhóm", "mới lập nhóm", "vào group", "join group"];
            const isGroupInvite = GROUP_INVITE_REGEX.test(text) || GROUP_INVITE_PHRASES.some(phrase => msgLower.includes(phrase));

            // 2. PHÁT HIỆN GỬI ẢNH MÃ QR / MÃ QR NHÓM KHÁC
            const isPhotoAttachment = msg.data && (msg.data.msgType === "chat.photo" || (msg.data.attachments && msg.data.attachments.some(a => a.type === "photo" || a.type === "image")));
            const isQrKeyword = /(mã qr|ảnh qr|gửi qr|chụp qr|qr thanh toán|qr nhóm|scan qr|quét qr|qr code)/i.test(msgLower);
            const isQrImageSpam = isQrKeyword || (isPhotoAttachment && (msgLower.includes("qr") || msgLower.includes("nhóm") || msgLower.includes("quét") || msgLower.includes("vào")));

            // 3. DANH SÁCH TỪ NGỮ TỤC TĨU / NÓI BẬY
            const VIETNAMESE_BAD_WORDS = [
                "đm", "dm", "dmm", "đmm", "đmá", "dkm", "đkm", "đcm", "dcm", "vcl", "vkl", "vl", "cl", 
                "địt", "dit", "lồn", "lon", "buồi", "buoi", "cặc", "cac", "dái", "dai", "sủa", "đoái", 
                "mẹ kiếp", "đéo", "deo", "óc chó", "oc cho", "chó đẻ", "cho de", "mày chó", "thằng chó",
                "địt mẹ", "dit me", "đm mày", "dm may", "đái", "ỉa", "vc", "vkr", "đụ", "du ma", "địt bà"
            ];
            const isProfane = VIETNAMESE_BAD_WORDS.some(bw => {
                const regex = new RegExp(`(?:^|\\s)${bw}(?:$|\\s|\\!|\\?|\\.|\\,)`, "i");
                return regex.test(msgLower);
            });

            if (isGroupInvite || isQrImageSpam || isProfane) {
                let groupDetails = groupInfoCache[groupId];
                if (!groupDetails) {
                    try {
                        const info = await api.getGroupInfo(groupId);
                        if (info?.gridInfoMap?.[groupId]) {
                            groupDetails = info.gridInfoMap[groupId];
                            groupInfoCache[groupId] = groupDetails;
                        }
                    } catch (e) {}
                }

                const creatorId = groupDetails?.creatorId;
                const adminIds = groupDetails?.adminIds || [];
                const isAdmin = (creatorId && String(senderId) === String(creatorId)) || (adminIds && adminIds.map(String).includes(String(senderId)));

                if (!isAdmin) {
                    const botOwnId = api.getOwnId ? api.getOwnId() : null;
                    const isBotAdmin = botOwnId && (
                        (creatorId && String(botOwnId) === String(creatorId)) ||
                        (adminIds && adminIds.map(String).includes(String(botOwnId)))
                    );

                    // A. NẾU LÀ GỬI LINK/LỜI MỜI SANG NHÓM KHÁCH HOẶC GỬI ẢNH MÃ QR NHÓM ➔ KICK + BLOCK + BLACKLIST
                    if (isGroupInvite || isQrImageSpam) {
                        const violationType = isQrImageSpam ? "gửi ảnh/mã QR nhóm khác" : "gửi link/lời mời sang nhóm khác";
                        console.log(`[Moderation] Phát hiện vi phạm ${violationType} từ ${senderName} (UID: ${senderId})`);
                        
                        saveSpammerId(senderId, config);

                        if (isBotAdmin) {
                            try {
                                const undoPayload = { msgId: Number(msg.data.msgId), cliMsgId: Number(msg.data.cliMsgId || msg.data.msgId) };
                                await api.undo(undoPayload, groupId, msg.type);
                            } catch (e) {}
                            try { await api.removeUserFromGroup([senderId], groupId); } catch (e) {}
                            try { await api.addGroupBlockedMember(senderId, groupId); } catch (e) {}

                            try {
                                const warnText = `⛔ Đã tự động thu hồi tin nhắn và MỜI KHỎI NHÓM thành viên @${senderName} do vi phạm ${violationType}.`;
                                await api.sendMessage({
                                    msg: warnText,
                                    mentions: [{ pos: warnText.indexOf(`@${senderName}`), uid: senderId, len: senderName.length + 1 }]
                                }, groupId, msg.type);
                            } catch (e) {}
                        } else {
                            try {
                                const warnText = `⚠️ Cảnh báo: Thành viên @${senderName} vừa vi phạm ${violationType}. Nhờ Trưởng/Phó nhóm kiểm tra và KICK thành viên này giúp em nhé!`;
                                await api.sendMessage({
                                    msg: warnText,
                                    mentions: [{ pos: warnText.indexOf(`@${senderName}`), uid: senderId, len: senderName.length + 1 }]
                                }, groupId, msg.type);
                            } catch (e) {}
                        }
                        return;
                    }

                    // B. NẾU LÀ NÓI BẬY / TỪ NGỮ TỤC TĨU ➔ THU HỒI + CẢNH BÁO VĂN MINH
                    if (isProfane) {
                        console.log(`[Moderation] Phát hiện từ ngữ tục tĩu từ ${senderName} (UID: ${senderId}): "${text}"`);
                        if (isBotAdmin) {
                            try {
                                const undoPayload = { msgId: Number(msg.data.msgId), cliMsgId: Number(msg.data.cliMsgId || msg.data.msgId) };
                                await api.undo(undoPayload, groupId, msg.type);
                            } catch (e) {}
                        }
                        try {
                            const warnText = `@${senderName} ⚠️ Vui lòng giữ văn hóa giao tiếp văn minh, không sử dụng từ ngữ tục tĩu trong nhóm chat nhé sếp!`;
                            await api.sendMessage({
                                msg: warnText,
                                mentions: [{ pos: 0, uid: senderId, len: senderName.length + 1 }]
                            }, groupId, msg.type);
                        } catch (e) {}
                        return;
                    }
                }
            }
        }

function estimateLazadaRate(productName) {
    if (!productName) return 4.0;
    const name = productName.toLowerCase();
    
    if (name.includes("điện thoại") || name.includes("iphone") || name.includes("samsung") || 
        name.includes("oppo") || name.includes("xiaomi") || name.includes("realme") || 
        name.includes("laptop") || name.includes("máy tính") || name.includes("tivi") || 
        name.includes("ipad") || name.includes("tablet") || name.includes("macbook")) {
      return 1.0;
    }
    
    if (name.includes("tai nghe") || name.includes("sạc") || name.includes("cáp") || 
        name.includes("cường lực") || name.includes("ốp lưng") || name.includes("chuột") || 
        name.includes("bàn phím") || name.includes("thẻ nhớ") || name.includes("usb") || 
        name.includes("loa bluetooth") || name.includes("router") || name.includes("camera")) {
      return 2.0;
    }
    
    if (name.includes("váy") || name.includes("đầm") || name.includes("áo") || 
        name.includes("quần") || name.includes("tui") || name.includes("túi") || name.includes("giày") || 
        name.includes("ví") || name.includes("thời trang") || name.includes("giordano") || 
        name.includes("balo") || name.includes("kính") || name.includes("nhẫn") || 
        name.includes("vòng") || name.includes("trang sức") || name.includes("thắt lưng")) {
      return 4.0;
    }
    
    if (name.includes("son") || name.includes("kem dưỡng") || name.includes("sữa rửa mặt") || 
        name.includes("nước hoa") || name.includes("mỹ phẩm") || name.includes("serum") || 
        name.includes("dầu gội") || name.includes("sữa tắm") || name.includes("makeup")) {
      return 4.0;
    }
    
    if (name.includes("tã") || name.includes("bỉm") || name.includes("sữa bột") || 
        name.includes("đồ chơi") || name.includes("nước giặt") || name.includes("gia vị") || 
        name.includes("đồ dùng nhà bếp") || name.includes("nội thất") || name.includes("sách")) {
      return 3.0;
    }
    
    return 4.0;
}

async function fetchLazadaRateDirectly(rawUrl, config) {
    try {
        let productName = "";
        let imageUrl = "";
        
        try {
            const shortRes = await fetch(rawUrl, {
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
            });
            if (shortRes.status === 200) {
                const html = await shortRes.text();
                const titleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i) || 
                                   html.match(/content="([^"]+)"\s+property="og:title"/i);
                const imgMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) || 
                                 html.match(/content="([^"]+)"\s+property="og:image"/i);
                if (titleMatch) {
                    let rawTitle = titleMatch[1];
                    rawTitle = rawTitle.replace(/^(?:\u200b)?Thủ tục thanh toán\s+/i, "");
                    rawTitle = rawTitle.replace(/\s*Mua ngay tại Lazada!\s*$/i, "");
                    productName = rawTitle.trim();
                }
                if (imgMatch) {
                    imageUrl = imgMatch[1];
                }
            }
        } catch(eShort) {}

        const lzdCfg = (config && config.lazada) ? config.lazada : {};
        const appKey = lzdCfg.appKey || "105827";
        const appSecret = lzdCfg.appSecret || "r8ZMKhPxu1JZUCwTUBVMJiJnZKjhWeQF";
        const userToken = lzdCfg.accessToken || "c114183301c74ba3be1f69ad58a53b23";

        const configData = new URLSearchParams();
        configData.append("save_config", "1");
        configData.append("app_key", appKey);
        configData.append("app_secret", appSecret);
        configData.append("user_token", userToken);
        configData.append("base_url", "https://api.lazada.vn");

        const resConfig = await fetch("https://addlivetag.com/lazada-affiliate-api/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            body: configData.toString()
        });

        const setCookie = resConfig.headers.get("set-cookie") || "";

        const linkData = new URLSearchParams();
        linkData.append("action", "get_tracking_link");
        linkData.append("product_input", rawUrl);

        const resLink = await fetch("https://addlivetag.com/lazada-affiliate-api/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest",
                "Cookie": setCookie,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            body: linkData.toString()
        });

        const json = await resLink.json();
        let price = 0;
        let rate = 0;

        const resolvedUrl = json.analysis ? json.analysis.resolved_url : null;
        
        if (json.data && json.data.result && json.data.result.data) {
            const list = json.data.result.data.productBatchGetLinkInfoList || [];
            if (list.length > 0) {
                const item = list[0];
                const commStr = item.regularCommission || item.offerCommission || "";
                const rVal = parseFloat(commStr.replace("%", "").replace(",", ".")) || 0;
                if (rVal > 0) rate = rVal;
                if (item.productName && !productName) productName = item.productName;
            }
        }

        if (resolvedUrl) {
            if (!productName) {
                try {
                    const matchSlug = resolvedUrl.match(/\/products\/([a-zA-Z0-9-]+)-i\d+/);
                    if (matchSlug) {
                        productName = matchSlug[1].replace(/-/g, " ").trim();
                        productName = productName.replace(/\b\w/g, c => c.toUpperCase());
                    }
                } catch(eSlug) {}
            }
            
            try {
                const htmlRes = await fetch(resolvedUrl, {
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
                });
                if (htmlRes.status === 200) {
                    const html = await htmlRes.text();
                    const matchPdp = html.match(/var pdpTrackingData = "([\s\S]*?)";/);
                    if (matchPdp) {
                        try {
                            const jsonStr = JSON.parse(`"${matchPdp[1]}"`);
                            const pdpData = JSON.parse(jsonStr);
                            if (pdpData.pdt_price) {
                                price = parseInt(String(pdpData.pdt_price).replace(/[^0-9]/g, ""), 10) || 0;
                            }
                            if (pdpData.pdt_name && !productName) productName = pdpData.pdt_name;
                            if (pdpData.pdt_photo && !imageUrl) {
                                imageUrl = pdpData.pdt_photo.indexOf("//") === 0 ? "https:" + pdpData.pdt_photo : pdpData.pdt_photo;
                            }
                        } catch(eJson) {}
                    }
                }
            } catch(eHtml) {}
        }

        let isEstimated = false;
        if (rate === 0 || rate === 8.0) {
            rate = estimateLazadaRate(productName);
            isEstimated = true;
        }
        return {
            success: true,
            rate: rate,
            isEstimated: isEstimated,
            price: price,
            commissionAmount: price > 0 ? Math.round(price * rate / 100) : 0,
            formattedRate: rate ? `${rate}%` : "",
            affiliateLink: resolvedUrl || rawUrl,
            productName: productName || "Sản phẩm Lazada",
            imageUrl: imageUrl
        };
    } catch (err) {
        console.error("Lỗi fetchLazadaRateDirectly:", err);
        return null;
    }
}

        // KHÔNG chuyển đổi link trong tin nhắn riêng (Private Chat). Chỉ chuyển đổi link khi tin nhắn gửi trong NHÓM.
        if (msg.type !== 1) {
            console.log(`-> Bỏ qua chuyển đổi link vì tin nhắn được gửi trong Chat riêng cá nhân (Chỉ nhận câu lệnh).`);
            return;
        }

        const matchedShopee = text.match(SHOPEE_REGEX);
        const matchedLazada = (config.enableLazada !== false && isTargetGroup(groupId)) ? text.match(LAZADA_REGEX) : null;
        const matchedTikTok = (config.enableTikTok !== false) ? text.match(TIKTOK_REGEX) : null;

        if ((!matchedShopee || matchedShopee.length === 0) && (!matchedLazada || matchedLazada.length === 0) && (!matchedTikTok || matchedTikTok.length === 0)) {
            return;
        }

        const isLazada = matchedLazada && matchedLazada.length > 0;
        const isTikTok = !isLazada && matchedTikTok && matchedTikTok.length > 0;
        const matchedUrls = isLazada ? matchedLazada : (isTikTok ? matchedTikTok : matchedShopee);
        const platformName = isLazada ? "Lazada" : (isTikTok ? "TikTok" : "Shopee");

        // Bỏ qua nếu tin nhắn gửi trong nhóm bởi Chủ nhóm (Creator)
        if (msg.type === 1) { // 1: Nhóm (Group)
            let groupDetails = groupInfoCache[groupId];
            if (!groupDetails) {
                try {
                    console.log(`-> Đang lấy thông tin nhóm ${groupId} để kiểm tra quyền chủ nhóm...`);
                    const info = await api.getGroupInfo(groupId);
                    if (info?.gridInfoMap?.[groupId]) {
                        groupDetails = info.gridInfoMap[groupId];
                        groupInfoCache[groupId] = groupDetails;
                    }
                } catch (e) {
                    console.log(`[Cảnh báo] Không thể lấy thông tin nhóm: ${e.message}`);
                }
            }

            if (groupDetails && groupDetails.creatorId && String(msg.data.uidFrom) === String(groupDetails.creatorId) && !isTargetGroup(groupId)) {
                console.log(`-> Bỏ qua vì tin nhắn gửi từ Chủ nhóm (creatorId: ${groupDetails.creatorId}).`);
                return;
            }
        }

        console.log(`-> Phát hiện link ${platformName} cần chuyển đổi: ${matchedUrls[0]}`);

        try {
            const rawUrl = matchedUrls[0];
            let resolvedUrl = await resolveRedirect(rawUrl);
            if (!isLazada) {
                resolvedUrl = cleanShopeeUrl(resolvedUrl);
            }
            console.log(`-> Phân giải link gốc (đã làm sạch): ${resolvedUrl}`);

            // Kiểm tra nếu là link video Shopee hoặc Shopee Live (Shopee Livestream)
            const isShopeeVideo = !isLazada && !isTikTok && (
                /sv\.shopee\.vn|share-video|\/video\b/i.test(rawUrl) || 
                /sv\.shopee\.vn|share-video|\/video\b/i.test(resolvedUrl)
            );
            const isShopeeLive = !isLazada && !isTikTok && (
                /live\.shopee\.vn|\/live\b/i.test(rawUrl) || 
                /live\.shopee\.vn|\/live\b/i.test(resolvedUrl)
            );

            if (isShopeeVideo || isShopeeLive) {
                console.log(`-> Bỏ qua vì đây là link video/live Shopee: ${resolvedUrl}`);
                const cacheReminder = `\n\n💡 Mẹo nhỏ: Nếu lỡ bấm xem Video/Live, bạn nhớ đóng app Shopee -> Mở lại -> Vào mục Tôi -> ⚙️ Cài đặt -> Giới thiệu -> Bấm "Xóa bộ nhớ đệm" (cache) 2-3 lần trước khi bấm lại link hoàn tiền để tránh bị mất hoa hồng nhé ạ! 🥰`;
                const errorMsg = isShopeeLive 
                    ? `@${senderName} ⚠️ Rất tiếc! Đơn hàng mua qua Livestream Shopee không được hỗ trợ hoàn tiền đâu ạ. Bạn vui lòng gửi lại link sản phẩm gốc giúp em nhé!${cacheReminder}`
                    : `@${senderName} ⚠️ Rất tiếc! Đơn hàng mua qua Shopee Video không được hỗ trợ hoàn tiền đâu ạ. Bạn vui lòng gửi lại link sản phẩm gốc giúp em nhé!${cacheReminder}`;
                
                await api.sendMessage({
                    msg: errorMsg,
                    mentions: [{ pos: 0, uid: msg.data.uidFrom, len: senderName.length + 1 }]
                }, groupId, msg.type);
                return;
            }

            // Bước 1: Tổng hợp Zalo User ID của người đăng link vào file Excel (CSV)
            const senderUserId = msg.data.uidFrom || "unknown";
            saveUniqueUser(senderUserId, senderName, groupId);

            // Bước 2: Tạo link affiliate và lấy hoa hồng
            let affiliateLink = "";
            let productName = "";
            let formattedComm2 = "";

            if (isLazada) {
                const isExtensionActive = (Date.now() - lastExtensionActiveTime) < 5000;
                if (isExtensionActive) {
                    try {
                        console.log("-> Đang yêu cầu Chrome Extension lấy link và hoa hồng Lazada...");
                        const cdpData = await getLazadaDetailsViaExtension(resolvedUrl, senderUserId);
                        if (cdpData) {
                            console.log("[Lazada CDP Data Received]:", JSON.stringify(cdpData, null, 2));
                            affiliateLink = cdpData.trackingLink || "";
                            productName = cdpData.productName || "";
                            
                            let lzdDetails = null;
                            if (!productName || productName === "No Brand") {
                                console.log("-> Tên sản phẩm Lazada là 'No Brand'. Đang tự động tải tiêu đề và giá từ trang gốc...");
                                try {
                                    lzdDetails = await fetchLazadaDetails(resolvedUrl);
                                    if (lzdDetails) {
                                        if (lzdDetails.title && lzdDetails.title !== "No Title") {
                                            productName = lzdDetails.title;
                                            console.log(`-> Đã lấy thành công tiêu đề thay thế: "${productName}"`);
                                        }
                                    }
                                } catch (e) {
                                    console.log(`-> Lỗi khi lấy thông tin thay thế Lazada: ${e.message}`);
                                }
                            }
                            
                            const commRate = cdpData.commissionRate;
                            if (commRate) {
                                const cdpRate = parseFloat(String(commRate).replace(/%/g, "")) || 0;
                                if (cdpRate > 0) {
                                    formattedComm2 = `${cdpRate}% 💰`;
                                } else {
                                    formattedComm2 = `${commRate}${String(commRate).includes("%") ? "" : "%"} 💰`;
                                }
                            }
                            console.log(`-> Đã lấy thành công link Lazada từ Extension: ${affiliateLink}, hoa hồng: ${formattedComm2}`);
                        }
                    } catch (err) {
                        console.log(`[Lazada] Lấy dữ liệu từ Extension thất bại: ${err.message}`);
                    }
                }

                // Dự phòng: Nếu Extension chưa active hoặc không trả về link, tự động gọi API trực tiếp tới addlivetag.com
                if (!affiliateLink) {
                    console.log("-> Thử chuyển đổi link Lazada trực tiếp qua Server API addlivetag.com...");
                    try {
                        const directLzd = await fetchLazadaRateDirectly(rawUrl, config);
                        if (directLzd && directLzd.affiliateLink) {
                            affiliateLink = directLzd.affiliateLink;
                            if (directLzd.productName && (!productName || productName === "No Brand")) {
                                productName = directLzd.productName;
                            }
                            if (directLzd.formattedRate) {
                                formattedComm2 = `${directLzd.formattedRate} 💰`;
                            }
                            console.log(`-> [Lazada Direct API] Chuyển đổi thành công! Link=${affiliateLink}, Hoa Hồng=${formattedComm2}`);
                        }
                    } catch (dErr) {
                        console.log(`-> [Lazada Direct API] Lỗi: ${dErr.message}`);
                    }
                }

                if (!affiliateLink) {
                    let errorMsg = `@${senderName} ⚠️ Không thể tạo link tiếp thị liên kết Lazada.\n`;
                    errorMsg += `Vui lòng kiểm tra lại cấu hình API Lazada trên trang addlivetag.com/lazada-affiliate-api/ hoặc đảm bảo tài khoản đã được cấp quyền nhé!`;
                    const replyPayload = {
                        msg: errorMsg,
                        mentions: [
                            {
                                pos: 0,
                                uid: msg.data.uidFrom,
                                len: senderName.length + 1
                            }
                        ]
                    };
                    await api.sendMessage(replyPayload, groupId, msg.type);
                    return;
                }
            } else if (isTikTok) {
                const isTikTokLive = /\/live\b/i.test(resolvedUrl) || /\/live\b/i.test(rawUrl);
                const isTikTokVideo = /\/video\b/i.test(resolvedUrl) || /\/video\b/i.test(rawUrl) || /\/v\//i.test(resolvedUrl) || /\/v\//i.test(rawUrl);
                const isTikTokPhoto = /\/photo\b/i.test(resolvedUrl) || /\/photo\b/i.test(rawUrl);

                if (isTikTokLive || isTikTokVideo || isTikTokPhoto) {
                    console.log(`-> Bỏ qua vì đây là link Live/Video/Photo TikTok: ${resolvedUrl}`);
                    const tiktokErrMsg = isTikTokLive 
                        ? `@${senderName} ⚠️ Livestream TikTok không được hoàn tiền đâu ạ. Sếp gửi lại link sản phẩm nhé! 🥰`
                        : `@${senderName} ⚠️ Video/Photo TikTok không được hoàn tiền đâu ạ. Sếp gửi lại link sản phẩm nhé! 🥰`;
                    await api.sendMessage({
                        msg: tiktokErrMsg,
                        mentions: [{ pos: 0, uid: msg.data.uidFrom, len: senderName.length + 1 }]
                    }, groupId, msg.type);
                    return;
                }

                console.log("-> Đang chuyển đổi link TikTok qua RioHub API...");
                try {
                    const rioResult = await convertTikTokViaRioHub(rawUrl, senderUserId, resolvedUrl);
                    if (rioResult && rioResult.success) {
                        affiliateLink = rioResult.affiliateLink;
                        productName = rioResult.productName;
                        formattedComm2 = rioResult.formattedComm2;
                    } else {
                        const rawErr = rioResult?.errorMsg || "⚠️ Sản phẩm TikTok này hiện tại không có hoa hồng tiếp thị liên kết. Sếp vui lòng chọn sản phẩm khác nhé!";
                        const cleanErr = rawErr.replace(/^⚠️\s*/, "");
                        const errReply = `@${senderName} ⚠️ ${cleanErr}`;
                        await api.sendMessage({ msg: errReply, mentions: [{ pos: 0, uid: msg.data.uidFrom, len: senderName.length + 1 }] }, groupId, msg.type);
                        return;
                    }
                } catch (err) {
                    console.error(`[TikTok RioHub] Lỗi: ${err.message}`);
                    await api.sendMessage({ msg: `@${senderName} ⚠️ Lỗi chuyển đổi TikTok: ${err.message}`, mentions: [{ pos: 0, uid: msg.data.uidFrom, len: senderName.length + 1 }] }, groupId, msg.type);
                    return;
                }
            } else {
                const subId = senderUserId;

                // Xác định Affiliate ID mặc định (17359760464) hoặc theo cấu hình riêng
                let affId = config.manual?.affiliateId || "17359760464";
                if (config.groupAffiliates && config.groupAffiliates[groupId]) {
                    const customAff = config.groupAffiliates[groupId];
                    if (customAff && customAff !== groupId && customAff !== true && customAff !== "true") {
                        affId = customAff;
                        console.log(`-> Nhóm Zalo ${groupId} sử dụng Affiliate ID riêng: ${affId}`);
                    } else {
                        console.log(`-> Sử dụng Shopee Affiliate ID chính thức: ${affId} | SubID (Zalo ID): ${subId}`);
                    }
                }

                if (config.provider === "manual") {
                    affiliateLink = `https://s.shopee.vn/an_redir?origin_link=${encodeURIComponent(resolvedUrl)}&affiliate_id=${affId}&sub_id=${subId}`;
                } else if (config.provider === "shopee_api") {
                    affiliateLink = await convertViaShopeeApi(
                        resolvedUrl,
                        config.shopee.appId,
                        config.shopee.secretKey,
                        subId
                    ).catch(() => "");
                } else if (config.provider === "accesstrade") {
                    affiliateLink = await convertViaAccesstrade(
                        resolvedUrl,
                        config.accesstrade.token,
                        config.accesstrade.utmSource,
                        senderUserId
                    ).catch(() => "");
                }

                if (!affiliateLink) {
                    affiliateLink = `https://s.shopee.vn/an_redir?origin_link=${encodeURIComponent(resolvedUrl)}&affiliate_id=${affId}&sub_id=${subId}`;
                }

                let ids = getShopItemId(resolvedUrl);
                const itemId = ids ? ids.itemid : null;
                const cacheTtl = (config.shopee?.cacheTtlMinutes || 10) * 60 * 1000;
                let cachedData = null;

                if (itemId && productCache.has(itemId)) {
                    const cached = productCache.get(itemId);
                    if (Date.now() - cached.timestamp < cacheTtl) {
                        cachedData = cached.data;
                        productName = cachedData.name;
                        console.log(`-> Tìm thấy sản phẩm ${itemId} trong Memory Cache.`);
                    } else {
                        productCache.delete(itemId); // Tự động dọn dẹp bộ nhớ khi dữ liệu hết hạn
                    }
                }

                // 3. Fallback lấy tên sản phẩm từ các nguồn khác nếu chưa lấy được
                if (!productName) {
                    // 3.1. Thử lấy từ card Zalo
                    const zaloCardTitle = msg.data?.content?.title;
                    if (isValidProductName(zaloCardTitle)) {
                        productName = zaloCardTitle;
                    }

                    // 3.2. Thử lấy từ văn bản tin nhắn
                    if (!productName) {
                        let cleanText = text.replace(SHOPEE_REGEX, "").trim();
                        cleanText = cleanText.replace(/Mua hàng qua mạng uy tín, tiện lợi|Shopee đảm bảo nhận hàng|hoàn lại tiền|giá tốt|Giao Hàng Miễn/gi, "").trim();
                        if (cleanText.length > 5) {
                            const candidate = cleanText.split("\n")[0].substring(0, 100).trim();
                            if (isValidProductName(candidate)) {
                                productName = candidate;
                            }
                        }
                    }

                    // 3.3. Thử lấy từ short link HTML
                    if (!productName) {
                        console.log("-> Thử lấy tên sản phẩm từ short link HTML...");
                        const details = await getProductDetails(rawUrl);
                        if (details && isValidProductName(details.title)) {
                            productName = details.title;
                        }
                    }

                    // 3.4. Thử lấy từ long link HTML
                    if (!productName) {
                        console.log("-> Thử lấy tên sản phẩm từ long URL HTML...");
                        const details = await getProductDetails(resolvedUrl);
                        if (details && isValidProductName(details.title)) {
                            productName = details.title;
                        }
                    }
                }

                // Làm sạch tiêu đề sản phẩm
                if (productName) {
                    productName = productName
                        .replace(/\s*\|\s*Shopee\s*Việt\s*Nam/gi, "")
                        .replace(/^Mua\s+/i, "")
                        .trim();
                }

                // Lấy hoa hồng ước tính (qua Chrome Extension) (Chỉ nhóm target mới lấy hoa hồng)
                if (config.shopee?.useCdp && ids && isTargetGroup(groupId)) {
                    const isExtensionActive = (Date.now() - lastExtensionActiveTime) < 5000;
                    try {
                        let cdpData = cachedData;
                        let methodText = cdpData ? "Memory Cache" : "";

                        if (!cdpData) {
                            if (isExtensionActive) {
                                methodText = "Chrome Extension";
                                cdpData = await getProductDetailsViaExtension(resolvedUrl).catch(() => null);
                                if (cdpData && itemId) {
                                    productCache.set(itemId, { data: cdpData, timestamp: Date.now() });
                                }
                            }
                            if (!cdpData) {
                                cdpData = await getProductDetailsViaAddLiveTag(resolvedUrl);
                                methodText = "AddLiveTag API";
                                if (cdpData && itemId) {
                                    productCache.set(itemId, { data: cdpData, timestamp: Date.now() });
                                }
                            }
                        }

                        if (cdpData) {
                            productName = cdpData.itemName || cdpData.productName || cdpData.name || productName || "";
                            const cdpRate = cdpData.commission_rate || 0;
                            const cdpAmount = cdpData.commission_amount || 0;
                            if (cdpRate > 0 || cdpAmount > 0) {
                                const textPrice = extractPriceFromText(text);
                                const apiPrice = cdpData.price || 0;
                                const basePrice = (textPrice > apiPrice * 0.3 && textPrice < apiPrice * 1.5) ? textPrice : apiPrice;
                                let shopeeRate = cdpData.shopee_rate || 0;
                                let sellerRate = cdpData.seller_rate || 0;
                                const rawCommRate = cdpData.commission_rate || 0;
                                const price = cdpData.price || basePrice || 0;
                                
                                const nameLower = (productName || "").toLowerCase();
                                
                                const isPetProduct = nameLower.includes("chó") || nameLower.includes("mèo") || 
                                                     nameLower.includes("thú cưng") || nameLower.includes("pet") || 
                                                     nameLower.includes("cát vệ sinh") || nameLower.includes("pate") || 
                                                     nameLower.includes("royal canin") || nameLower.includes("whiskas") || 
                                                     nameLower.includes("ve rận");
                                                     
                                const isMotorcycle = nameLower.includes("xe máy") || nameLower.includes("xe may") || 
                                                     nameLower.includes("ô tô") || nameLower.includes("o to") || 
                                                     nameLower.includes("xe hơi") || nameLower.includes("salaya") || 
                                                     nameLower.includes("nhông sên") || nameLower.includes("nhớt") || 
                                                     nameLower.includes("dầu nhớt") || nameLower.includes("bao tay") || 
                                                     nameLower.includes("tay nắm") || nameLower.includes("kính chiếu hậu") || 
                                                     nameLower.includes("gương xe") || nameLower.includes("pô xe") ||
                                                     nameLower.includes("mũ bảo hiểm") || nameLower.includes("mu bao hiem") ||
                                                     nameLower.includes("nón bảo hiểm") || nameLower.includes("non bao hiem");
                                                     
                                if (isPetProduct) {
                                    shopeeRate = 0.0;
                                } else if (isMotorcycle) {
                                    shopeeRate = 3.5;
                                } else {
                                    shopeeRate = 8.0; // Hầu hết các ngành hàng còn lại (điện thoại, mỹ phẩm, mẹ bé, thời trang, gia dụng...) đều được 8%
                                }

                                if (sellerRate <= 0 && rawCommRate > shopeeRate) {
                                    sellerRate = rawCommRate - shopeeRate;
                                }
                                
                                const displayRate = shopeeRate + sellerRate;
                                
                                // Tính toán hoa hồng cơ bản theo tỷ lệ danh nghĩa
                                let calculatedShopeeComm = 0;
                                if (shopeeRate > 0 && price > 0) {
                                    calculatedShopeeComm = Math.round(price * (shopeeRate / 100));
                                }
                                
                                // Hạn mức tối đa của hoa hồng cơ bản là 40.000đ
                                const isShopeeCapped = shopeeRate > 0 && calculatedShopeeComm > 40000;
                                let basicCommVal = calculatedShopeeComm;
                                if (isShopeeCapped) {
                                    basicCommVal = 40000;
                                }
                                
                                // Hoa hồng Xtra người bán
                                let sellerCommVal = 0;
                                if (sellerRate > 0 && price > 0) {
                                    sellerCommVal = Math.round(price * (sellerRate / 100));
                                }
                                
                                // Tổng hoa hồng = cơ bản (áp trần 40k) + Xtra
                                const commissionVal = basicCommVal + sellerCommVal;
                                
                                let detailStr = "";
                                if (sellerRate > 0 || isShopeeCapped) {
                                    const detailParts = [];
                                    if (shopeeRate > 0) {
                                        if (isShopeeCapped) {
                                            detailParts.push(`Shopee ${String(shopeeRate).replace(/\./g, ",")}% (₫40.000,tối đa)`);
                                        } else {
                                            detailParts.push(`Shopee ${String(shopeeRate).replace(/\./g, ",")}%`);
                                        }
                                    }
                                    if (sellerRate > 0) {
                                        detailParts.push(`Xtra ${String(sellerRate).replace(/\./g, ",")}%`);
                                    }
                                    detailStr = ` (${detailParts.join(" + ")})`;
                                }

                                if (commissionVal > 0) {
                                    const formattedRate = String(displayRate).replace(/\./g, ",");
                                    formattedComm2 = `${formattedRate}% ~ ${commissionVal.toLocaleString("vi-VN")}đ${detailStr} 💰`;
                                } else {
                                    const formattedRate = String(displayRate).replace(/\./g, ",");
                                    formattedComm2 = `${formattedRate}%${detailStr} 💰`;
                                }
                                console.log(`-> Đã lấy hoa hồng thành công qua ${methodText}: ${formattedComm2}`);
                            }
                        }
                    } catch (err) {
                        console.log(`[Lấy hoa hồng] Thất bại: ${err.message}`);
                    }
                } else if (!ids) {
                    console.log("-> Bỏ qua truy vấn lấy hoa hồng vì đây không phải là link sản phẩm (không có shopid/itemid).");
                }
            }

            // Chuyển hướng và bọc tên miền riêng qua Cloudflare Worker (Tạo link siêu ngắn 8 ký tự dạng https://hoantienonline.io.vn/k5IocyhQ)
            const cleanDomain = config.customRedirectDomain || "https://hoantienonline.io.vn";
            if (cleanDomain && affiliateLink && affiliateLink.includes("shopee.vn")) {
                try {
                    console.log(`-> Đang gọi Cloudflare Worker để rút gọn link siêu ngắn...`);
                    const targetDomain = cleanDomain.replace(/\/+$/, "");
                    const postData = JSON.stringify({ url: affiliateLink });
                    let shortUrlResult = null;

                    const apiUrls = [
                        `${targetDomain}/create-link-secure-api`,
                        `https://shoppesale.io.vn/create-link-secure-api`
                    ];

                    for (const apiUrl of apiUrls) {
                        try {
                            const response = await fetch(apiUrl, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: postData
                            });
                            const result = await response.json();
                            if (result && result.shortUrl) {
                                const targetHost = new URL(targetDomain).host;
                                const resHost = new URL(result.shortUrl).host;
                                shortUrlResult = result.shortUrl.replace(resHost, targetHost);
                                break;
                            }
                        } catch (err) {}
                    }

                    if (shortUrlResult) {
                        affiliateLink = shortUrlResult;
                        console.log(`-> Rút gọn link thành công: ${affiliateLink}`);
                    }
                } catch (e) {
                    console.log(`-> Lỗi gọi Cloudflare Worker: ${e.message}`);
                }
            }

            if (!formattedComm2 && isTargetGroup(groupId)) {
                let fallbackRate = 8.0;
                const nameLower = (productName || "").toLowerCase();
                if (nameLower.includes("chó") || nameLower.includes("mèo") || nameLower.includes("thú cưng") || nameLower.includes("pet") || nameLower.includes("cát vệ sinh") || nameLower.includes("pate")) {
                    fallbackRate = 0.0;
                } else if (nameLower.includes("xe máy") || nameLower.includes("xe may") || nameLower.includes("ô tô") || nameLower.includes("o to") || nameLower.includes("dầu nhớt") || nameLower.includes("mũ bảo hiểm") || nameLower.includes("nón bảo hiểm")) {
                    fallbackRate = 3.5;
                }
                
                if (fallbackRate > 0) {
                    const textPrice = extractPriceFromText(text);
                    if (textPrice > 0) {
                        const commVal = Math.min(40000, Math.round(textPrice * (fallbackRate / 100)));
                        formattedComm2 = `${String(fallbackRate).replace(/\./g, ",")}% ~ ${commVal.toLocaleString("vi-VN")}đ 💰`;
                    } else {
                        formattedComm2 = `${String(fallbackRate).replace(/\./g, ",")}% (Ước tính) 💰`;
                    }
                }
            }

            let replyText = `@${senderName} ✅ Sếp ơi em gửi link ạ!\n\n`;
            if (productName) {
                replyText += `📦 ${getShortProductName(productName)}\n`;
            } else {
                replyText += `📦 ${isLazada ? "Sản phẩm Lazada" : (isTikTok ? "Sản phẩm TikTok" : "Sản phẩm Shopee")}\n`;
            }
            replyText += `✨ Link hoàn tiền: ${affiliateLink}\n`;

            if (formattedComm2 && isTargetGroup(groupId)) {
                replyText += `💰 Hoa hồng ước tính: ${formattedComm2}\n`;
            }

            replyText += `\n⚠️ LƯU Ý QUAN TRỌNG:\n` +
                         `1. Xóa sp này khỏi giỏ hàng nếu có\n` +
                         `2. Bấm link bỏ giỏ hoặc mua ngay (nên bấm link 2 lần)\n` +
                         `3. Ko xem live trước/sau khi bấm link`;

            const replyPayload = {
                msg: replyText,
                mentions: [
                    {
                        pos: 0,
                        uid: msg.data.uidFrom,
                        len: senderName.length + 1
                    }
                ]
            };

            await api.sendMessage(replyPayload, groupId, msg.type);
            console.log("-> Đã gửi Tin nhắn gộp (Link + Hoa hồng) thành công!");
        } catch (e) {
            console.error(`-> Lỗi xử lý chuyển đổi link: ${e.message}`);
        }
        } catch (topErr) {
            console.error(`❌ [Lỗi xử lý tin nhắn]`, topErr.message);
        }
    });

api.listener.on("group_event", async (event) => {
        try {
            console.log(`[Sự kiện nhóm] Thể loại: ${event.type} | Group ID: ${event.threadId}`);
            
            if (event.type === "join") {
                const threadId = event.threadId;
                
                // Chỉ gửi lời chào trong các nhóm được cấu hình. Nếu không cấu hình nhóm nào, gửi lời chào ở mọi nhóm.
                if (config.groupAffiliates && Object.keys(config.groupAffiliates).length > 0 && !config.groupAffiliates[threadId]) {
                    return;
                }

                const newMembers = event.data?.updateMembers || [];
                
                // Lấy thông tin trưởng nhóm (chủ nhóm) để tag
                let groupDetails = groupInfoCache[threadId];
                if (!groupDetails) {
                    try {
                        const info = await api.getGroupInfo(threadId);
                        if (info?.gridInfoMap?.[threadId]) {
                            groupDetails = info.gridInfoMap[threadId];
                            groupInfoCache[threadId] = groupDetails;
                        }
                    } catch (e) {
                        console.log(`[Cảnh báo] Không thể lấy thông tin nhóm ${threadId}: ${e.message}`);
                    }
                }
                
                let leaderId = groupDetails?.creatorId;
                let leaderName = "Trưởng nhóm";
                if (leaderId) {
                    try {
                        const leaderInfo = await api.getUserInfo(leaderId);
                        const leaderProfile = leaderInfo?.changed_profiles?.[leaderId] || leaderInfo?.changed_profiles?.[`${leaderId}_0`] || {};
                        leaderName = leaderProfile.displayName || leaderProfile.zaloName || "Trưởng nhóm";
                    } catch (e) {
                        console.log(`[Cảnh báo] Không thể lấy thông tin Trưởng nhóm ${leaderId}: ${e.message}`);
                    }
                }

                // Nạp danh sách thành viên cũ đã biết (từ CSV nhóm, CSV tổng, Backup Sheet và welcomed_members.json)
                const WELCOMED_FILE = "welcomed_members.json";
                let welcomedMembers = new Set();
                try {
                    if (existsSync(WELCOMED_FILE)) {
                        const arr = JSON.parse(readFileSync(WELCOMED_FILE, "utf-8"));
                        if (Array.isArray(arr)) welcomedMembers = new Set(arr);
                    }
                } catch(e) {}

                try {
                    if (existsSync("sheet_users_backup.json")) {
                        const backup = JSON.parse(readFileSync("sheet_users_backup.json", "utf-8"));
                        const list = backup.data || backup.users || [];
                        list.forEach(u => { if (u.userId) welcomedMembers.add(String(u.userId)); });
                    }
                } catch(e) {}

                const targetFile = isTargetGroup(threadId) ? `zalo_users_${threadId}.csv` : DEFAULT_USERS_FILE;
                let savedUsers = savedUsersByFile.get(targetFile);
                if (!savedUsers) {
                    loadUsersFromFile(targetFile);
                    savedUsers = savedUsersByFile.get(targetFile);
                }

                for (const m of newMembers) {
                    const memberId = String(m.id || "").trim();

                    // --- KIỂM TRA BLACKLIST KHI CÓ THÀNH VIÊN MỚI GIA NHẬP ---
                    const blacklistNames = config.blacklistNames || [];
                    const matchesBlacklist = blacklistNames.some(item => 
                        (m.dName && m.dName.toLowerCase().includes(item.toLowerCase())) || (memberId && String(memberId) === String(item))
                    );

                    if (matchesBlacklist) {
                        console.log(`[Blacklist] Phát hiện thành viên mới gia nhập nằm trong blacklist: ${m.dName} (UID: ${memberId})`);
                        saveSpammerId(memberId, config);
                        
                        const creatorId = groupDetails?.creatorId;
                        const adminIds = groupDetails?.adminIds || [];
                        const botOwnId = api.getOwnId ? api.getOwnId() : null;
                        const isBotAdmin = botOwnId && (
                            (creatorId && String(botOwnId) === String(creatorId)) ||
                            (adminIds && adminIds.map(String).includes(String(botOwnId)))
                        );

                        if (isBotAdmin) {
                            try {
                                await api.removeUserFromGroup([memberId], threadId);
                                console.log(`[Blacklist] Đã mời ${m.dName} khỏi nhóm`);
                            } catch (err) {
                                console.error(`[Blacklist] Thất bại khi mời thành viên khỏi nhóm: ${err.message}`);
                            }

                            try {
                                await api.addGroupBlockedMember(memberId, threadId);
                                console.log(`[Blacklist] Đã chặn (block) ${m.dName} khỏi nhóm`);
                            } catch (err) {
                                console.error(`[Blacklist] Thất bại khi block thành viên: ${err.message}`);
                            }
                        } else {
                            console.log(`[Blacklist] Phát hiện thành viên blacklist nhưng Bot không phải Admin/Phó nhóm.`);
                        }
                        continue; // Bỏ qua không chào mừng
                    }

                    const isReturning = (savedUsers && savedUsers.has(memberId)) || welcomedMembers.has(memberId);

                    if (isReturning) {
                        console.log(`🤖 [Join Tracker] Thành viên cũ ${m.dName} (UID: ${memberId}) quay lại nhóm. Gửi tin nhắn chào mừng quay lại & chặn thưởng giới thiệu.`);
                        try {
                            let joinDates = {};
                            if (existsSync("member_join_dates.json")) {
                                try { joinDates = JSON.parse(readFileSync("member_join_dates.json", "utf8")); } catch (e) {}
                            }
                            joinDates[memberId] = "blocked";
                            writeFileSync("member_join_dates.json", JSON.stringify(joinDates, null, 2), "utf8");
                        } catch(e){}

                        try {
                            const returnMsg = `@${m.dName} 🎉 Chào mừng ${m.dName} đã quay trở lại nhóm!`;
                            const mentions = [{
                                pos: 0,
                                uid: m.id,
                                len: m.dName.length + 1
                            }];
                            await api.sendMessage({ msg: returnMsg, mentions: mentions }, threadId, 1);
                        } catch (eReturn) {
                            console.error(`[Join Tracker] Lỗi gửi tin nhắn chào mừng quay lại: ${eReturn.message}`);
                        }
                        continue;
                    }

                    if (memberId) {
                        welcomedMembers.add(memberId);
                        try {
                            writeFileSync(WELCOMED_FILE, JSON.stringify(Array.from(welcomedMembers), null, 2), "utf-8");
                        } catch(e) {}
                        saveUniqueUser(memberId, m.dName, threadId);
                        saveMemberJoinDate(memberId);
                    }

                    console.log(`-> Thành viên MỚI GIA NHẬP LẦN ĐẦU: ${m.dName} (UID: ${m.id})`);
                    
                    let welcomeTpl = config.welcomeTemplate || 
                        "@{name} 🎉 Chào mừng {name} đã tham gia nhóm!\n" +
                        "━━━━━━━━━━━━━━━━━━\n" +
                        "📌 Hướng dẫn sử dụng:\n" +
                        "Bạn chỉ cần gửi link vào nhóm, bot sẽ tự động chuyển đổi thành link mua sắm được hoàn tiền nhé. Xem ghim nhóm để biết thêm thông tin. Mọi thắc mắc liên hệ Trưởng nhóm @{leader}\n" +
                        "✨ Chúc bạn săn sale vui vẻ!";
                    
                    // Thay thế {name} bằng tên thành viên mới và {leader} bằng tên trưởng nhóm
                    let finalMsg = welcomeTpl.replace(/{name}/g, m.dName);
                    finalMsg = finalMsg.replace(/{leader}/g, leaderName);
                    
                    const mentions = [];
                    // Tìm tất cả vị trí xuất hiện của @name để tag Zalo
                    const mentionText = `@${m.dName}`;
                    let pos = finalMsg.indexOf(mentionText);
                    while (pos !== -1) {
                        mentions.push({
                            pos: pos,
                            uid: m.id,
                            len: mentionText.length
                        });
                        pos = finalMsg.indexOf(mentionText, pos + mentionText.length);
                    }
                    
                    // Thêm tag trưởng nhóm (nếu có leaderId)
                    if (leaderId) {
                        const leaderMentionText = `@${leaderName}`;
                        let leaderPos = finalMsg.indexOf(leaderMentionText);
                        while (leaderPos !== -1) {
                            mentions.push({
                                pos: leaderPos,
                                uid: leaderId,
                                len: leaderMentionText.length
                            });
                            leaderPos = finalMsg.indexOf(leaderMentionText, leaderPos + leaderMentionText.length);
                        }
                    }
                    
                    const replyPayload = {
                        msg: finalMsg,
                        mentions: mentions
                    };
                    
                    await api.sendMessage(replyPayload, threadId, 1);
                    console.log(`   Đã gửi tin nhắn chào mừng thành viên ${m.dName} thành công!`);

                    // Kích hoạt tiến trình gửi tin nhắn chào mừng cá nhân qua Inbox riêng (1-1)
                    if (config.inboxWelcome && config.inboxWelcome.enable) {
                        try {
                            const groupName = groupDetails?.name || groupDetails?.groupName || "Nhóm Hoàn Tiền";
                            triggerInboxWelcome(api, config.inboxWelcome, memberId, m.dName, groupName);
                        } catch (eInbox) {
                            console.error(`[Inbox Welcome] Lỗi kích hoạt inbox riêng: ${eInbox.message}`);
                        }
                    }
                }
            }
        } catch (e) {
            console.error(`-> Lỗi xử lý sự kiện nhóm: ${e.message}`);
        }
    });

    api.listener.on("connected", () => {
        console.log("-> Đã kết nối WebSocket thành công. Đang lắng nghe tin nhắn...");
        // Tự động quét và đẩy Zalo ID + Tên Zalo của toàn bộ thành viên nhóm lên Google Sheet & CSV
        syncGroupMembersToCsv(api, config).catch(e => {
            console.error(`[Đồng bộ] Lỗi đồng bộ danh sách thành viên nhóm: ${e.message}`);
        });
    });

    api.listener.on("disconnected", (code) => {
        console.log(`-> Mất kết nối WebSocket (Mã: ${code}). Đang tự động kết nối lại...`);
    });

    api.listener.on("closed", async (code) => {
        if (code === 3000) {
            console.error("-> Lỗi: Tài khoản Zalo bị đăng nhập ở trình duyệt khác (Duplicate Session). Vui lòng kiểm tra lại thiết bị của bạn.");
            process.exit(1);
        }
        console.log(`-> Kết nối bị đóng (Mã: ${code}). Đăng nhập lại sau 5s...`);
        await new Promise((r) => setTimeout(r, 5000));
        try {
            clearSession();
            await autoLogin(false);
            const newApi = getApi();
            attachHandlers(newApi, config);
            newApi.listener.start({ retryOnClose: true });
            console.log("-> Đăng nhập lại thành công. Khởi động lại bộ lắng nghe.");
        } catch (e) {
            console.error(`-> Đăng nhập lại thất bại: ${e.message}. Thử lại sau 30s...`);
            await new Promise((r) => setTimeout(r, 30000));
            try {
                clearSession();
                await autoLogin(false);
                const newApi = getApi();
                attachHandlers(newApi, config);
                newApi.listener.start({ retryOnClose: true });
                console.log("-> Kết nối lại thành công sau lần thử thứ 2.");
            } catch (e2) {
                console.error("-> Không thể kết nối lại. Bot dừng hoạt động.");
                process.exit(1);
            }
        }
    });

    api.listener.on("error", () => {
        // Suppress WS error noise as it is followed by close/disconnected events
    });
}

function startReminderScheduler(config) {
    const schedulerConfig = config.scheduler;
    if (!schedulerConfig || !schedulerConfig.enableReminder) {
        return;
    }
    const TARGET_GROUP_ID = String(schedulerConfig.targetGroupId || config.tiktokGroupId || "2001332429948371738").trim();
    if (!TARGET_GROUP_ID) {
        console.log("⚠️ [Scheduler] Không tìm thấy targetGroupId trong cấu hình scheduler.");
        return;
    }

    let reminders = (schedulerConfig && schedulerConfig.reminders && schedulerConfig.reminders.length > 0) ? schedulerConfig.reminders : [
        { hour: 7, minute: 35, text: "@All 📢 CÁC CÂU LỆNH HỖ TRỢ TRONG NHÓM ZALO", image: "assets/cac_cau_lenh_ho_tro.jpg", active: true },
        { hour: 8, minute: 5, text: "@All 🛍️✨ Em gửi cả nhà danh sách các đơn hàng đã ghi nhận hoa hồng ngày {yesterday} nhé.\n\nCảm ơn cả nhà đã luôn ủng hộ và đồng hành cùng nhóm ạ! 🥰", image: "assets/bao_cao_hang_ngay.jpg", active: false },
        { hour: 10, minute: 0, text: "@All 📢 TỰ ĐĂNG KÝ TÀI KHOẢN NHẬN TIỀN HOÀN TỰ ĐỘNG\n\nĐể nhận tiền hoàn nhanh nhất và tránh sai sót, cả nhà vui lòng nhắn tin riêng (Inbox) cho Bot để đăng ký thông tin nhận tiền theo cú pháp sau:\n\n👉 Cú pháp: /stk [Tên_Ngân_Hàng_Hoặc_Ví] [Số_Tài_Khoản_Hoặc_SĐT]\n Lưu ý: Viết liền không dấu, đúng cú pháp. Nhắn tin riêng cho Bot để bảo mật số tài khoản của bạn nhé!", image: "assets/huong_dan_stk.jpg", active: true },
        { hour: 15, minute: 0, text: "@All ⚠️ **LƯU Ý KHI MUA HÀNG SHOPEE ĐỂ KHÔNG BỊ MẤT HOÀN TIỀN**\n\n🚫 **Không xem hoặc bấm vào Video/Livestream** trước khi mua hàng.\n\n❌ Chỉ cần truy cập **Video/Livestream**, đơn hàng có thể **không được ghi nhận hoàn tiền**.\n\n🔄 **Nếu lỡ bấm:**\n**Đóng Shopee → Mở lại Shopee → Tôi → ⚙️ Cài đặt → Giới thiệu → Xóa bộ nhớ đệm (2–3 lần)**, sau đó mở lại **link hoàn tiền** để mua.\n\n📺 **Video hướng dẫn:** https://www.youtube.com/shorts/K_P3TV-drxY", images: ["assets/luu_y_video_1.jpg", "assets/luu_y_video_2.jpg"], active: true },
        { hour: 18, minute: 0, text: "@All 📢 TỰ ĐĂNG KÝ TÀI KHOẢN NHẬN TIỀN HOÀN TỰ ĐỘNG\n\nĐể nhận tiền hoàn nhanh nhất và tránh sai sót, cả nhà vui lòng nhắn tin riêng (Inbox) cho Bot để đăng ký thông tin nhận tiền theo cú pháp sau:\n\n👉 Cú pháp: /stk [Tên_Ngân_Hàng_Hoặc_Ví] [Số_Tài_Khoản_Hoặc_SĐT]\n Lưu ý: Viết liền không dấu, đúng cú pháp. Nhắn tin riêng cho Bot để bảo mật số tài khoản của bạn nhé!", image: "assets/huong_dan_stk.jpg", active: true },
        { hour: 19, minute: 0, text: "@All ⚠️ **LƯU Ý KHI MUA HÀNG SHOPEE ĐỂ KHÔNG BỊ MẤT HOÀN TIỀN**\n\n🚫 **Không xem hoặc bấm vào Video/Livestream** trước khi mua hàng.\n\n❌ Chỉ cần truy cập **Video/Livestream**, đơn hàng có thể **không được ghi nhận hoàn tiền**.\n\n🔄 **Nếu lỡ bấm:**\n**Đóng Shopee → Mở lại Shopee → Tôi → ⚙️ Cài đặt → Giới thiệu → Xóa bộ nhớ đệm (2–3 lần)**, sau đó mở lại **link hoàn tiền** để mua.\n\n📺 **Video hướng dẫn:** https://www.youtube.com/shorts/K_P3TV-drxY", images: ["assets/luu_y_video_1.jpg", "assets/luu_y_video_2.jpg"], active: true },
        { hour: 19, minute: 30, text: "@All 🚨 GÓC CẢNH GIÁC - CẢNH GIÁC VỚI NHÓM HOÀN TIỀN CHIA 9:1", image: "assets/goc_canh_giac.jpg", active: true },
        { hour: 21, minute: 0, text: "@All Cả nhà nhận hàng không có nhu cầu đổi trả bấm ĐÃ NHẬN HÀNG giúp e với ạ.", image: "assets/da_nhan_hang.jpg", active: true },
        { hour: 22, minute: 0, text: "@All 📢 CÁC CÂU LỆNH HỖ TRỢ TRONG NHÓM ZALO", image: "assets/cac_cau_lenh_ho_tro.jpg", active: true }
    ];

    let lastSentDate = "";

    reminders.filter(r => r.active !== false).forEach(r => {
        const timeStr = `${r.hour}h${String(r.minute || 0).padStart(2, "0")}`;
        const previewText = r.text ? (r.text.replace(/\n/g, " ").substring(0, 50).trim() + "...") : "";
        console.log(`⏰ [Scheduler] Đã kích hoạt lịch nhắc nhở lúc ${timeStr} vào nhóm ${TARGET_GROUP_ID} | Nội dung: "${previewText}"`);
    });

    setInterval(async () => {
        try {
            const now = new Date();
            const vnTimeString = now.toLocaleTimeString("en-US", { timeZone: "Asia/Ho_Chi_Minh", hour12: false });
            const parts = vnTimeString.split(":");
            if (parts.length < 2) return;

            const hour = parseInt(parts[0], 10);
            const minute = parseInt(parts[1], 10);

            const activeRems = reminders.filter(r => r.hour === hour && (r.minute || 0) === minute && r.active !== false);

            if (activeRems.length > 0) {
                const formatter = new Intl.DateTimeFormat("en-US", {
                    timeZone: "Asia/Ho_Chi_Minh",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                });
                const dateParts = formatter.formatToParts(now);
                const dateMap = {};
                dateParts.forEach(p => dateMap[p.type] = p.value);
                const todayStr = `${dateMap.year}-${dateMap.month}-${dateMap.day}`;

                let activeRem = activeRems.find(r => r.date === todayStr);
                if (!activeRem) {
                    activeRem = activeRems.find(r => !r.date);
                }

                if (activeRem) {
                    const vnDateString = now.toLocaleDateString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
                    const sentKey = `${vnDateString}-${hour}-${minute}`;

                    if (lastSentDate !== sentKey) {
                        lastSentDate = sentKey;
                        let imagePath = activeRem.image || "assets/reminder-image.jpg";
                        let text = activeRem.text || "@All Bấm nhận hàng giúp em với ạ.";

                        if (text.includes("{yesterday}")) {
                            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                            const yesterdayFormatter = new Intl.DateTimeFormat("en-US", {
                                timeZone: "Asia/Ho_Chi_Minh",
                                day: "2-digit",
                                month: "2-digit"
                            });
                            const yParts = yesterdayFormatter.formatToParts(yesterday);
                            const yMap = {};
                            yParts.forEach(p => yMap[p.type] = p.value);
                            const yesterdayStr = `${yMap.day}/${yMap.month}`;
                            text = text.replace(/{yesterday}/g, yesterdayStr);
                        }

                        if (imagePath === "assets/bao_cao_hang_ngay.jpg") {
                            console.log("⏰ [Scheduler] Đang tự động chụp ảnh Google Sheet mới nhất...");
                            try {
                                const { execSync } = await import('child_process');
                                const yesterdayStrIso = getYesterdayDateVN();
                                execSync(`node capture_sheet.js ${yesterdayStrIso}`, { stdio: 'inherit' });
                                console.log("⏰ [Scheduler] Chụp ảnh Google Sheet thành công!");
                            } catch (err) {
                                console.error("⏰ [Scheduler] Lỗi khi chụp ảnh Google Sheet:", err.message);
                            }
                        }

                        console.log(`⏰ [Scheduler] Đến giờ gửi ảnh nhắc nhở (${hour}h${String(minute).padStart(2, "0")})! Đang gửi tới nhóm ${TARGET_GROUP_ID}...`);

                        let attachments = [];
                        if (activeRem.images && Array.isArray(activeRem.images)) {
                            activeRem.images.forEach(img => {
                                if (existsSync(img)) {
                                    attachments.push(resolve(img));
                                }
                            });
                        } else if (imagePath) {
                            if (existsSync(imagePath)) {
                                attachments.push(resolve(imagePath));
                            }
                        }

                        const activeApi = getApi();
                        if (activeApi) {
                            await activeApi.sendMessage(
                                {
                                    msg: text,
                                    attachments: attachments.length > 0 ? attachments : undefined,
                                    mentions: [
                                        {
                                            pos: 0,
                                            uid: "-1",
                                            len: 4
                                        }
                                    ]
                                },
                                TARGET_GROUP_ID,
                                1
                            );
                            console.log(`⏰ [Scheduler] Đã gửi nhắc nhở thành công! (${attachments.length} ảnh)`);
                        }
                    }
                }
            }
        } catch (err) {
            console.error(`⏰ [Scheduler] Lỗi khi thực hiện gửi tin nhắn nhắc nhở:`, err.message);
        }
    }, 30000);
}

function startSaleScheduler(config) {
    const schedulerConfig = config.scheduler;
    if (!schedulerConfig || !schedulerConfig.enableSale) {
        return;
    }
    const TARGET_GROUP_ID = String(schedulerConfig.targetGroupId || config.tiktokGroupId || "2001332429948371738").trim();
    if (!TARGET_GROUP_ID) {
        console.log("⚠️ [Sale Scheduler] Không tìm thấy targetGroupId trong cấu hình scheduler.");
        return;
    }
    let sales = schedulerConfig.sales;
    if (!sales || !Array.isArray(sales)) {
        const hours = schedulerConfig.saleHours || [7, 12, 20];
        sales = hours.map(h => ({
            hour: h,
            text: schedulerConfig.saleText || "@All 🛒 Cả nhà nhớ lưu lịch để săn deal, lấy voucher và đặt hàng đúng dịp nha ❤️✨",
            image: schedulerConfig.saleImage || "assets/sale-calendar.jpg"
        }));
    }
    let lastSentDate = "";

    console.log(`⏰ [Sale Scheduler] Đã kích hoạt lịch đăng sale lúc ${sales.map(s => s.hour + "h00").join(", ")} vào nhóm ${TARGET_GROUP_ID}`);

    function isSaleOrPreSaleDay(dateInVn) {
        const tz = "Asia/Ho_Chi_Minh";
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            year: "numeric",
            month: "numeric",
            day: "numeric"
        });
        const parts = formatter.formatToParts(dateInVn);
        const dateMap = {};
        parts.forEach(p => dateMap[p.type] = parseInt(p.value, 10));
        
        const month = dateMap.month;
        const day = dateMap.day;

        const saleDaysToday = [month, 10, 15, 20, 25];
        if (saleDaysToday.includes(day)) {
            return true;
        }

        const tomorrow = new Date(dateInVn.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowParts = formatter.formatToParts(tomorrow);
        const tomorrowMap = {};
        tomorrowParts.forEach(p => tomorrowMap[p.type] = parseInt(p.value, 10));
        
        const tomorrowMonth = tomorrowMap.month;
        const tomorrowDay = tomorrowMap.day;
        const saleDaysTomorrow = [tomorrowMonth, 10, 15, 20, 25];
        if (saleDaysTomorrow.includes(tomorrowDay)) {
            return true;
        }

        return false;
    }

    setInterval(async () => {
        try {
            const now = new Date();
            const vnTimeString = now.toLocaleTimeString("en-US", { timeZone: "Asia/Ho_Chi_Minh", hour12: false });
            const parts = vnTimeString.split(":");
            if (parts.length < 2) return;

            const hour = parseInt(parts[0], 10);
            const minute = parseInt(parts[1], 10);

            if (minute === 0) {
                const formatter = new Intl.DateTimeFormat("en-US", {
                    timeZone: "Asia/Ho_Chi_Minh",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                });
                const dateParts = formatter.formatToParts(now);
                const dateMap = {};
                dateParts.forEach(p => dateMap[p.type] = p.value);
                const todayStr = `${dateMap.year}-${dateMap.month}-${dateMap.day}`;

                const activeSales = sales.filter(s => s.hour === hour && s.active !== false);
                let activeSale = activeSales.find(s => s.date === todayStr);
                let isTargetScheduled = !!activeSale;

                if (!activeSale) {
                    activeSale = activeSales.find(s => !s.date);
                }

                if (activeSale) {
                    if (isTargetScheduled || isSaleOrPreSaleDay(now)) {
                        const vnDateString = now.toLocaleDateString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
                        const sentKey = `${vnDateString}-${hour}`;

                        if (lastSentDate !== sentKey) {
                            lastSentDate = sentKey;
                            const imagePath = activeSale.image || "assets/sale-calendar.jpg";
                            const text = activeSale.text || "@All 🛒 Cả nhà nhớ lưu lịch để săn deal, lấy voucher và đặt hàng đúng dịp nha ❤️✨";

                            console.log(`⏰ [Sale Scheduler] Đến giờ gửi lịch sale (${hour}h00)! Đang gửi tới nhóm ${TARGET_GROUP_ID}...`);

                            let attachments = [];
                            if (existsSync(imagePath)) {
                                attachments.push(resolve(imagePath));
                            }

                            const activeApi = getApi();
                            if (activeApi) {
                                await activeApi.sendMessage(
                                    {
                                        msg: text,
                                        attachments: attachments.length > 0 ? attachments : undefined,
                                        mentions: [
                                            {
                                                pos: 0,
                                                uid: "-1",
                                                len: 4
                                            }
                                        ]
                                    },
                                    TARGET_GROUP_ID,
                                    1
                                );
                                console.log(`⏰ [Sale Scheduler] Đã gửi lịch sale thành công!`);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error(`⏰ [Sale Scheduler] Lỗi khi thực hiện gửi tin nhắn lịch sale:`, err.message);
        }
    }, 30000);
}

async function run() {
    if (!existsSync(CONFIG_FILE)) {
        console.error(`Không tìm thấy file cấu hình: ${CONFIG_FILE}`);
        process.exit(1);
    }
    const config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    
    // --- KIỂM TRA BẢN QUYỀN (LICENSE CHECK) ---
    const machineId = getMachineId();
    const licenseKey = config.licenseKey || "";
    const licenseCheck = validateLicenseKey(licenseKey, machineId);
    
    if (!licenseCheck.valid) {
        console.log("\n==================================================");
        console.log("❌ LỖI BẢN QUYỀN (LICENSE ERROR):");
        console.log(`- Lý do: ${licenseCheck.error}`);
        console.log(`- Mã máy hiện tại (Machine ID): ${machineId}`);
        console.log("==================================================");
        console.log("👉 Vui lòng chạy file 'Cau-Hinh.bat' để nhập License Key mới,");
        console.log("   hoặc gửi Mã Máy trên cho Admin để được cấp key.");
        console.log("==================================================\n");
        process.exit(1);
    }
    
    // --- KIỂM TRA BẢN QUYỀN TRỰC TUYẾN (ONLINE BLACKLIST CHECK) ---
    if (config.licenseSheetUrl) {

    }
    
    console.log(`✅ Bản quyền hợp lệ! Hạn dùng đến: ${licenseCheck.expiryDate}`);
    console.log(`Nhà cung cấp Affiliate đang chọn: ${config.provider}`);

    // Khởi động server API kết nối Extension
    startExpressServer(config);

    console.log("Đang đăng nhập Zalo...");
    await autoLogin(false);

    let api;
    if (!isLoggedIn()) {
        console.log("⚠️ Không phát hiện phiên đăng nhập Zalo trước đó. Đang tạo mã QR để đăng nhập mới...");
        console.log("👉 Vui lòng mở điện thoại quét mã QR xuất hiện dưới đây hoặc truy cập http://localhost:18927 để quét.");
        
        let qrServer = null;
        try {
            const { ownId } = await loginWithQR(null, (event) => {
                displayQR(event);
                if (!qrServer) {
                    qrServer = startQrServer(getQRPath(), 18927);
                }
            });

            let displayName = "";
            try {
                api = getApi();
                const accountInfo = await api.fetchAccountInfo();
                displayName = accountInfo?.profile?.displayName || displayName || ownId;
            } catch {}

            const creds = extractCredentials();
            saveCredentials(ownId, creds);
            addAccount(ownId, displayName, null);
            console.log(`✅ Đăng nhập thành công tài khoản Zalo: ${displayName} (${ownId})`);
        } catch (e) {
            console.error("❌ Đăng nhập thất bại:", e.message);
            process.exit(1);
        } finally {
            if (qrServer) qrServer.close();
        }
    } else {
        api = getApi();
        console.log("✅ Tự động đăng nhập Zalo thành công!");
    }

    attachHandlers(api, config);

    api.listener.start({ retryOnClose: true });

function startReferralAnnouncer(config) {
    const mainGroupId = config.scheduler?.targetGroupId || (config.groupAffiliates ? Object.keys(config.groupAffiliates)[0] : null) || config.tiktokGroupId || "2001332429948371738";
    const intervalMinutes = 5; // Quét mỗi 5 phút
    
    console.log(`🤖 [Referral Announcer] Khởi động quét thưởng giới thiệu & chúc mừng đơn đầu tiên định kỳ mỗi ${intervalMinutes} phút vào nhóm ${mainGroupId}...`);
    
    const runCheck = async () => {
        const orderAppsScriptUrl = config.orderAppsScriptUrl;
        if (!orderAppsScriptUrl) return;
        const activeApi = getApi();
        if (!activeApi) return;
        
        try {
            // 1. Quét thông báo thưởng nóng 10k giới thiệu và thưởng mốc
            const response = await fetch(orderAppsScriptUrl, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "get_pending_announcements",
                    token: "DongChau@Secure2026"
                })
            });
            
            const resultText = await response.text();
            let result = null;
            try { result = JSON.parse(resultText); } catch(e){}
            
            if (result && result.success) {
                // 1a. Thông báo thưởng nóng 10k đơn đầu
                if (result.pending && result.pending.length > 0) {
                    console.log(`🤖 [Referral Announcer] Phát hiện ${result.pending.length} phần thưởng giới thiệu mới chưa thông báo!`);
                    for (const reward of result.pending) {
                        try {
                            const congratMsg = `🎉 Chúc mừng @${reward.referrerName} đã nhận được thưởng nóng 10.000đ khi giới thiệu thành viên mới @${reward.newUserName} phát sinh đơn hàng đầu tiên!`;
                            await activeApi.sendMessage({
                                msg: congratMsg,
                                mentions: [
                                    {
                                        pos: `🎉 Chúc mừng `.length,
                                        uid: String(reward.referrerId),
                                        len: reward.referrerName.length + 1
                                    },
                                    {
                                        pos: `🎉 Chúc mừng @${reward.referrerName} đã nhận được thưởng nóng 10.000đ khi giới thiệu thành viên mới `.length,
                                        uid: String(reward.newUserId),
                                        len: reward.newUserName.length + 1
                                    }
                                ]
                            }, mainGroupId, 1);
                            
                            console.log(`🤖 [Referral Announcer] Đã thông báo thưởng giới thiệu của ${reward.referrerName} thành công.`);
                            await new Promise(r => setTimeout(r, 2000));
                        } catch(errAnnounce) {
                            console.error("Lỗi thông báo thưởng giới thiệu:", errAnnounce.message);
                        }
                    }
                }

                // 1b. Thông báo thưởng mốc giới thiệu theo tháng
                if (result.milestones && result.milestones.length > 0) {
                    console.log(`🤖 [Referral Announcer] Phát hiện ${result.milestones.length} thông báo thưởng mốc giới thiệu tháng mới!`);
                    for (const milestone of result.milestones) {
                        try {
                            const congratMsg = `🎉 Chúc mừng @${milestone.referrerName} đã xuất sắc đạt mốc giới thiệu thành viên mới trong Tháng ${milestone.monthYear} và nhận được phần thưởng thêm ${milestone.bonusRate} tổng hoa hồng cá nhân của tháng!`;
                            await activeApi.sendMessage({
                                msg: congratMsg,
                                mentions: [
                                    {
                                        pos: `🎉 Chúc mừng `.length,
                                        uid: String(milestone.referrerId),
                                        len: milestone.referrerName.length + 1
                                    }
                                ]
                            }, mainGroupId, 1);
                            
                            console.log(`🤖 [Referral Announcer] Đã thông báo thưởng mốc tháng của ${milestone.referrerName} thành công.`);
                            await new Promise(r => setTimeout(r, 2000));
                        } catch(errMilestone) {
                            console.error("Lỗi thông báo thưởng mốc tháng:", errMilestone.message);
                        }
                    }
                }
            }
            
            // 2. Quét thông báo hoàn thành đơn hàng đầu tiên của thành viên mới
            try {
                const congratsResponse = await fetch(orderAppsScriptUrl, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify({
                        action: "get_first_order_congrats",
                        token: "DongChau@Secure2026"
                    })
                });
                
                const congratsResultText = await congratsResponse.text();
                let congratsResult = null;
                try { congratsResult = JSON.parse(congratsResultText); } catch(e){}
                
                if (congratsResult && congratsResult.success && congratsResult.congrats && congratsResult.congrats.length > 0) {
                    console.log(`🤖 [First Order Announcer] Phát hiện ${congratsResult.congrats.length} thông báo đơn hàng đầu tiên mới chưa thông báo!`);
                    for (const item of congratsResult.congrats) {
                        try {
                            const amountFormatted = Math.round(item.amount).toLocaleString("vi-VN") + " đ";
                            const congratMsg = 
                                `🎉 Chúc mừng sếp @${item.zaloName} đã hoàn thành đơn hàng đầu tiên thành công qua nhóm!\n\n` +
                                `💰 Tiền hoàn đầu tiên sếp tích lũy được: +${amountFormatted}.\n\n` +
                                `Chúc sếp săn sale vui vẻ và nhận thêm thật nhiều tiền hoàn tiếp theo nhé! 🛍️✨`;
                                
                            await activeApi.sendMessage({
                                msg: congratMsg,
                                mentions: [
                                    {
                                        pos: `🎉 Chúc mừng sếp `.length,
                                        uid: String(item.zaloId),
                                        len: item.zaloName.length + 1
                                    }
                                ]
                            }, mainGroupId, 1);
                            
                            console.log(`🤖 [First Order Announcer] Đã thông báo đơn hàng đầu tiên của ${item.zaloName} thành công.`);
                            await new Promise(r => setTimeout(r, 2000));
                        } catch(errCongrat) {
                            console.error("Lỗi gửi tin nhắn chúc mừng đơn hàng đầu tiên:", errCongrat.message);
                        }
                    }
                }
            } catch (errFirstOrder) {
                console.error("Lỗi quét chúc mừng đơn hàng đầu tiên định kỳ:", errFirstOrder.message);
            }
        } catch(e) {
            console.error("Lỗi quét thưởng giới thiệu định kỳ:", e.message);
        }
    };

    setTimeout(runCheck, 10000);
    setInterval(runCheck, intervalMinutes * 60 * 1000);
}

function startAutoSyncSheetToVps(config) {
    const orderAppsScriptUrl = config.orderAppsScriptUrl;
    if (!orderAppsScriptUrl) return;

    console.log("🔄 [Auto-Sync Sheet->VPS 24/7] Đã kích hoạt lịch tự động đồng bộ dữ liệu từ Google Sheet về VPS định kỳ MỖI 5 PHÚT 24/7!");

    const doSync = async () => {
        try {
            // 1. Đồng bộ Payout List (thành viên, số dư, STK)
            const payoutRes = await fetch(`${orderAppsScriptUrl}?action=getPayoutList`);
            const payoutText = await payoutRes.text();
            let payoutData;
            try { payoutData = JSON.parse(payoutText); } catch(e){}

            if (payoutData && payoutData.success) {
                writeFileSync("sheet_users_backup.json", JSON.stringify(payoutData, null, 2), "utf8");
                console.log(`✅ [Auto-Sync 24/7] Đã tự động cập nhật dữ liệu ${payoutData.data?.length || payoutData.users?.length || 0} thành viên & số dư từ Google Sheet về VPS!`);
            }

            // 2. Đồng bộ Leaderboard (Bảng xếp hạng)
            try {
                const lbRes = await fetch(`${orderAppsScriptUrl}?action=getLeaderboard`);
                const lbText = await lbRes.text();
                let lbData;
                try { lbData = JSON.parse(lbText); } catch(e){}
                if (lbData && lbData.success) {
                    writeFileSync("sheet_leaderboard_backup.json", JSON.stringify(lbData, null, 2), "utf8");
                }
            } catch(e){}
        } catch (err) {
            console.error("⚠️ [Auto-Sync 24/7] Lỗi đồng bộ ngầm Sheet->VPS:", err.message);
        }
    };

    // Kích hoạt ngay sau 5 giây khi vừa khởi động Bot
    setTimeout(doSync, 5000);

    // Kích hoạt lịch chạy tự động định kỳ MỖI 5 PHÚT (300.000 ms) 24/7
    setInterval(doSync, 5 * 60 * 1000);
}

    // Khởi động các bộ hẹn giờ định kỳ
    startReminderScheduler(config);
    startSaleScheduler(config);
    startReferralAnnouncer(config);
    startTikTokDailyScheduler();
    startAutoSyncSheetToVps(config);

    // Kích hoạt tiến trình quét ngầm đồng bộ đơn TikTok Shop định kỳ 30 phút/lần
    setInterval(async () => {
        try {
            await syncTikTokOrdersViaRioHub();
        } catch (e) {}
    }, 30 * 60 * 1000);
    
    console.log("=========================================");
    console.log("Bot chuyển link Shopee Affiliate đang chạy!");
    console.log("Đang lắng nghe tin nhắn... (Nhấn Ctrl+C để dừng)");
    console.log("=========================================");
}

run().catch((e) => {
    console.error("Lỗi khởi chạy Bot:", e.message);
});

