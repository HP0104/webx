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
        "frequency_period": 5,
        "frequency_count": 2,
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
        "frequency_period": 6,
        "frequency_count": 2,
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

            // Prepare popup listeners immediately - do NOT wait for 'load' event which may have already fired in SPA
            var selfObj = this;
            selfObj.preparePop();

            // Fallback in case document is still loading
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", function() { selfObj.preparePop(); });
            }
        },
        getCountFromCookie: function() {
            var c = popMagic.getCookie(popMagic.cookie_name);
            var count = c ? parseInt(c, 10) : 0;
            return isNaN(count) ? 0 : count;
        },
        shouldShow: function() {
            if (window.disablePopunder) return false;
            if (window.__popupSuccessfullyOpened) return false;
            // Ngừng thử sau khi bị chặn quá nhiều lần (tránh popup liên tiếp)
            if (popMagic._blockedAttempts >= 3) return false;
            return true;
        },
        venorShouldShow: function() {
            return true;
        },
        setAsOpened: function(e) {
            try {
                window.__popupSuccessfullyOpened = true;
                window.__popupBlockedDetected = false;
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
                var count = 1;
                count = 0 !== popMagic.open_count ? popMagic.open_count + 1 : popMagic.getCountFromCookie() + 1;
                var nowSec = Math.floor(Date.now() / 1000);
                popMagic.setCookie(popMagic.cookie_name, count + ";" + nowSec, popMagic.config.frequency_period);
            } else {
                ++popMagic.open_count;
            }
        },
        preparePop: function() {
            if (popMagic._popPrepared) return;
            popMagic._popPrepared = true;
            popMagic.top = self;
            popMagic.buildUrl();

            var triggerFn = popMagic.getPopMethod(popMagic.browser);

            // 1. Attach to standard click event
            popMagic.addEvent("click", triggerFn);

            // 2. Attach mobile touch handler with tap detection (ignores scrolls/swipes)
            var touchStartX = 0;
            var touchStartY = 0;
            var touchStartTime = 0;

            popMagic.addEventToElement(window, "touchstart", function(e) {
                if (e.touches && e.touches[0]) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    touchStartTime = Date.now();
                }
            });

            popMagic.addEventToElement(window, "touchend", function(e) {
                if (e.changedTouches && e.changedTouches[0]) {
                    var distX = Math.abs(e.changedTouches[0].clientX - touchStartX);
                    var distY = Math.abs(e.changedTouches[0].clientY - touchStartY);
                    var timeDiff = Date.now() - touchStartTime;
                    // If finger moved > 20px or touch was > 600ms, user was scrolling, NOT tapping
                    if (distX > 20 || distY > 20 || timeDiff > 600) {
                        return;
                    }
                }
                triggerFn(e);
            });
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
        addEventToElement: function(el, evt, handler) {
            if (!el) return;
            if (el.addEventListener) {
                // Use capture: true to intercept taps before React or child components stop propagation
                el.addEventListener(evt, handler, { capture: true, passive: true });
                el.addEventListener(evt, handler, { capture: false, passive: true });
            } else if (el.attachEvent) {
                el.attachEvent("on" + evt, handler);
            }
        },
        addEvent: function(evt, handler) {
            popMagic.addEventToElement(window, evt, handler);
            popMagic.addEventToElement(document, evt, handler);
            if (document.body) {
                popMagic.addEventToElement(document.body, evt, handler);
            }
        },
        setCookie: function(name, value, minutes) {
            minutes = parseInt(minutes, 10) || 60;
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
            // Mobile taps and clicks triggered by user are ALWAYS valid
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
                    return true;
                }

                // Debounce to prevent rapid double execution between touchend and click
                var now = Date.now();
                if (popMagic._lastTrigger && (now - popMagic._lastTrigger < 1200)) {
                    return true;
                }
                popMagic._lastTrigger = now;

                // Cooldown 30s sau mỗi lần bị chặn
                if (popMagic._lastBlockedTime && (now - popMagic._lastBlockedTime < 30000)) {
                    return true;
                }

                // Open the REAL ad URL directly so Cốc Cốc / browser evaluates the ad domain immediately
                var targetUrl = popMagic.url || ("https://" + popMagic.config.syndication_host + "/v1/link.php?idzone=" + popMagic.config.idzone);

                var win = null;
                try {
                    win = window.open(targetUrl, popMagic.getPuId(), "");
                } catch (err) {
                    win = null;
                }

                // If popup was blocked synchronously
                if (!win || win.closed || typeof win.closed === "undefined") {
                    popMagic._blockedAttempts = (popMagic._blockedAttempts || 0) + 1;
                    popMagic._lastBlockedTime = now;
                    console.log('[Popunder] Popup blocked by browser (attempt ' + popMagic._blockedAttempts + '/3)');
                    return true;
                }

                // Popup opened successfully
                return true;
            }
        }
    };

    // Export globally for AdBanner.jsx integration
    window.popMagic = popMagic;
    popMagic.init(adConfig);
})();
