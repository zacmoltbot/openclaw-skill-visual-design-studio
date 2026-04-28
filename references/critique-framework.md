# Critique Framework — Design Review Process

## Purpose
Structured approach to reviewing a design (user-provided or generated) and delivering actionable feedback.

---

## Review Modes

### Mode A: Heuristic Review
Systematic check against ui-ux-heuristics.md and web-design-heuristics.md.
Used when: user says "review this design" without specific questions.

### Mode B: Focused Review
User specifies the dimension to focus on (e.g., "how's the typography?").
Used when: user has a specific concern.

### Mode C: Comparative Review
Compare two designs (A/B) side by side.
Used when: user is between options.

---

## Critique Output Format

```
## Design Critique Report

**Reviewed:** [URL / uploaded image / generated artifact]
**Date:** {date}
**Mode:** {A|B|C}

### Summary
[1-2 sentence overall assessment]

### Issues Found

| # | Severity | Heuristic | Location | Description | Recommendation |
|---|----------|-----------|----------|-------------|----------------|
| 1 | HIGH | Visibility of status | Nav | No indication of current page | Add active state to nav |
| 2 | MED | Consistency | Form | Error style differs from button style | Align error styles |

### Positives
- [What works well about the design]

### Recommendations (Priority Order)
1. [Most critical fix]
2. [Important improvement]
3. [Nice to have]
```

---

## Severity Ratings

| Rating | Definition | Action |
|--------|------------|--------|
| HIGH | Usability blocking issue | Must fix before launch |
| MED | Suboptimal but workaround exists | Fix before launch |
| LOW | Minor polish / aesthetic | Fix in next iteration |

---

## Heuristic Mapping

Each issue must map to one of Nielsen's 10 heuristics:
1. Visibility of system status
2. Match between system and real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency
8. Aesthetic and minimalist design
9. Help users recover from errors
10. Help and documentation

---

## Automated Checks (V1, partial)

| Check | Method | Fully Automated? |
|-------|--------|-----------------|
| Color contrast | WCAG contrast formula | ✅ |
| Alt text presence | HTML attribute scan | ✅ |
| Font scale | CSS analysis | ⚠️ Partial |
| Layout balance | Visual scan | ❌ Manual |
| Content quality | — | ❌ Manual |

---

## V1 Limitations

- No AI-powered design analysis in V1
- Critique is structured but execution is partially manual
- Automated checks limited to static HTML analysis + contrast math
- Full design intelligence → Phase 2 or later
