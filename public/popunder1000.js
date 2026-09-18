(function() {
    function randStr(e, t) {
        for (var n = "", r = t || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", o = 0; o < e; o++) {
            n += r.charAt(Math.floor(Math.random() * r.length));
        }
        return n;
    }
    function generateContent() {
        if (void 0 === generateContent.val) {
            generateContent.val = "document.dispatchEvent(" + randStr(4 * Math.random() + 3) + ");";
        }
        return generateContent.val;
    }
    try {
        Object.defineProperty(document.currentScript, "innerHTML", { get: generateContent });
        Object.defineProperty(document.currentScript, "textContent", { get: generateContent });
    } catch (e) {}

    // version 11.0.0
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

    var adConfig = isMobile ? {
        "ads_host": "a.pemsrv.com",
        "syndication_host": "s.pemsrv.com",
        "idzone": 6004200,
        "popup_fallback": false,
        "popup_force": true,
        "chrome_enabled": true,
        "new_tab": true,
        "frequency_period": 720,
        "frequency_count": 1,
        "trigger_method": 1,
        "trigger_class": "",
        "trigger_delay": 0,
        "capping_enabled": true,
        "tcf_enabled": true,
        "agego_cross_site_enabled": true,
        "only_inline": true
    } : {
        "ads_host": "a.pemsrv.com",
        "syndication_host": "s.pemsrv.com",
        "idzone": 5983670,
        "popup_fallback": false,
        "popup_force": true,
        "chrome_enabled": true,
        "new_tab": true,
        "frequency_period": 720,
        "frequency_count": 1,
        "trigger_method": 1,
        "trigger_class": "",
        "trigger_delay": 0,
        "capping_enabled": true,
        "tcf_enabled": true,
        "agego_cross_site_enabled": true,
        "only_inline": true
    };

    var popMagic = {
        version: 11,
        cookie_name: "",
        url: "",
        config: {},
        open_count: 0,
        top: null,
        browser: null,
        venor_loaded: true,
        venor: "0",
        tcfData: null,
        remoteLicensedDomains: ["exdynsrv.com", "exosrv.com", "exoclick.com", "opoxv.com", "exacdn.com", "pemsrv.com"],
        _completed: false,
        _popPrepared: false,
        _lastTrigger: 0,
        _clickHandler: null,
        _touchStartHandler: null,
        _touchEndHandler: null,
        configTpl: {
            ads_host: "",
            syndication_host: "",
            idzone: "",
            frequency_period: 720,
            frequency_count: 1,
            trigger_method: 1,
            trigger_class: "",
            popup_force: false,
            popup_fallback: false,
            chrome_enabled: true,
            new_tab: false,
            cat: "",
            tags: "",
            el: "",
            sub: "",
            sub2: "",
            sub3: "",
            block_ad_types: "",
            only_inline: false,
            trigger_delay: 0,
            capping_enabled: true,
            tcf_enabled: false,
            agego_cross_site_enabled: true,
            cookieconsent: true,
            should_fire: function() { return true; },
            on_redirect: null
        },
        init: function(userConfig) {
            if (!userConfig || !userConfig.idzone) return;
            for (var k in this.configTpl) {
                if (Object.prototype.hasOwnProperty.call(this.configTpl, k)) {
                    this.config[k] = (void 0 !== userConfig[k]) ? userConfig[k] : this.configTpl[k];
                }
            }
            this.cookie_name = "zone-cap-" + this.config.idzone;
            this.browser = this.browserDetector.getBrowserInfo();
            this.buildUrl();

            // Nếu đã xem popup trong phiên này hoặc đã đạt giới hạn capping, không gắn listener
            if (this.isCappingReached()) {
                console.log("[Popunder] Capping already reached (" + this.cookie_name + "). Listeners skipped.");
                return;
            }

            var selfObj = this;
            selfObj.preparePop();

            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", function() {
                    selfObj.preparePop();
                }, { once: true });
            }
        },
        isCappingReached: function() {
            try {
                if (window.__popupSuccessfullyOpened) return true;
                if (sessionStorage.getItem("popunder_done_" + this.config.idzone)) return true;
                if (sessionStorage.getItem("popunder_done")) return true;
                if (this.config.capping_enabled) {
                    var c = this.getCookie(this.cookie_name);
                    if (c) {
                        var count = parseInt(c.split(";")[0], 10);
                        if (!isNaN(count) && count >= (this.config.frequency_count || 1)) {
                            return true;
                        }
                    }
                }
            } catch (err) {}
            return false;
        },
        getCountFromCookie: function() {
            var c = popMagic.getCookie(popMagic.cookie_name);
            var count = c ? parseInt(c.split(";")[0], 10) : 0;
            return isNaN(count) ? 0 : count;
        },
        shouldShow: function() {
            if (window.disablePopunder) return false;
            if (popMagic._completed) return false;
            if (popMagic.isCappingReached()) return false;
            return true;
        },
        venorShouldShow: function() {
            return true;
        },
        setAsOpened: function(e) {
            popMagic._completed = true;
            try {
                window.__popupSuccessfullyOpened = true;
                window.__popupBlockedDetected = false;
                sessionStorage.setItem("popunder_done_" + popMagic.config.idzone, "1");
                sessionStorage.setItem("popunder_done", "1");
            } catch (err) {}

            var target = e ? e.target || e.srcElement : null;
            var detail = {
                id: target && target.id ? target.id : "",
                tagName: target && target.tagName ? target.tagName : "",
                classes: target && target.classList ? target.classList : "",
                text: target && target.outerText ? target.outerText : "",
                href: target && target.href ? target.href : "",
                elm: target
            };

            try {
                var evt = new CustomEvent("creativeDisplayed-" + popMagic.config.idzone, { detail: detail });
                document.dispatchEvent(evt);
            } catch (err) {}

            if (popMagic.config.capping_enabled) {
                var count = popMagic.getCountFromCookie() + 1;
                var nowSec = Math.floor(Date.now() / 1000);
                popMagic.setCookie(popMagic.cookie_name, count + ";" + nowSec, popMagic.config.frequency_period);
            } else {
                ++popMagic.open_count;
            }

            console.log("[Popunder] Popup opened successfully. Removing all event listeners to prevent continuous popups.");
            popMagic.removeListeners();
        },
        markAsBlocked: function() {
            popMagic._completed = true;
            try {
                sessionStorage.setItem("popunder_done_" + popMagic.config.idzone, "blocked");
                sessionStorage.setItem("popunder_done", "blocked");
            } catch (err) {}
            console.log("[Popunder] Popup blocked by browser popup blocker. Halting all further popup attempts.");
            popMagic.removeListeners();
        },
        preparePop: function() {
            if (popMagic._popPrepared) return;
            if (popMagic.isCappingReached() || popMagic._completed) return;
            popMagic._popPrepared = true;
            popMagic.top = self;
            popMagic.buildUrl();

            var triggerFn = function(e) {
                if (popMagic._completed || popMagic.isCappingReached()) {
                    popMagic.removeListeners();
                    return;
                }
                popMagic.methods.popup(e);
            };

            popMagic._clickHandler = triggerFn;
            document.addEventListener("click", triggerFn, { capture: true, passive: true });

            var touchStartX = 0;
            var touchStartY = 0;
            var touchStartTime = 0;

            popMagic._touchStartHandler = function(e) {
                if (e.touches && e.touches[0]) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    touchStartTime = Date.now();
                }
            };

            popMagic._touchEndHandler = function(e) {
                if (popMagic._completed || popMagic.isCappingReached()) {
                    popMagic.removeListeners();
                    return;
                }
                if (e.changedTouches && e.changedTouches[0]) {
                    var distX = Math.abs(e.changedTouches[0].clientX - touchStartX);
                    var distY = Math.abs(e.changedTouches[0].clientY - touchStartY);
                    var timeDiff = Date.now() - touchStartTime;
                    if (distX > 25 || distY > 25 || timeDiff > 600) {
                        return;
                    }
                }
                triggerFn(e);
            };

            document.addEventListener("touchstart", popMagic._touchStartHandler, { capture: true, passive: true });
            document.addEventListener("touchend", popMagic._touchEndHandler, { capture: true, passive: true });
        },
        removeListeners: function() {
            if (popMagic._clickHandler) {
                try {
                    document.removeEventListener("click", popMagic._clickHandler, { capture: true, passive: true });
                    document.removeEventListener("click", popMagic._clickHandler, true);
                } catch (err) {}
                popMagic._clickHandler = null;
            }
            if (popMagic._touchStartHandler) {
                try {
                    document.removeEventListener("touchstart", popMagic._touchStartHandler, { capture: true, passive: true });
                    document.removeEventListener("touchstart", popMagic._touchStartHandler, true);
                } catch (err) {}
                popMagic._touchStartHandler = null;
            }
            if (popMagic._touchEndHandler) {
                try {
                    document.removeEventListener("touchend", popMagic._touchEndHandler, { capture: true, passive: true });
                    document.removeEventListener("touchend", popMagic._touchEndHandler, true);
                } catch (err) {}
                popMagic._touchEndHandler = null;
            }
        },
        getPopMethod: function() {
            return popMagic.methods.popup;
        },
        buildUrl: function() {
            var protocol = ("https:" !== document.location.protocol && "http:" !== document.location.protocol ? "https:" : document.location.protocol);
            var pageUrl = top === self ? document.URL : document.referrer;
            this.url = protocol + "//" + this.config.syndication_host + "/v1/link.php?cat=" +
                encodeURIComponent(this.config.cat || "") +
                "&idzone=" + this.config.idzone +
                "&type=8&p=" + encodeURIComponent(pageUrl) +
                "&sub=" + encodeURIComponent(this.config.sub || "") +
                (this.config.sub2 ? "&sub2=" + encodeURIComponent(this.config.sub2) : "") +
                (this.config.sub3 ? "&sub3=" + encodeURIComponent(this.config.sub3) : "") +
                "&block=1&el=" + encodeURIComponent(this.config.el || "") +
                "&tags=" + encodeURIComponent(this.config.tags || "") +
                "&cb=" + Math.floor(1e9 * Math.random()) +
                "&cookieconsent=true";
        },
        setCookie: function(name, value, minutes) {
            minutes = parseInt(minutes, 10) || 720;
            var exp = new Date();
            exp.setMinutes(exp.getMinutes() + minutes);
            document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + exp.toUTCString() + "; path=/";
        },
        getCookie: function(name) {
            var parts = document.cookie.split(";");
            for (var i = 0; i < parts.length; i++) {
                var p = parts[i].trim();
                var eq = p.indexOf("=");
                if (eq !== -1 && p.substring(0, eq) === name) {
                    return decodeURIComponent(p.substring(eq + 1));
                }
            }
            return null;
        },
        isValidUserEvent: function(e) {
            return true;
        },
        getPuId: function() {
            return "ok_" + Math.floor(89999999 * Math.random() + 1e7);
        },
        browserDetector: {
            getBrowserInfo: function() {
                var ua = navigator.userAgent || "";
                return {
                    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
                    isChrome: /Chrome|CriOS/i.test(ua)
                };
            }
        },
        methods: {
            popup: function(e) {
                if (!popMagic.shouldShow() || !popMagic.venorShouldShow()) {
                    popMagic.removeListeners();
                    return true;
                }

                // Debounce 2 giây ngăn chặn click kép nhanh
                var now = Date.now();
                if (popMagic._lastTrigger && (now - popMagic._lastTrigger < 2000)) {
                    return true;
                }
                popMagic._lastTrigger = now;

                var targetUrl = popMagic.url || ("https://" + popMagic.config.syndication_host + "/v1/link.php?idzone=" + popMagic.config.idzone);

                var win = null;
                try {
                    win = window.open(targetUrl, popMagic.getPuId(), "");
                } catch (err) {
                    win = null;
                }

                // Nếu popup bị chặn bởi trình duyệt
                if (!win || win.closed || typeof win.closed === "undefined") {
                    console.log("[Popunder] Popup blocked by browser popup blocker");
                    popMagic.markAsBlocked();
                    return true;
                }

                // Popup mở thành công! Đánh dấu và gỡ bỏ ngay toàn bộ listener
                popMagic.setAsOpened(e);
                return true;
            }
        }
    };

    // Export globally for AdBanner.jsx integration
    window.popMagic = popMagic;
    popMagic.init(adConfig);
})();
