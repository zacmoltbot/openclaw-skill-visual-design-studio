# Trigger Matrix

## Purpose
Define exact conditions for when the visual-design-studio skill activates, delegates, or declines.

---

## Primary Trigger Rules

| User says (or means) | Action | Skill Activates |
|---------------------|--------|-----------------|
| "幫我做一個登入頁" | Activate → HTML prototype | ✅ YES |
| "做一個 landing page" | Activate → HTML prototype | ✅ YES |
| "幫我設計 wireframe" | Activate → UX/UI design | ✅ YES |
| "做一份簡報" / "做一個 deck" | Activate → Slide deck | ✅ YES |
| "看看這個設計有什麼問題" | Activate → Design critique | ✅ YES |
| "幫我驗證這個網頁" | Activate → Playwright verification | ✅ YES |
| "export PDF" / "截圖" | Activate → Export pipeline | ✅ YES |
| "做出來的網頁可以跑嗎" | Activate → Playwright verification | ✅ YES |
| "我要做一個動畫影片" | Decline | ❌ NO — not V1 |
| "幫我寫完整的電商網站" | Decline → coding agent | ❌ NO — full-stack |
| "幫我分析這個 competitor 網站" | Activate → Design critique | ✅ YES |
| "幫我設計一個 app" (native) | Decline | ❌ NO — not web output |
| "幫我看看這個設計" + image | Activate → Design critique | ✅ YES |
| "用 HTML 做一個 prototype" | Activate → HTML prototype | ✅ YES |

---

## Intent Classification Flowchart

```
User input
  │
  ├─ Contains "設計" / "design" / "UI" / "UX"?
  │     ├─ YES → UX/UI Design track
  │     └─ NO
  │
  ├─ Contains "網頁" / "web" / "landing page" / "HTML"?
  │     ├─ YES → HTML Prototype track
  │     └─ NO
  │
  ├─ Contains "簡報" / "slide" / "deck" / "presentation"?
  │     ├─ YES → Slide Deck track
  │     └─ NO
  │
  ├─ Contains "審查" / "critique" / "review" / "看看" + design?
  │     ├─ YES → Design Critique track
  │     └─ NO
  │
  ├─ Contains "驗證" / "verify" / "test" / "跑看看" / "截圖"?
  │     ├─ YES → Playwright Verification track
  │     └─ NO
  │
  └─ Default: Ask clarifying question
```

---

## Delegation Rules

| Situation | Delegate To |
|-----------|-------------|
| User wants database-backed app | `coding_agent` |
| User wants SEO/performance optimization | `coding_agent` |
| User wants copywriting only | writing skill / direct |
| User wants video editing | external tool |
| User wants logo / vector illustration | external tool |
| Request is ambiguous design + code | split: design here, code → coding_agent |

---

## Decline (Out of Scope) Rules

- Native mobile app UI (SwiftUI / Jetpack Compose) — decline
- Server-side rendered full-stack app — decline
- Video/animation production (MP4/GIF) — decline in V1
- Editable PPTX export — decline in V1
- Real-time collaborative design editing — decline
- Requests requiring copyrighted assets we don't have license for — decline

---

## Ambiguity Handling

If the user request is ambiguous:
1. Ask one clarifying question targeting the most ambiguous dimension
2. If still unclear, default to HTML prototype (most common use case)
3. Never guess brand identity — always ask or request user provide
