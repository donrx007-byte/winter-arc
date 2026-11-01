(function () {
  "use strict";
  var P = window.PLAN;
  var LS = window.localStorage;
  var DAY = 86400000;

  // ---------- storage (safe) ----------
  function get(k, d) { try { var v = LS.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { LS.setItem(k, JSON.stringify(v)); } catch (e) {} }

  // ---------- dates ----------
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parse(s) { var a = s.split("-"); return new Date(+a[0], +a[1] - 1, +a[2]); }
  var START = parse(P.START);
  function dayIndex(d) { return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - START) / DAY); }
  function weekOf(idx) { return Math.floor(idx / 7) + 1; }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  function nice(d) { return DOW[(d.getDay() + 6) % 7] + " " + d.getDate() + " " + MON[d.getMonth()]; }

  // ---------- plan logic ----------
  function activeHabits(week) { return P.HABITS.filter(function (h) { return h.start <= week; }); }
  function dueToday(h, week, dow) { // dow 0=Mon
    if (h.id === "workout") return [0, 1, 3, 4].indexOf(dow) >= 0;
    if (h.id === "retinol") return (week >= 7 ? [0, 2, 4] : [0, 3]).indexOf(dow) >= 0;
    return true;
  }
  function dueList(idx) {
    if (idx < 0 || idx >= P.WEEKS_N * 7) return [];
    var w = weekOf(idx), dow = idx % 7;
    return activeHabits(w).filter(function (h) { return dueToday(h, w, dow); });
  }
  function doneMap(dateIso) { return get("done:" + dateIso, {}); }
  function pct(idx) {
    var due = dueList(idx);
    if (!due.length) return 0;
    var m = doneMap(iso(addDays(START, idx))), n = 0;
    due.forEach(function (h) { if (m[h.id]) n++; });
    return n / due.length;
  }
  function streak(todayIdx) {
    var i = todayIdx, s = 0;
    if (pct(i) < 0.7) i--;
    while (i >= 0 && pct(i) >= 0.7) { s++; i--; }
    return s;
  }

  // ---------- dom helpers ----------
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  var view = document.getElementById("view");
  var sub = document.getElementById("sub");
  var tab = "today";
  var selDate = null; // iso
  var planWeek = null;
  var chapterTab = "chapters";

  function clear() { while (view.firstChild) view.removeChild(view.firstChild); }

  // ---------- Today ----------
  function todayView() {
    var now = new Date();
    var realIdx = dayIndex(now);
    if (!selDate) selDate = iso(realIdx < 0 ? START : (realIdx >= P.WEEKS_N * 7 ? addDays(START, P.WEEKS_N * 7 - 1) : now));
    var d = parse(selDate), idx = dayIndex(d);
    var inRange = idx >= 0 && idx < P.WEEKS_N * 7;
    var week = Math.min(Math.max(weekOf(idx), 1), P.WEEKS_N);
    var wk = P.WEEKS[week - 1];
    var phase = P.PHASES.filter(function (p) { return p.weeks.indexOf(String(week)) >= 0; })[0];
    sub.textContent = nice(d) + (inRange ? "  |  Day " + (idx + 1) + " of " + P.WEEKS_N * 7 : "");

    if (realIdx < 0) {
      var left = -realIdx;
      view.appendChild(el("div", { class: "card" }, [
        el("div", { class: "big", text: left + " day" + (left === 1 ? "" : "s") + " to go" }),
        el("p", { text: "The plan starts Monday " + nice(START) + ". Use the days before to buy your 3 starter products and set your sleep window (see Plan > Week 1)." })]));
    }

    // nav
    view.appendChild(el("div", { class: "row between" }, [
      el("button", { class: "btn ghost", text: "‹ Prev", onclick: function () { selDate = iso(addDays(d, -1)); render(); } }),
      el("button", { class: "btn ghost", text: "Today", onclick: function () { selDate = null; render(); } }),
      el("button", { class: "btn ghost", text: "Next ›", onclick: function () { selDate = iso(addDays(d, 1)); render(); } })]));

    if (!inRange) {
      view.appendChild(el("div", { class: "card" }, [el("p", { text: idx >= P.WEEKS_N * 7 ? "The 8 weeks are done. Open Progress to compare your results and plan the next cycle." : "This date is before the plan starts." })]));
      return;
    }

    var due = dueList(idx), m = doneMap(selDate), done = 0;
    due.forEach(function (h) { if (m[h.id]) done++; });
    var s = streak(Math.min(realIdx, P.WEEKS_N * 7 - 1));

    view.appendChild(el("div", { class: "card" }, [
      el("div", { class: "row between" }, [
        el("div", {}, [el("div", { class: "mute", text: phase ? phase.name : "" }), el("h3", { text: "Week " + week + ": " + wk.title })]),
        el("div", { class: "pill", text: "Streak " + s + "d" })]),
      el("p", { class: "mute", text: wk.new }),
      el("div", { class: "bar" }, [el("i", { style: "width:" + Math.round((done / due.length) * 100) + "%" })]),
      el("div", { class: "mute", text: done + " of " + due.length + " done today" + (done / due.length >= 0.7 ? "  ✓ counts toward streak" : "") })]));

    var card = el("div", { class: "card" });
    activeHabits(week).forEach(function (h) {
      var isDue = dueToday(h, week, idx % 7);
      var cb = el("input", { type: "checkbox" });
      cb.checked = !!m[h.id];
      cb.addEventListener("change", function () {
        var mm = doneMap(selDate); mm[h.id] = cb.checked; set("done:" + selDate, mm); render();
      });
      var row = el("label", { class: "chk" + (isDue ? "" : " off") }, [cb, el("div", { class: "t" }, [
        el("div", { text: h.label }),
        el("div", { class: "n", text: (isDue ? "" : "Rest day for this one. ") + h.note }),
        h.start === week ? el("span", { class: "pill new", text: "NEW THIS WEEK" }) : null])]);
      card.appendChild(row);
    });
    view.appendChild(card);

    if (due.length) {
      view.appendChild(el("div", { class: "card" }, [
        el("h3", { text: "Short on time? Minimum Viable Day" }),
        el("p", { class: "mute", text: "Wake and sleep within 1 h of normal. Finish the water bottle. Cleanse + moisturise + SPF. Protein at 2 meals. 5 min posture. Never miss twice." })]));
    }
  }

  // ---------- Plan ----------
  function planView() {
    var now = new Date(), cur = Math.min(Math.max(weekOf(dayIndex(now)), 1), P.WEEKS_N);
    if (!planWeek) planWeek = cur;
    sub.textContent = "8 weeks | " + nice(START) + " to " + nice(addDays(START, P.WEEKS_N * 7 - 1));
    var tabs = el("div", { class: "tabs" });
    for (var w = 1; w <= P.WEEKS_N; w++) (function (w) {
      tabs.appendChild(el("button", { class: w === planWeek ? "on" : "", text: "Wk " + w, onclick: function () { planWeek = w; render(); } }));
    })(w);
    view.appendChild(tabs);
    var wk = P.WEEKS[planWeek - 1];
    var phase = P.PHASES.filter(function (p) { return p.weeks.indexOf(String(planWeek)) >= 0; })[0];
    view.appendChild(el("div", { class: "card" }, [
      el("div", { class: "mute", text: wk.dates + "  |  " + (phase ? phase.name : "") }),
      el("h3", { text: "Week " + wk.n + ": " + wk.title }),
      el("p", { text: wk.new })]));

    var days = el("div", { class: "days" });
    var realIdx = dayIndex(now);
    for (var i = 0; i < 7; i++) (function (i) {
      var idx = (planWeek - 1) * 7 + i, p = pct(idx), dt = addDays(START, idx);
      var cls = "day" + (idx > realIdx ? " future" : (p >= 0.7 ? " good" : (p > 0 ? " part" : "")));
      days.appendChild(el("div", { class: cls, onclick: function () { selDate = iso(dt); tab = "today"; setTab(); } }, [
        DOW[i], el("b", { text: String(dt.getDate()) }), Math.round(p * 100) + "%"]));
    })(i);
    view.appendChild(el("div", { class: "card" }, [el("h3", { text: "Daily completion (tap a day to open it)" }), days]));

    var setup = el("div", { class: "card" }, [el("h3", { text: "Setup tasks" })]);
    wk.setup.forEach(function (t, i) { setup.appendChild(taskRow("setup:" + wk.n + ":" + i, t)); });
    view.appendChild(setup);
    var goals = el("div", { class: "card" }, [el("h3", { text: "Weekly goals" })]);
    wk.goals.forEach(function (t, i) { goals.appendChild(taskRow("goal:" + wk.n + ":" + i, t)); });
    view.appendChild(goals);

    var key = "review:" + wk.n, rv = get(key, {});
    var f = function (name, label) {
      var inp = el("input", { type: "text", placeholder: label });
      inp.value = rv[name] || "";
      inp.addEventListener("input", function () { rv[name] = inp.value; set(key, rv); });
      return inp;
    };
    view.appendChild(el("div", { class: "card" }, [el("h3", { text: "Weekly review (Sunday night)" }),
      el("div", { class: "grid" }, [f("well", "What went well"), f("hard", "What got in the way"), f("next", "One change for next week")])]));
  }
  function taskRow(key, text) {
    var cb = el("input", { type: "checkbox" });
    cb.checked = !!get("task:" + key, false);
    cb.addEventListener("change", function () { set("task:" + key, cb.checked); });
    return el("label", { class: "chk" }, [cb, el("div", { class: "t", text: text })]);
  }

  // ---------- Guide ----------
  function list(items) { return el("ul", {}, items.map(function (t) { return el("li", { text: t }); })); }
  function guideView() {
    sub.textContent = "Quick reference from the video";
    var tabs = el("div", { class: "tabs" });
    [["chapters", "10 chapters"], ["train", "Training"], ["food", "Food"], ["style", "Style"], ["shop", "Shopping"], ["safety", "Safety"]].forEach(function (t) {
      tabs.appendChild(el("button", { class: chapterTab === t[0] ? "on" : "", text: t[1], onclick: function () { chapterTab = t[0]; render(); } }));
    });
    view.appendChild(tabs);
    if (chapterTab === "chapters") {
      P.CHAPTERS.forEach(function (c) {
        view.appendChild(el("details", {}, [el("summary", { text: c.n + ". " + c.title }),
          el("b", { text: "What the video says" }), list(c.video),
          el("b", { text: "What to do" }), list(c.do),
          el("div", { class: "warn", text: "Watch out: " + c.watch })]));
      });
    } else if (chapterTab === "train") {
      view.appendChild(el("div", { class: "card" }, [el("p", { text: "4 days: Mon Push, Tue Pull, Thu Legs + neck, Fri Upper width. 45-60 min. Week 3 is light (stop 2 reps before failure). From week 4 add a rep or a little weight each week." })]));
      P.TRAINING.forEach(function (t) {
        view.appendChild(el("details", {}, [el("summary", { text: t.day + ": " + t.name }),
          el("b", { text: "Gym" }), list(t.gym), el("b", { text: "Home" }), list(t.home)]));
      });
      view.appendChild(protCalc());
    } else if (chapterTab === "food") {
      var c = el("div", { class: "card" }, [el("h3", { text: "Sample day" })]);
      P.MEALS.forEach(function (m) { c.appendChild(el("p", {}, [el("b", { text: m[0] + ": " }), m[1]])); });
      view.appendChild(c);
      view.appendChild(el("div", { class: "card" }, [el("h3", { text: "Rules of thumb" }), list([
        "Mostly whole foods; no added sugar for 3-4 weeks and compare your face.",
        "Protein at every meal: eggs, soya chunks, dal, curd, chicken, fish.",
        "Potassium: banana, coconut water, spinach (cheera), potato, tomato.",
        "Colourful veg and omega-3 fish (mathi, ayila) from week 5.",
        "About 3 L of water; lighter in the last 1-2 h before bed."])]));
      view.appendChild(protCalc());
    } else if (chapterTab === "style") {
      P.OUTFITS.forEach(function (o) {
        view.appendChild(el("div", { class: "card" }, [el("h3", { text: o[0] + " (" + o[1] + ")" }), el("p", { text: "Works: " + o[2] }), el("p", { class: "mute", text: "Avoid: " + o[3] })]));
      });
      view.appendChild(el("div", { class: "card" }, [el("h3", { text: "5-second scan" }), list(["Does it fit?", "Does it match the occasion?", "Is there one thing that stands out?", "Am I clean and fresh?"])]));
    } else if (chapterTab === "shop") {
      var t = el("table", {}, [el("tr", {}, ["Item", "When", "INR"].map(function (h) { return el("th", { text: h }); }))]);
      P.PRODUCTS.forEach(function (p) { t.appendChild(el("tr", {}, [p[0], p[1], p[2]].map(function (x) { return el("td", { text: x }); }))); });
      view.appendChild(el("div", { class: "card" }, [t, el("p", { class: "mute", text: "Rough planning prices, not checked live. Buy the cheapest option with the right ingredients." })]));
    } else {
      view.appendChild(el("div", { class: "warn", text: "General information adapted from a video. Not medical advice." }));
      view.appendChild(el("div", { class: "card" }, [el("h3", { text: "Ask a doctor / dermatologist / dentist first" }), list([
        "Finasteride or any oral hair-loss medicine (prescription only).",
        "Scalp or beard minoxidil (dermatologist first, especially if young).",
        "Melatonin (try sleep habits first; ask a doctor or pharmacist).",
        "Persistent acne, scarring, rash, or skin that stays red/flaky.",
        "Crowded teeth or Invisalign; jaw pain (stop chewing training).",
        "Blocked nose / mouth breathing (see an ENT before taping).",
        "Back or neck pain, tingling, numbness or dizziness in training."])]));
      view.appendChild(el("div", { class: "card" }, [el("h3", { text: "Stop signs" }), list([
        "Skin burning, swelling or blistering: stop the newest product, see a pharmacist or doctor.",
        "Mirror checking, calorie counting or weighing starting to feel compulsive: step back, simplify, talk to someone you trust or a doctor."])]));
    }
  }
  function protCalc() {
    var inp = el("input", { type: "number", placeholder: "Your weight in kg", inputmode: "decimal" });
    var out = el("p", { class: "mute" });
    var saved = get("weightKg", "");
    function upd() {
      var kg = parseFloat(inp.value);
      if (!kg || kg < 25 || kg > 250) { out.textContent = "Enter your weight to see your protein target."; return; }
      set("weightKg", kg);
      var lb = Math.round(kg * 2.2046);
      out.textContent = "Video target: about " + lb + " g/day (1 g per lb). Research floor: about " + Math.round(kg * 1.6) + " g/day (1.6 g per kg). Aim between them and build up.";
    }
    inp.value = saved; inp.addEventListener("input", upd); upd();
    return el("div", { class: "card" }, [el("h3", { text: "Protein target" }), inp, out]);
  }

  // ---------- Progress ----------
  function progressView() {
    sub.textContent = "Measurements and exports";
    var logs = get("logs", []);
    var f = {};
    function field(name, label, type) {
      var i = el("input", { type: type || "number", placeholder: label, inputmode: type ? null : "decimal" });
      f[name] = i; return i;
    }
    var dateI = field("date", "Date", "date"); dateI.value = iso(new Date());
    var form = el("div", { class: "card" }, [el("h3", { text: "Add a check-in" }),
      el("div", { class: "grid g2" }, [dateI, field("weight", "Weight (kg)"), field("waist", "Waist (cm)"), field("neck", "Neck (cm)"), field("skin", "Skin (1-10)"), field("energy", "Energy (1-10)")]),
      el("div", { style: "margin-top:10px" }, [el("button", { class: "btn", text: "Save check-in", onclick: function () {
        var e = { date: f.date.value || iso(new Date()) };
        ["weight", "waist", "neck", "skin", "energy"].forEach(function (k) { var v = parseFloat(f[k].value); if (!isNaN(v)) e[k] = v; });
        logs = get("logs", []).filter(function (x) { return x.date !== e.date; }); logs.push(e);
        logs.sort(function (a, b) { return a.date < b.date ? -1 : 1; }); set("logs", logs); render();
      } })])]);
    view.appendChild(form);

    // weight chart
    var pts = logs.filter(function (x) { return x.weight; });
    if (pts.length >= 2) {
      var W = 300, H = 120, mn = Math.min.apply(null, pts.map(function (p) { return p.weight; })) - 1, mx = Math.max.apply(null, pts.map(function (p) { return p.weight; })) + 1;
      var path = pts.map(function (p, i) { return (i ? "L" : "M") + (10 + i * (W - 20) / (pts.length - 1)).toFixed(1) + " " + (H - 15 - (p.weight - mn) / (mx - mn) * (H - 30)).toFixed(1); }).join(" ");
      var svg = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%"><path d="' + path + '" fill="none" stroke="#2BB59A" stroke-width="2"/>' +
        '<text x="10" y="12">' + mx.toFixed(1) + ' kg</text><text x="10" y="' + (H - 3) + '">' + mn.toFixed(1) + " kg</text></svg>";
      var box = el("div", { class: "card" }, [el("h3", { text: "Weight trend" })]);
      var holder = el("div"); holder.innerHTML = svg; box.appendChild(holder); view.appendChild(box);
    }

    var tb = el("table", {}, [el("tr", {}, ["Date", "kg", "Waist", "Neck", "Skin", "Energy"].map(function (h) { return el("th", { text: h }); }))]);
    logs.slice().reverse().forEach(function (x) {
      tb.appendChild(el("tr", {}, [x.date, x.weight, x.waist, x.neck, x.skin, x.energy].map(function (v) { return el("td", { text: v === undefined ? "-" : String(v) }); })));
    });
    view.appendChild(el("div", { class: "card" }, [el("h3", { text: "History" }), logs.length ? tb : el("p", { class: "mute", text: "No check-ins yet. Do the first one on Day 1, one at Week 4 (Sun 29 Nov) and one at Week 8 (Sun 27 Dec)." })]));

    // totals
    var tot = 0, good = 0;
    for (var i = 0; i < P.WEEKS_N * 7; i++) { if (i > dayIndex(new Date())) break; tot++; if (pct(i) >= 0.7) good++; }
    view.appendChild(el("div", { class: "card" }, [el("h3", { text: "Consistency" }), el("p", { text: good + " good days (70%+ of habits) out of " + tot + " so far." })]));

    // export / import
    var ta = el("textarea", { rows: "3", placeholder: "Paste a backup here to restore" });
    view.appendChild(el("div", { class: "card" }, [el("h3", { text: "Backup (offline, on your phone)" }),
      el("p", { class: "mute", text: "Your data lives only in this browser/app. Copy a backup now and then (e.g. into a notes app)." }),
      el("div", { class: "row" }, [
        el("button", { class: "btn ghost", text: "Show backup text", onclick: function () {
          var o = {}; try { for (var k in LS) { if (LS.hasOwnProperty(k) && /^(done:|task:|review:|logs|weightKg)/.test(k)) o[k] = LS.getItem(k); } } catch (e) {}
          ta.value = JSON.stringify(o); ta.select();
        } }),
        el("button", { class: "btn ghost", text: "Restore", onclick: function () {
          try { var o = JSON.parse(ta.value); for (var k in o) if (/^(done:|task:|review:|logs|weightKg)/.test(k)) LS.setItem(k, o[k]); render(); } catch (e) { alert("That backup text could not be read."); }
        } })]), ta]));
  }

  // ---------- routing ----------
  function render() {
    clear();
    if (tab === "today") todayView(); else if (tab === "plan") planView(); else if (tab === "guide") guideView(); else progressView();
    window.scrollTo(0, 0);
  }
  function setTab() {
    var bs = document.querySelectorAll("nav button");
    for (var i = 0; i < bs.length; i++) bs[i].className = bs[i].getAttribute("data-tab") === tab ? "on" : "";
    render();
  }
  var navBtns = document.querySelectorAll("nav button");
  for (var i = 0; i < navBtns.length; i++) navBtns[i].addEventListener("click", function () { tab = this.getAttribute("data-tab"); if (tab === "today") selDate = null; setTab(); });
  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
