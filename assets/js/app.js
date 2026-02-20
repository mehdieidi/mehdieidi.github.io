// ============================================
// CURRICULUM EXPLORER APP — COMPLETE
// ============================================

(function () {
    "use strict";

    // ---- STATE ----
    const state = {
        currentCurriculum: "bsc",
        currentView: "timeline",
        selectedCourse: null,
        progress: loadProgress(),
        filters: { category: "all", ai: "all", status: "all" },
        search: "",
        sort: { key: "id", dir: "asc" },
        graph: {
            nodes: [],
            nodeMap: {},
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            selectedId: null,
            hoveredId: null,
            dragging: false,
            dragStartX: 0,
            dragStartY: 0,
            dragOffsetX: 0,
            dragOffsetY: 0
        }
    };

    // ---- PERSISTENCE ----
    function loadProgress() {
        try { return JSON.parse(localStorage.getItem("curriculum-progress")) || {}; }
        catch (e) { return {}; }
    }
    function saveProgress() {
        localStorage.setItem("curriculum-progress", JSON.stringify(state.progress));
    }
    function getStatus(id) {
        return state.progress[id] || "not-started";
    }
    function setStatus(id, s) {
        state.progress[id] = s;
        saveProgress();
        renderAll();
    }

    // ---- HELPERS ----
    function getCurriculum() { return CURRICULA[state.currentCurriculum]; }
    function getCourses() { return getCurriculum().courses; }

    function findCourse(id) {
        for (var k in CURRICULA) {
            var c = CURRICULA[k].courses.find(function (x) { return x.id === id; });
            if (c) return c;
        }
        return null;
    }

    function getFilteredCourses() {
        var courses = getCourses().slice();
        var f = state.filters;
        var s = state.search.toLowerCase();
        if (f.category !== "all") courses = courses.filter(function (c) { return c.category === f.category; });
        if (f.ai === "high") courses = courses.filter(function (c) { return c.aiProof >= 8; });
        if (f.ai === "medium") courses = courses.filter(function (c) { return c.aiProof >= 5 && c.aiProof < 8; });
        if (f.ai === "low") courses = courses.filter(function (c) { return c.aiProof < 5; });
        if (f.status === "completed") courses = courses.filter(function (c) { return getStatus(c.id) === "completed"; });
        if (f.status === "in-progress") courses = courses.filter(function (c) { return getStatus(c.id) === "in-progress"; });
        if (f.status === "not-started") courses = courses.filter(function (c) { return getStatus(c.id) === "not-started"; });
        if (s) {
            courses = courses.filter(function (c) {
                return c.name.toLowerCase().indexOf(s) >= 0 ||
                    c.description.toLowerCase().indexOf(s) >= 0 ||
                    c.topics.some(function (t) { return t.toLowerCase().indexOf(s) >= 0; }) ||
                    c.category.toLowerCase().indexOf(s) >= 0 ||
                    c.source.toLowerCase().indexOf(s) >= 0;
            });
        }
        return courses;
    }

    function aiProofClass(v) { return v >= 8 ? "ai-high" : v >= 5 ? "ai-medium" : "ai-low"; }
    function aiProofLabel(v) { return (v >= 8 ? "🟢 " : v >= 5 ? "🟡 " : "🔴 ") + v + "/10"; }
    function aiMeterColor(v) { return v >= 8 ? "#3fb950" : v >= 5 ? "#d29922" : "#f85149"; }

    function populateCategoryFilter() {
        var sel = document.getElementById("filter-category");
        sel.innerHTML = '<option value="all">All Categories</option>';
        for (var k in CATEGORIES) {
            var v = CATEGORIES[k];
            sel.innerHTML += '<option value="' + k + '">' + v.icon + ' ' + v.label + '</option>';
        }
    }

    // ---- PROGRESS ----
    function renderProgress() {
        var courses = getCourses();
        var total = courses.length;
        var completed = courses.filter(function (c) { return getStatus(c.id) === "completed"; }).length;
        var pct = total ? Math.round((completed / total) * 100) : 0;
        var totalH = courses.reduce(function (a, c) { return a + c.hours; }, 0);
        var doneH = courses.filter(function (c) { return getStatus(c.id) === "completed"; }).reduce(function (a, c) { return a + c.hours; }, 0);
        var circ = 2 * Math.PI * 52;
        var circle = document.getElementById("progress-circle");
        circle.style.strokeDasharray = circ;
        circle.style.strokeDashoffset = circ - (pct / 100) * circ;
        document.getElementById("progress-text").textContent = pct + "%";
        document.getElementById("stat-completed").textContent = completed + "/" + total;
        document.getElementById("stat-hours").textContent = doneH + "/" + totalH;
        var badge = document.getElementById(state.currentCurriculum + "-badge");
        if (badge) badge.textContent = completed + "/" + total;
    }

    // ---- TIMELINE VIEW ----
    function renderTimeline() {
        var container = document.getElementById("timeline-container");
        var curriculum = getCurriculum();
        var courses = getFilteredCourses();
        var html = "";
        curriculum.semesters.forEach(function (sem) {
            var sc = courses.filter(function (c) { return c.semester === sem.id; });
            if (!sc.length) return;
            var hrs = sc.reduce(function (a, c) { return a + c.hours; }, 0);
            html += '<div class="semester-group"><div class="semester-header">' +
                '<span class="semester-label">' + sem.label + '</span>' +
                '<span class="semester-line"></span>' +
                '<span class="semester-hours">' + sem.subtitle + ' · ' + hrs + 'h</span></div><div class="course-grid">';
            sc.forEach(function (c) {
                var st = getStatus(c.id);
                var chk = st === "completed" ? "checked" : "";
                var cls = st !== "not-started" ? st : "";
                var phtml = "";
                if (c.prerequisites.length) {
                    phtml = '<div class="card-prereqs">Requires: ' + c.prerequisites.map(function (pid) {
                        var p = findCourse(pid);
                        var met = getStatus(pid) === "completed";
                        return '<span class="' + (met ? '' : 'prereq-missing') + '" data-course="' + pid + '">' + (p ? p.name : pid) + '</span>';
                    }).join(", ") + '</div>';
                }
                var cat = CATEGORIES[c.category] || {};
                html += '<div class="course-card ' + cls + '" data-id="' + c.id + '" data-category="' + c.category + '">' +
                    '<div class="card-top"><input type="checkbox" class="card-checkbox" data-id="' + c.id + '" ' + chk + ' title="Mark complete">' +
                    '<div class="card-title">' + c.name + '</div></div>' +
                    '<div class="card-meta"><span class="meta-tag">' + (cat.icon || '') + ' ' + (cat.label || c.category) + '</span>' +
                    '<span class="meta-tag hours">⏱ ' + c.hours + 'h</span>' +
                    '<span class="meta-tag ai-proof ' + aiProofClass(c.aiProof) + '">AI-Proof: ' + aiProofLabel(c.aiProof) + '</span></div>' +
                    '<div class="card-desc">' + c.description + '</div>' + phtml + '</div>';
            });
            html += '</div></div>';
        });
        container.innerHTML = html;
        container.querySelectorAll(".course-card").forEach(function (card) {
            card.addEventListener("click", function (e) {
                if (e.target.classList.contains("card-checkbox") || e.target.tagName === "INPUT") return;
                var ps = e.target.closest("[data-course]");
                if (ps) { openDetail(ps.dataset.course); return; }
                openDetail(card.dataset.id);
            });
        });
        container.querySelectorAll(".card-checkbox").forEach(function (cb) {
            cb.addEventListener("change", function (e) {
                e.stopPropagation();
                setStatus(cb.dataset.id, cb.checked ? "completed" : "not-started");
            });
        });
    }

    // ---- TABLE VIEW ----
    function renderTable() {
        var tbody = document.getElementById("table-body");
        var courses = getFilteredCourses().slice();
        var sk = state.sort.key, dir = state.sort.dir === "asc" ? 1 : -1;
        courses.sort(function (a, b) {
            var va = sk === "aiproof" ? a.aiProof : a[sk];
            var vb = sk === "aiproof" ? b.aiProof : b[sk];
            if (typeof va === "string") return va.localeCompare(vb) * dir;
            return (va - vb) * dir;
        });
        var html = "";
        courses.forEach(function (c) {
            var chk = getStatus(c.id) === "completed" ? "checked" : "";
            var pq = c.prerequisites.map(function (pid) { var p = findCourse(pid); return p ? p.name : pid; }).join(", ") || "None";
            var cat = CATEGORIES[c.category] || {};
            html += '<tr data-id="' + c.id + '"><td><input type="checkbox" class="table-checkbox" data-id="' + c.id + '" ' + chk + '></td>' +
                '<td>' + c.id + '</td><td><strong>' + c.name + '</strong><br><small style="color:var(--text-muted)">' + c.source + '</small></td>' +
                '<td>' + c.semester + '</td><td><span class="cat-badge ' + c.category + '">' + (cat.label || c.category) + '</span></td>' +
                '<td>' + c.hours + 'h</td><td><span class="meta-tag ai-proof ' + aiProofClass(c.aiProof) + '">' + aiProofLabel(c.aiProof) + '</span></td>' +
                '<td><small>' + pq + '</small></td></tr>';
        });
        tbody.innerHTML = html;
        tbody.querySelectorAll("tr").forEach(function (row) {
            row.addEventListener("click", function (e) {
                if (e.target.tagName === "INPUT") return;
                openDetail(row.dataset.id);
            });
        });
        tbody.querySelectorAll(".table-checkbox").forEach(function (cb) {
            cb.addEventListener("change", function (e) {
                e.stopPropagation();
                setStatus(cb.dataset.id, cb.checked ? "completed" : "not-started");
            });
        });
    }

    // ============================================
    // GRAPH VIEW
    // ============================================

    function buildGraphLayout() {
        var g = state.graph;
        var courses = getCourses();
        var semesters = getCurriculum().semesters;
        var canvas = document.getElementById("graph-canvas");
        var w = canvas.clientWidth;
        var h = canvas.clientHeight;

        var semMap = {};
        semesters.forEach(function (s, i) { semMap[s.id] = i; });
        var semCounts = {};
        courses.forEach(function (c) { semCounts[c.semester] = (semCounts[c.semester] || 0) + 1; });

        var xPad = 140, yPad = 70;
        var xSpace = semesters.length > 1 ? (w - xPad * 2) / (semesters.length - 1) : 0;
        var semIndex = {};

        g.nodes = courses.map(function (c) {
            var si = semMap[c.semester] || 0;
            semIndex[c.semester] = (semIndex[c.semester] || 0) + 1;
            var count = semCounts[c.semester] || 1;
            var col = semIndex[c.semester];
            var ySpace = (h - yPad * 2) / (count + 1);
            return { id: c.id, x: xPad + si * xSpace, y: yPad + col * ySpace, r: 24, course: c };
        });

        g.nodeMap = {};
        g.nodes.forEach(function (n) { g.nodeMap[n.id] = n; });
    }

    // Recursively collect the full prerequisite and future-use chains
    function getConnectedIds(nodeId) {
        var course = findCourse(nodeId);
        if (!course) return { prereqs: {}, futures: {}, edges: [] };

        var prereqs = {};
        var futures = {};
        var edges = [];

        // Walk prerequisites recursively (all ancestors)
        function walkUp(id) {
            var c = findCourse(id);
            if (!c) return;
            c.prerequisites.forEach(function (pid) {
                if (!prereqs[pid]) {
                    prereqs[pid] = true;
                    edges.push({ from: pid, to: id, type: "prereq" });
                    walkUp(pid);
                } else {
                    // Edge might still be missing even if node was visited via another path
                    if (!edges.some(function (e) { return e.from === pid && e.to === id; })) {
                        edges.push({ from: pid, to: id, type: "prereq" });
                    }
                }
            });
        }

        // Walk future-use recursively (all descendants)
        function walkDown(id) {
            var c = findCourse(id);
            if (!c) return;
            c.futureUse.forEach(function (fid) {
                if (!futures[fid]) {
                    futures[fid] = true;
                    edges.push({ from: id, to: fid, type: "future" });
                    walkDown(fid);
                } else {
                    if (!edges.some(function (e) { return e.from === id && e.to === fid; })) {
                        edges.push({ from: id, to: fid, type: "future" });
                    }
                }
            });
        }

        // Also add direct edges for the selected node itself
        course.prerequisites.forEach(function (pid) {
            prereqs[pid] = true;
            if (!edges.some(function (e) { return e.from === pid && e.to === nodeId; })) {
                edges.push({ from: pid, to: nodeId, type: "prereq" });
            }
        });
        course.futureUse.forEach(function (fid) {
            futures[fid] = true;
            if (!edges.some(function (e) { return e.from === nodeId && e.to === fid; })) {
                edges.push({ from: nodeId, to: fid, type: "future" });
            }
        });

        // Now recurse
        walkUp(nodeId);
        walkDown(nodeId);

        return { prereqs: prereqs, futures: futures, edges: edges };
    }

    function screenToWorld(sx, sy) {
        var g = state.graph;
        return { x: (sx - g.offsetX) / g.scale, y: (sy - g.offsetY) / g.scale };
    }

    function hitTestNode(wx, wy) {
        var nodes = state.graph.nodes;
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            if (Math.hypot(wx - n.x, wy - n.y) <= n.r + 6) return n;
        }
        return null;
    }

    function drawArrow(ctx, x1, y1, x2, y2, r, color, width, dashed) {
        var angle = Math.atan2(y2 - y1, x2 - x1);
        var sx = x1 + Math.cos(angle) * (r + 5);
        var sy = y1 + Math.sin(angle) * (r + 5);
        var ex = x2 - Math.cos(angle) * (r + 5);
        var ey = y2 - Math.sin(angle) * (r + 5);

        ctx.save();
        ctx.beginPath();
        if (dashed) ctx.setLineDash([6, 4]);
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
        ctx.setLineDash([]);

        var aLen = Math.max(8, 5 * width);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - aLen * Math.cos(angle - 0.35), ey - aLen * Math.sin(angle - 0.35));
        ctx.lineTo(ex - aLen * Math.cos(angle + 0.35), ey - aLen * Math.sin(angle + 0.35));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }

    function drawGraph() {
        var canvas = document.getElementById("graph-canvas");
        var ctx = canvas.getContext("2d");
        var g = state.graph;
        var nodes = g.nodes;
        var nodeMap = g.nodeMap;
        var selected = g.selectedId;
        var hovered = g.hoveredId;
        var isHL = !!selected;

        // Compute highlight sets
        var hlPrereqs = {};
        var hlFutures = {};
        var hlEdges = [];
        if (isHL) {
            var conn = getConnectedIds(selected);
            hlPrereqs = conn.prereqs;
            hlFutures = conn.futures;
            hlEdges = conn.edges;
        }

        // Build a lookup for highlighted edges for fast checking
        var hlEdgeSet = {};
        hlEdges.forEach(function (e) { hlEdgeSet[e.from + "|" + e.to] = e.type; });

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(g.offsetX, g.offsetY);
        ctx.scale(g.scale, g.scale);

        // ========== PASS 1: Draw ALL edges (dimmed if highlight mode) ==========
        nodes.forEach(function (n) {
            // Prerequisite edges (solid) — drawn as: prerequisite → this node
            n.course.prerequisites.forEach(function (pid) {
                var pn = nodeMap[pid];
                if (!pn) return;
                var key = pid + "|" + n.id;
                // Skip if this edge will be drawn in the highlight pass
                if (isHL && hlEdgeSet[key]) return;
                var alpha = isHL ? 0.06 : 0.25;
                drawArrow(ctx, pn.x, pn.y, n.x, n.y, n.r,
                    "rgba(88,166,255," + alpha + ")", isHL ? 1 : 1.5, false);
            });
            // Future-use edges (dashed) — drawn as: this node → future
            n.course.futureUse.forEach(function (fid) {
                var fn = nodeMap[fid];
                if (!fn) return;
                var key = n.id + "|" + fid;
                if (isHL && hlEdgeSet[key]) return;
                var alpha = isHL ? 0.04 : 0.15;
                drawArrow(ctx, n.x, n.y, fn.x, fn.y, fn.r,
                    "rgba(63,185,80," + alpha + ")", isHL ? 0.8 : 1, true);
            });
        });

        // ========== PASS 2: Draw HIGHLIGHTED edges on top ==========
        if (isHL) {
            hlEdges.forEach(function (edge) {
                var fromN = nodeMap[edge.from];
                var toN = nodeMap[edge.to];
                if (!fromN || !toN) return;
                if (edge.type === "prereq") {
                    drawArrow(ctx, fromN.x, fromN.y, toN.x, toN.y, toN.r, "#f0883e", 3, false);
                } else {
                    drawArrow(ctx, fromN.x, fromN.y, toN.x, toN.y, toN.r, "#3fb950", 2.5, true);
                }
            });
        }

        // ========== PASS 3: Draw NODES ==========
        nodes.forEach(function (n) {
            var status = getStatus(n.id);
            var color = (CATEGORIES[n.course.category] || {}).color || "#8b949e";
            var isSel = n.id === selected;
            var isHov = n.id === hovered;
            var isPre = !!hlPrereqs[n.id];
            var isFut = !!hlFutures[n.id];
            var isConn = isSel || isPre || isFut;
            var dimmed = isHL && !isConn;

            // Glow behind connected nodes
            if (isSel) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r + 12, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(240,136,62,0.2)";
                ctx.fill();
            } else if (isPre && isHL) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r + 10, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(88,166,255,0.12)";
                ctx.fill();
            } else if (isFut && isHL) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r + 10, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(63,185,80,0.12)";
                ctx.fill();
            }

            // Save alpha for dimmed nodes
            if (dimmed) ctx.globalAlpha = 0.2;

            // Node body
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            if (status === "completed") ctx.fillStyle = "rgba(63,185,80,0.25)";
            else if (status === "in-progress") ctx.fillStyle = "rgba(210,153,34,0.25)";
            else ctx.fillStyle = "rgba(28,33,40,0.9)";
            ctx.fill();

            // Border
            var bColor = color, bWidth = 2;
            if (isSel) { bColor = "#f0883e"; bWidth = 3.5; }
            else if (isPre && isHL) { bColor = "#58a6ff"; bWidth = 3; }
            else if (isFut && isHL) { bColor = "#3fb950"; bWidth = 3; }
            else if (status === "completed") bColor = "#3fb950";
            else if (status === "in-progress") bColor = "#d29922";

            ctx.strokeStyle = bColor;
            ctx.lineWidth = bWidth;
            ctx.stroke();

            // Hover ring
            if (isHov && !isSel) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r + 5, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(230,237,243,0.5)";
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Category dot
            ctx.beginPath();
            ctx.arc(n.x, n.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            // Label
            ctx.font = "600 10px -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#e6edf3";
            var label = n.course.name.length > 22 ? n.course.name.slice(0, 20) + "…" : n.course.name;
            ctx.fillText(label, n.x, n.y + n.r + 8);

            ctx.globalAlpha = 1;
        });

        ctx.restore();
    }

    function updateZoomLabel() {
        var el = document.getElementById("graph-zoom-label");
        if (el) el.textContent = Math.round(state.graph.scale * 100) + "%";
    }

    function zoomGraph(delta, cx, cy) {
        var g = state.graph;
        var old = g.scale;
        var factor = delta > 0 ? 1.15 : 1 / 1.15;
        g.scale = Math.max(0.1, Math.min(6, g.scale * factor));
        var ratio = g.scale / old;
        if (cx !== undefined) {
            g.offsetX = cx - (cx - g.offsetX) * ratio;
            g.offsetY = cy - (cy - g.offsetY) * ratio;
        }
        updateZoomLabel();
        drawGraph();
    }

    function resetGraphView() {
        var g = state.graph;
        g.scale = 1;
        g.offsetX = 0;
        g.offsetY = 0;
        g.selectedId = null;
        g.hoveredId = null;
        updateZoomLabel();
        drawGraph();
    }

    function initGraph() {
        var canvas = document.getElementById("graph-canvas");
        var parent = canvas.parentElement;
        var dpr = window.devicePixelRatio || 1;

        // Set canvas size to fill parent in CSS pixels, scale for DPI
        canvas.style.width = parent.clientWidth + "px";
        canvas.style.height = parent.clientHeight + "px";
        canvas.width = parent.clientWidth * dpr;
        canvas.height = parent.clientHeight * dpr;

        var ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        var g = state.graph;
        g.scale = 1;
        g.offsetX = 0;
        g.offsetY = 0;
        g.selectedId = null;
        g.hoveredId = null;

        buildGraphLayout();
        updateZoomLabel();
        drawGraph();
    }

    function bindGraphEvents() {
        var canvas = document.getElementById("graph-canvas");
        if (canvas._gBound) return;
        canvas._gBound = true;

        var g = state.graph;
        var tooltip = document.getElementById("graph-tooltip");

        // ---- WHEEL ----
        canvas.addEventListener("wheel", function (e) {
            e.preventDefault();
            var rect = canvas.getBoundingClientRect();
            zoomGraph(e.deltaY < 0 ? 1 : -1, e.clientX - rect.left, e.clientY - rect.top);
        }, { passive: false });

        // ---- MOUSEDOWN ----
        canvas.addEventListener("mousedown", function (e) {
            var rect = canvas.getBoundingClientRect();
            var mx = e.clientX - rect.left, my = e.clientY - rect.top;
            var w = screenToWorld(mx, my);
            var hit = hitTestNode(w.x, w.y);

            if (hit) {
                // Toggle selection
                g.selectedId = (g.selectedId === hit.id) ? null : hit.id;
                drawGraph();
                return;
            }
            // Start pan
            g.dragging = true;
            g.dragStartX = e.clientX;
            g.dragStartY = e.clientY;
            g.dragOffsetX = g.offsetX;
            g.dragOffsetY = g.offsetY;
            canvas.style.cursor = "grabbing";
        });

        // ---- MOUSEMOVE ----
        canvas.addEventListener("mousemove", function (e) {
            var rect = canvas.getBoundingClientRect();
            var mx = e.clientX - rect.left, my = e.clientY - rect.top;

            if (g.dragging) {
                g.offsetX = g.dragOffsetX + (e.clientX - g.dragStartX);
                g.offsetY = g.dragOffsetY + (e.clientY - g.dragStartY);
                drawGraph();
                return;
            }

            var w = screenToWorld(mx, my);
            var hit = hitTestNode(w.x, w.y);
            var prev = g.hoveredId;
            g.hoveredId = hit ? hit.id : null;

            if (hit) {
                canvas.style.cursor = "pointer";
                tooltip.classList.remove("hidden");
                tooltip.style.left = Math.min(mx + 20, canvas.clientWidth - 320) + "px";
                tooltip.style.top = Math.min(my - 10, canvas.clientHeight - 120) + "px";
                var c = hit.course;
                var cat = CATEGORIES[c.category] || {};
                var extra = "";
                if (g.selectedId && g.selectedId !== hit.id) {
                    var cn = getConnectedIds(g.selectedId);
                    if (cn.prereqs[hit.id]) extra = '<div style="color:#f0883e;font-size:11px;margin-top:4px">⬅ Prerequisite of selected node</div>';
                    else if (cn.futures[hit.id]) extra = '<div style="color:#3fb950;font-size:11px;margin-top:4px">➡ Unlocked by selected node</div>';
                }
                tooltip.innerHTML =
                    '<div class="tooltip-title">' + c.name + '</div>' +
                    '<div class="tooltip-meta">' + (cat.label || c.category) + ' · ' + c.hours + 'h · AI-Proof: ' + c.aiProof + '/10</div>' +
                    '<div class="tooltip-desc">' + c.description + '</div>' + extra;
            } else {
                canvas.style.cursor = g.dragging ? "grabbing" : "grab";
                tooltip.classList.add("hidden");
            }
            if (prev !== g.hoveredId) drawGraph();
        });

        // ---- MOUSEUP ----
        canvas.addEventListener("mouseup", function () {
            g.dragging = false;
            canvas.style.cursor = "grab";
        });

        canvas.addEventListener("mouseleave", function () {
            g.dragging = false;
            g.hoveredId = null;
            tooltip.classList.add("hidden");
            canvas.style.cursor = "grab";
            drawGraph();
        });

        // ---- DBLCLICK: open detail ----
        canvas.addEventListener("dblclick", function (e) {
            var rect = canvas.getBoundingClientRect();
            var w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
            var hit = hitTestNode(w.x, w.y);
            if (hit) openDetail(hit.id);
        });

        // ---- TOUCH ----
        var lastDist = 0;
        canvas.addEventListener("touchstart", function (e) {
            if (e.touches.length === 1) {
                var t = e.touches[0], rect = canvas.getBoundingClientRect();
                var w = screenToWorld(t.clientX - rect.left, t.clientY - rect.top);
                var hit = hitTestNode(w.x, w.y);
                if (hit) { g.selectedId = g.selectedId === hit.id ? null : hit.id; drawGraph(); return; }
                g.dragging = true;
                g.dragStartX = t.clientX; g.dragStartY = t.clientY;
                g.dragOffsetX = g.offsetX; g.dragOffsetY = g.offsetY;
            } else if (e.touches.length === 2) {
                g.dragging = false;
                lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            }
        }, { passive: true });

        canvas.addEventListener("touchmove", function (e) {
            e.preventDefault();
            if (e.touches.length === 1 && g.dragging) {
                var t = e.touches[0];
                g.offsetX = g.dragOffsetX + (t.clientX - g.dragStartX);
                g.offsetY = g.dragOffsetY + (t.clientY - g.dragStartY);
                drawGraph();
            } else if (e.touches.length === 2) {
                var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                var rect = canvas.getBoundingClientRect();
                var cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                var cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
                if (lastDist > 0) zoomGraph(d > lastDist ? 1 : -1, cx, cy);
                lastDist = d;
            }
        }, { passive: false });

        canvas.addEventListener("touchend", function () { g.dragging = false; lastDist = 0; });

        // ---- CONTROL BUTTONS ----
        document.getElementById("graph-zoom-in").addEventListener("click", function () {
            zoomGraph(1, canvas.clientWidth / 2, canvas.clientHeight / 2);
        });
        document.getElementById("graph-zoom-out").addEventListener("click", function () {
            zoomGraph(-1, canvas.clientWidth / 2, canvas.clientHeight / 2);
        });
        document.getElementById("graph-zoom-reset").addEventListener("click", resetGraphView);
        document.getElementById("graph-deselect").addEventListener("click", function () {
            g.selectedId = null; drawGraph();
        });
    }

    // ---- DETAIL PANEL ----
    function openDetail(courseId) {
        var c = findCourse(courseId);
        if (!c) return;
        state.selectedCourse = courseId;
        var panel = document.getElementById("detail-panel");
        var content = document.getElementById("detail-content");
        var status = getStatus(courseId);
        var cat = CATEGORIES[c.category] || {};

        var phtml = c.prerequisites.length ? c.prerequisites.map(function (pid) {
            var p = findCourse(pid);
            var met = getStatus(pid) === "completed";
            return '<div class="prereq-item" data-course="' + pid + '"><span>' + (met ? "✅" : "⬜") + '</span><span>' + (p ? p.name : pid) + '</span><span class="prereq-arrow" style="margin-left:auto">' + (met ? "Done" : "Not done") + '</span></div>';
        }).join("") : '<p style="color:var(--text-muted)">None — you can start this course immediately.</p>';

        var fhtml = c.futureUse.length ? c.futureUse.map(function (fid) {
            var f = findCourse(fid);
            return '<div class="future-item" data-course="' + fid + '"><span>→</span><span>' + (f ? f.name : fid) + '</span></div>';
        }).join("") : '<p style="color:var(--text-muted)">Capstone / terminal course.</p>';

        var sBtns = ["not-started", "in-progress", "completed"].map(function (s) {
            var labels = { "not-started": "⬜ Not Started", "in-progress": "🔄 In Progress", "completed": "✅ Completed" };
            var active = status === s ? "active-status-" + s : "";
            return '<button class="status-btn ' + active + '" data-status="' + s + '">' + labels[s] + '</button>';
        }).join("");

        content.innerHTML =
            '<div class="detail-header">' +
            '<div class="detail-course-number">' + c.id.toUpperCase() + ' · ' + c.source + '</div>' +
            '<div class="detail-title">' + c.name + '</div>' +
            '<div class="detail-tags">' +
            '<span class="meta-tag">' + (cat.icon || '') + ' ' + (cat.label || c.category) + '</span>' +
            '<span class="meta-tag hours">⏱ ' + c.hours + ' hours</span>' +
            '<span class="meta-tag ai-proof ' + aiProofClass(c.aiProof) + '">AI-Proof: ' + aiProofLabel(c.aiProof) + '</span>' +
            '</div></div>' +
            '<div class="detail-section"><h3>Status</h3><div class="detail-status-toggle">' + sBtns + '</div></div>' +
            '<div class="detail-section"><h3>Description</h3><p>' + c.description + '</p></div>' +
            '<div class="detail-section"><h3>Topics Covered</h3><div class="card-meta">' + c.topics.map(function (t) { return '<span class="meta-tag">' + t + '</span>'; }).join("") + '</div></div>' +
            '<div class="detail-section"><h3>Why This Course Is Here</h3><p>' + c.whyIncluded + '</p></div>' +
            '<div class="detail-section"><h3>🤖 AI-Proof Analysis</h3>' +
            '<div class="ai-meter"><div class="ai-meter-bar"><div class="ai-meter-fill" style="width:' + (c.aiProof * 10) + '%;background:' + aiMeterColor(c.aiProof) + '"></div></div>' +
            '<div class="ai-meter-label" style="color:' + aiMeterColor(c.aiProof) + '">' + c.aiProof + '/10</div></div>' +
            '<p style="margin-top:8px">' + c.aiAnalysis + '</p></div>' +
            '<div class="detail-section"><h3>Prerequisites</h3><div class="prereq-chain">' + phtml + '</div></div>' +
            '<div class="detail-section"><h3>Where This Leads (Future Use)</h3><div class="prereq-chain">' + fhtml + '</div></div>' +
            '<div class="detail-section"><h3>📚 Free Resource</h3>' +
            '<a class="detail-link" href="' + c.link + '" target="_blank" rel="noopener noreferrer">' +
            '<span class="detail-link-icon">🔗</span><span>' + c.link + '</span></a></div>';

        panel.classList.remove("hidden");

        content.querySelectorAll(".status-btn").forEach(function (btn) {
            btn.addEventListener("click", function () { setStatus(courseId, btn.dataset.status); openDetail(courseId); });
        });
        content.querySelectorAll("[data-course]").forEach(function (el) {
            el.addEventListener("click", function () { openDetail(el.dataset.course); });
        });
    }

    function closeDetail() {
        document.getElementById("detail-panel").classList.add("hidden");
        state.selectedCourse = null;
    }

    // ---- BREADCRUMB ----
    function renderBreadcrumb() {
        var cur = getCurriculum();
        document.getElementById("breadcrumb").innerHTML = '<span class="crumb active">' + cur.icon + ' ' + cur.name + '</span>';
    }

    // ---- RENDER ALL ----
    function renderAll() {
        renderBreadcrumb();
        renderProgress();
        renderTimeline();
        renderTable();
        if (state.currentView === "graph") {
            requestAnimationFrame(function () { initGraph(); });
        }
    }

    // ---- VIEW SWITCHING ----
    function switchView(view) {
        state.currentView = view;
        document.querySelectorAll(".view").forEach(function (v) { v.classList.remove("active"); });
        document.querySelectorAll(".view-btn").forEach(function (b) { b.classList.remove("active"); });
        document.getElementById(view + "-view").classList.add("active");
        document.querySelector('.view-btn[data-view="' + view + '"]').classList.add("active");
        if (view === "graph") {
            requestAnimationFrame(function () { initGraph(); bindGraphEvents(); });
        }
    }

    // ---- EVENT BINDINGS ----
    function bindEvents() {
        document.querySelectorAll(".nav-btn").forEach(function (btn) {
            btn.addEventListener("click", function () {
                state.currentCurriculum = btn.dataset.curriculum;
                document.querySelectorAll(".nav-btn").forEach(function (b) { b.classList.remove("active"); });
                btn.classList.add("active");
                closeDetail();
                var c = document.getElementById("graph-canvas");
                c._gBound = false;
                renderAll();
            });
        });

        document.querySelectorAll(".view-btn").forEach(function (btn) {
            btn.addEventListener("click", function () { switchView(btn.dataset.view); });
        });

        document.getElementById("filter-category").addEventListener("change", function (e) { state.filters.category = e.target.value; renderAll(); });
        document.getElementById("filter-ai").addEventListener("change", function (e) { state.filters.ai = e.target.value; renderAll(); });
        document.getElementById("filter-status").addEventListener("change", function (e) { state.filters.status = e.target.value; renderAll(); });
        document.getElementById("search-input").addEventListener("input", function (e) { state.search = e.target.value; renderAll(); });

        document.querySelectorAll("#course-table th.sortable").forEach(function (th) {
            th.addEventListener("click", function () {
                var key = th.dataset.sort;
                if (state.sort.key === key) state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
                else { state.sort.key = key; state.sort.dir = "asc"; }
                document.querySelectorAll("#course-table th").forEach(function (h) { h.classList.remove("sort-asc", "sort-desc"); });
                th.classList.add("sort-" + state.sort.dir);
                renderTable();
            });
        });

        document.getElementById("close-detail").addEventListener("click", closeDetail);

        document.getElementById("reset-progress").addEventListener("click", function () {
            if (confirm("Reset all progress for this curriculum?")) {
                getCourses().forEach(function (c) { delete state.progress[c.id]; });
                saveProgress();
                renderAll();
            }
        });

        document.getElementById("export-progress").addEventListener("click", function () {
            var data = { exported: new Date().toISOString(), curriculum: state.currentCurriculum, progress: {} };
            getCourses().forEach(function (c) { data.progress[c.id] = { name: c.name, status: getStatus(c.id), hours: c.hours }; });
            var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = "curriculum-progress-" + state.currentCurriculum + "-" + new Date().toISOString().slice(0, 10) + ".json";
            a.click();
            URL.revokeObjectURL(url);
        });

        var resizeTimer;
        window.addEventListener("resize", function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                if (state.currentView === "graph") {
                    document.getElementById("graph-canvas")._gBound = false;
                    initGraph();
                    bindGraphEvents();
                }
            }, 150);
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                if (!document.getElementById("detail-panel").classList.contains("hidden")) closeDetail();
                else if (state.graph.selectedId && state.currentView === "graph") {
                    state.graph.selectedId = null;
                    drawGraph();
                }
            }
        });
    }

    // ---- INIT ----
    function init() {
        populateCategoryFilter();
        bindEvents();
        for (var k in CURRICULA) {
            var courses = CURRICULA[k].courses;
            var done = courses.filter(function (c) { return getStatus(c.id) === "completed"; }).length;
            var badge = document.getElementById(k + "-badge");
            if (badge) badge.textContent = done + "/" + courses.length;
        }
        renderAll();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();