/**
 * 给外链加上小箭头
 */
document$.subscribe(function () {
    const currentHostname = window.location.hostname;
    const allLinks = document.querySelectorAll("a[href]");

    allLinks.forEach(link => {
        try {
            const linkUrl = new URL(link.href);
            // 判断是否为外链：协议为 http/https 且 域名不一致
            if (linkUrl.hostname !== currentHostname) {
                link.setAttribute("target", "_blank");
                // 建议同时添加 rel="noopener" 以增强安全性
                link.setAttribute("rel", "noopener");
            }
        } catch (e) {
            // 忽略无效或相对路径解析错误
        }
    });
});

/**
 * 在页脚显示备案信息
 */
// document$.subscribe(() => {
//     const container = document.querySelector(".md-copyright");
//     if (!container) return;

//     const record = document.createElement("div");
//     record.innerHTML = `
//     <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">
//       苏ICP备2024087610号-1
//     </a>
//     `;

//     container.appendChild(record);
// });

/**
 * 百度统计
 */
document$.subscribe(function () {
    if (window._hmt_initialized) {
        return
    }
    window._hmt_initialized = true

    window._hmt = window._hmt || []

    const hm = document.createElement("script")
    hm.src = "https://hm.baidu.com/hm.js?2671a19c27555d4fe9a537eb8b224efc"
    hm.async = true

    const s = document.getElementsByTagName("script")[0]
    s.parentNode.insertBefore(hm, s)
})

/**
 * 在图片下方显示 alt 文本
 */
document$.subscribe(() => {
    const container = document.querySelector(".md-content__inner.md-typeset");
    if (!container) return;

    const images = container.querySelectorAll("img");

    images.forEach((img) => {
        const altText = img.getAttribute("alt");
        if (!altText) return;

        const caption = document.createElement("div");
        caption.className = "markdown-img-caption";
        caption.textContent = altText;

        const parent = img.parentElement;
        if (parent && parent.tagName === "A" && parent.classList.contains("glightbox")) {
            // 如果启用了 glightbox，则在 img 外层的 a 标签后插入
            parent.insertAdjacentElement("afterend", caption);
        } else {
            // 否则直接在 img 后插入
            img.insertAdjacentElement("afterend", caption);
        }
    });
});

/**
 * 公式支持
 */
document$.subscribe(({ body }) => {
    renderMathInElement(body, {
        delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true }
        ],
    })
})

/**
 * ToC 上方注入广告
 */
document$.subscribe(() => {
    const ads = document.querySelector(".ads");

    if (!ads) {
        return;
    }

    const key = `ads:hidden:${location.pathname}`;
    const closable = ads.dataset.closable === "true";
    const closeExpiresHours = Number(ads.dataset.closeExpiresHours || "0");

    if (!closable) {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
        ads.classList.add("ads-visible");
        return;
    }

    const hiddenUntil = Number(localStorage.getItem(key) || "0");

    if (closeExpiresHours > 0 && hiddenUntil > Date.now()) {
        ads.remove();
        return;
    }

    if (closeExpiresHours <= 0 && sessionStorage.getItem(key) === "1") {
        ads.remove();
        return;
    }

    localStorage.removeItem(key);
    ads.classList.add("ads-visible");

    const close = ads.querySelector(".ads-close");

    close?.addEventListener("click", () => {
        ads.classList.remove("ads-visible");
        ads.remove();

        if (closeExpiresHours > 0) {
            localStorage.setItem(key, String(Date.now() + closeExpiresHours * 60 * 60 * 1000));
        } else {
            sessionStorage.setItem(key, "1");
        }
    });
});

/**
 * 侧边栏滚动条：滚动后自动隐藏
 */
document$.subscribe(() => {
    const scrollWraps = document.querySelectorAll(".md-sidebar__scrollwrap");

    scrollWraps.forEach(wrap => {
        wrap.addEventListener("scroll", () => {
            // 滚动时添加隐藏类
            wrap.classList.add("scrollbar-hidden");
        });
    });
})
